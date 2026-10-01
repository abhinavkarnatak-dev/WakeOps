import { createHash } from 'node:crypto';

import amqp, { type Channel, type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import { database } from '@wakeops/database';
import {
  createResendEmailProvider,
  createSlackProvider,
  decryptSecret,
  incidentNotificationSchema,
  type IncidentNotification,
} from '@wakeops/notifications';
import type pino from 'pino';

import { workerConfig } from './config.js';

const exchange = 'wakeops.notifications';
const emailQueue = 'wakeops.notifications.email';
const slackQueue = 'wakeops.notifications.slack';

async function configure(channel: Channel) {
  await channel.assertExchange(exchange, 'direct', { durable: true });
  await channel.assertQueue(emailQueue, { durable: true });
  await channel.assertQueue(slackQueue, { durable: true });
  await channel.bindQueue(emailQueue, exchange, 'email');
  await channel.bindQueue(slackQueue, exchange, 'slack');
}

async function publisherChannel() {
  const connection = await amqp.connect(workerConfig.AMQP_URL);
  const channel = await connection.createConfirmChannel();
  await configure(channel);
  return channel;
}

let sharedPublisher: Promise<ConfirmChannel> | null = null;

export async function publishNotificationEvent(event: IncidentNotification) {
  try {
    sharedPublisher ??= publisherChannel();
    const channel = await sharedPublisher;
    const content = Buffer.from(JSON.stringify(event));
    const options = { persistent: true, contentType: 'application/json', messageId: event.eventId };
    channel.publish(exchange, 'email', content, options);
    channel.publish(exchange, 'slack', content, options);
    await channel.waitForConfirms();
  } catch (error) {
    sharedPublisher = null;
    throw error;
  }
}

async function assignedPrimaryEmail(event: IncidentNotification) {
  const mapping = await database.resourceMapping.findFirst({
    where: {
      organizationId: event.organizationId,
      application: { name: event.application },
      environment: { name: event.environment },
      resource: { externalIdentifier: event.resource },
    },
    select: { assignment: { select: { primaryEngineer: { select: { email: true } } } } },
  });
  return mapping?.assignment?.primaryEngineer.email ?? null;
}

async function recordFailure(
  incidentId: string,
  channel: 'EMAIL' | 'SLACK',
  destination: string,
  message: string,
) {
  const attempt = await database.notificationAttempt.upsert({
    where: { incidentId_channel: { incidentId, channel } },
    create: {
      incidentId,
      channel,
      destination,
      status: 'FAILED',
      attemptCount: 1,
      failureMessage: message,
    },
    update: { status: 'FAILED', attemptCount: { increment: 1 }, failureMessage: message },
  });
  await database.auditEvent.create({
    data: {
      incidentId,
      type: 'NOTIFICATION_STATUS_UPDATED',
      details: { notificationAttemptId: attempt.id, channel, status: 'FAILED' },
    },
  });
}

async function deliverEmail(event: IncidentNotification) {
  const destination = await assignedPrimaryEmail(event);
  if (!destination) return;
  if (!workerConfig.RESEND_API_KEY || !workerConfig.EMAIL_FROM) {
    await recordFailure(
      event.incidentId,
      'EMAIL',
      destination,
      'Email provider is not configured.',
    );
    return;
  }
  const existing = await database.notificationAttempt.findUnique({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'EMAIL' } },
  });
  if (existing?.status === 'SENT') return;
  await database.notificationAttempt.upsert({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'EMAIL' } },
    create: { incidentId: event.incidentId, channel: 'EMAIL', destination, attemptCount: 1 },
    update: {
      status: 'PENDING',
      destination,
      attemptCount: { increment: 1 },
      failureMessage: null,
    },
  });
  const result = await createResendEmailProvider(
    workerConfig.RESEND_API_KEY,
    workerConfig.EMAIL_FROM,
  ).sendIncident(destination, event);
  const attempt = await database.notificationAttempt.update({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'EMAIL' } },
    data: { status: 'SENT', providerMessageId: result.providerMessageId, sentAt: new Date() },
  });
  await database.auditEvent.create({
    data: {
      incidentId: event.incidentId,
      type: 'NOTIFICATION_STATUS_UPDATED',
      details: { notificationAttemptId: attempt.id, channel: 'EMAIL', status: 'SENT' },
    },
  });
}

async function deliverSlack(event: IncidentNotification) {
  const installation = await database.slackInstallation.findUnique({
    where: { organizationId: event.organizationId },
    include: { destinations: true },
  });
  const destination = installation?.destinations[0];
  if (!installation || !destination) return;
  if (!workerConfig.ENCRYPTION_KEY) {
    await recordFailure(
      event.incidentId,
      'SLACK',
      destination.channelId,
      'Slack credential encryption is not configured.',
    );
    return;
  }
  const existing = await database.notificationAttempt.findUnique({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'SLACK' } },
  });
  if (existing?.status === 'SENT') return;
  await database.notificationAttempt.upsert({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'SLACK' } },
    create: {
      incidentId: event.incidentId,
      channel: 'SLACK',
      destination: destination.channelId,
      attemptCount: 1,
    },
    update: {
      status: 'PENDING',
      destination: destination.channelId,
      attemptCount: { increment: 1 },
      failureMessage: null,
    },
  });
  const token = decryptSecret(installation.accessTokenEncrypted, workerConfig.ENCRYPTION_KEY);
  const result = await createSlackProvider(token).sendIncident(destination.channelId, event);
  const attempt = await database.notificationAttempt.update({
    where: { incidentId_channel: { incidentId: event.incidentId, channel: 'SLACK' } },
    data: { status: 'SENT', providerMessageId: result.providerMessageId, sentAt: new Date() },
  });
  await database.auditEvent.create({
    data: {
      incidentId: event.incidentId,
      type: 'NOTIFICATION_STATUS_UPDATED',
      details: { notificationAttemptId: attempt.id, channel: 'SLACK', status: 'SENT' },
    },
  });
}

async function consume(
  channel: Channel,
  queue: string,
  route: 'email' | 'slack',
  logger: pino.Logger,
) {
  await channel.consume(queue, (message) => {
    if (!message) return;
    void processMessage(channel, message, route, logger);
  });
}

async function processMessage(
  channel: Channel,
  message: ConsumeMessage,
  route: 'email' | 'slack',
  logger: pino.Logger,
) {
  let event: IncidentNotification;
  try {
    event = incidentNotificationSchema.parse(JSON.parse(message.content.toString('utf8')));
  } catch (error) {
    logger.error({ error, route }, 'Notification message was invalid');
    channel.ack(message);
    return;
  }
  try {
    if (route === 'email') await deliverEmail(event);
    else await deliverSlack(event);
    channel.ack(message);
  } catch (error) {
    const retryCount = Number(message.properties.headers?.['x-wakeops-retry'] ?? 0);
    const failureMessage = error instanceof Error ? error.message : 'Notification delivery failed.';
    if (retryCount < 2) {
      channel.publish(exchange, route, message.content, {
        persistent: true,
        contentType: 'application/json',
        messageId: message.properties.messageId,
        headers: { 'x-wakeops-retry': retryCount + 1 },
      });
    } else {
      const destination =
        route === 'email' ? await assignedPrimaryEmail(event) : 'configured-channel';
      await recordFailure(
        event.incidentId,
        route === 'email' ? 'EMAIL' : 'SLACK',
        destination ?? 'unavailable',
        failureMessage,
      );
    }
    logger.warn({ error, route, incidentId: event.incidentId, retryCount }, 'Notification failed');
    channel.ack(message);
  }
}

export async function startNotificationConsumers(logger: pino.Logger) {
  const connection = await amqp.connect(workerConfig.AMQP_URL);
  const channel = await connection.createChannel();
  await configure(channel);
  await channel.prefetch(5);
  await consume(channel, emailQueue, 'email', logger);
  await consume(channel, slackQueue, 'slack', logger);
  logger.info({ exchange, queues: [emailQueue, slackQueue] }, 'Notification consumers started');
  return connection;
}

export function eventId(incidentId: string) {
  return createHash('sha256').update(`incident-start-${incidentId}`).digest('hex');
}
