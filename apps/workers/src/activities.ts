import { database } from '@wakeops/database';
import {
  createTrialVoiceToken,
  createTwilioProvider,
  type TelephonyProvider,
} from '@wakeops/telephony';
import type {
  IncidentAcknowledgement,
  IncidentActivities,
  IncidentCallResult,
  IncidentResolution,
  InitializeIncidentResult,
  InitiateEngineerCallResult,
} from '@wakeops/workflows/contracts';

import { requireTwilioConfig, workerConfig } from './config.js';
import { eventId, publishNotificationEvent } from './notification-queue.js';

function callUrls(baseUrl: string, callAttemptId: string, trialToken?: string) {
  const query = trialToken ? `?token=${trialToken}` : '';
  return {
    voiceUrl: `${baseUrl}/webhooks/twilio/voice/${callAttemptId}${query}`,
    statusCallbackUrl: `${baseUrl}/webhooks/twilio/status/${callAttemptId}`,
  };
}

type EngineerRole = 'PRIMARY' | 'SECONDARY';

async function assignedEngineer(incidentId: string, role: EngineerRole) {
  const incident = await database.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      applicationId: true,
      environmentId: true,
      resourceId: true,
    },
  });
  if (!incident) {
    const error = new Error(`Incident ${incidentId} was not found.`);
    error.name = 'IncidentNotFoundError';
    throw error;
  }
  if (incident.status === 'RESOLVED' || incident.status === 'ACKNOWLEDGED') {
    return { incident, engineer: null };
  }
  const mapping = await database.resourceMapping.findFirst({
    where: {
      organizationId: incident.organizationId,
      applicationId: incident.applicationId,
      environmentId: incident.environmentId,
      resourceId: incident.resourceId,
    },
    select: {
      assignment: {
        select: {
          primaryEngineer: { select: { id: true, name: true, phoneNumber: true } },
          secondaryEngineer: { select: { id: true, name: true, phoneNumber: true } },
        },
      },
    },
  });
  const engineer =
    role === 'PRIMARY'
      ? mapping?.assignment?.primaryEngineer
      : mapping?.assignment?.secondaryEngineer;
  if (!engineer && role === 'PRIMARY') {
    throw new Error('No primary engineer is assigned to this incident.');
  }
  return { incident, engineer };
}

async function initiateEngineerCall(
  incidentId: string,
  attemptNumber: number,
  role: EngineerRole,
): Promise<InitiateEngineerCallResult> {
  const { incident, engineer } = await assignedEngineer(incidentId, role);
  if (!engineer) return { callAttemptId: null, engineerName: null, status: 'SKIPPED' };
  const config = requireTwilioConfig();
  const provider: TelephonyProvider = createTwilioProvider(config.accountSid, config.authToken, {
    trialMode: config.trialMode,
  });

  const attempt = await database.$transaction(async (tx) => {
    const existing = await tx.callAttempt.findUnique({
      where: {
        incidentId_engineerId_attemptNumber: {
          incidentId: incident.id,
          engineerId: engineer.id,
          attemptNumber,
        },
      },
    });
    if (existing) return existing;
    const saved = await tx.callAttempt.create({
      data: {
        incidentId: incident.id,
        engineerId: engineer.id,
        attemptNumber,
      },
    });
    await tx.auditEvent.create({
      data: {
        incidentId: incident.id,
        type: 'CALL_REQUESTED',
        details: { callAttemptId: saved.id, engineerId: engineer.id, role },
      },
    });
    return saved;
  });

  if (attempt.providerCallId) {
    return { callAttemptId: attempt.id, engineerName: engineer.name, status: 'EXISTING' };
  }
  const claimed = await database.callAttempt.updateMany({
    where: { id: attempt.id, submissionStartedAt: null },
    data: { submissionStartedAt: new Date() },
  });
  if (claimed.count === 0) {
    return {
      callAttemptId: attempt.id,
      engineerName: engineer.name,
      status: 'SUBMISSION_UNKNOWN',
    };
  }

  const trialToken = config.trialMode
    ? createTrialVoiceToken(config.authToken, attempt.id)
    : undefined;
  const urls = callUrls(config.webhookBaseUrl, attempt.id, trialToken);
  try {
    const call = await provider.createCall({
      to: engineer.phoneNumber,
      from: config.phoneNumber,
      ringTimeoutSeconds: 30,
      ...urls,
    });
    await database.callAttempt.update({
      where: { id: attempt.id },
      data: {
        providerCallId: call.providerCallId,
        status: call.status,
        initiatedAt: new Date(),
      },
    });
    return { callAttemptId: attempt.id, engineerName: engineer.name, status: 'STARTED' };
  } catch (error) {
    const failureCode = (() => {
      if (!error || typeof error !== 'object') return null;
      const values = [];
      if ('status' in error) values.push(`HTTP_${String(error.status).slice(0, 20)}`);
      if ('code' in error) values.push(`TWILIO_${String(error.code).slice(0, 20)}`);
      return values.join('_').slice(0, 100) || null;
    })();
    await database.callAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        failureCode,
        failureMessage: 'Twilio could not confirm that the call was created.',
        completedAt: new Date(),
      },
    });
    return { callAttemptId: attempt.id, engineerName: engineer.name, status: 'FAILED' };
  }
}

function initiatePrimaryCall(incidentId: string, attemptNumber: number) {
  return initiateEngineerCall(incidentId, attemptNumber, 'PRIMARY');
}

function initiateSecondaryCall(incidentId: string, attemptNumber: number) {
  return initiateEngineerCall(incidentId, attemptNumber, 'SECONDARY');
}

async function getCallResult(callAttemptId: string): Promise<IncidentCallResult | null> {
  const attempt = await database.callAttempt.findUnique({
    where: { id: callAttemptId },
    select: { id: true, status: true, answeredAt: true, completedAt: true },
  });
  if (
    !attempt ||
    !attempt.completedAt ||
    !['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELED'].includes(attempt.status)
  ) {
    return null;
  }
  return {
    callAttemptId: attempt.id,
    status: attempt.status as IncidentCallResult['status'],
    answered: attempt.answeredAt !== null,
    completedAt: attempt.completedAt.toISOString(),
  };
}

async function initializeIncidentWorkflow(incidentId: string): Promise<InitializeIncidentResult> {
  return database.$transaction(async (tx) => {
    const incident = await tx.incident.findUnique({
      where: { id: incidentId },
      select: { status: true, acknowledgedAt: true },
    });
    if (!incident) {
      const error = new Error(`Incident ${incidentId} was not found.`);
      error.name = 'IncidentNotFoundError';
      throw error;
    }

    if (incident.status === 'OPEN') {
      await tx.incident.updateMany({
        where: { id: incidentId, status: 'OPEN' },
        data: { status: 'NOTIFYING' },
      });
    }

    const current = await tx.incident.findUniqueOrThrow({
      where: { id: incidentId },
      select: { status: true, acknowledgedAt: true },
    });
    const status =
      current.status === 'RESOLVED'
        ? 'RESOLVED'
        : current.status === 'ACKNOWLEDGED'
          ? 'ACKNOWLEDGED'
          : 'NOTIFYING';
    return {
      status,
      acknowledgedAt: current.acknowledgedAt?.toISOString() ?? null,
    };
  });
}

async function publishIncidentNotifications(incidentId: string) {
  const incident = await database.incident.findUnique({
    where: { id: incidentId },
    include: { application: true, environment: true, resource: true },
  });
  if (!incident) {
    const error = new Error(`Incident ${incidentId} was not found.`);
    error.name = 'IncidentNotFoundError';
    throw error;
  }
  await publishNotificationEvent({
    eventId: eventId(incident.id),
    incidentId: incident.id,
    organizationId: incident.organizationId,
    alertName: incident.alertName,
    severity: incident.severity,
    application: incident.application.name,
    environment: incident.environment.name,
    resource: incident.resource.externalIdentifier,
    value: incident.value,
    startedAt: incident.startedAt.toISOString(),
    dashboardUrl: `${workerConfig.WEB_URL.replace(/\/$/, '')}/dashboard/incidents/${incident.id}`,
  });
  const exists = await database.auditEvent.findFirst({
    where: { incidentId: incident.id, type: 'NOTIFICATION_REQUESTED' },
  });
  if (!exists) {
    await database.auditEvent.create({
      data: {
        incidentId: incident.id,
        type: 'NOTIFICATION_REQUESTED',
        details: { eventId: eventId(incident.id), channels: ['EMAIL', 'SLACK'] },
      },
    });
  }
}

async function acknowledgeIncident(incidentId: string, acknowledgement: IncidentAcknowledgement) {
  await database.incident.updateMany({
    where: { id: incidentId, status: { in: ['OPEN', 'NOTIFYING'] } },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(acknowledgement.acknowledgedAt),
    },
  });
}

async function resolveIncident(incidentId: string, resolution: IncidentResolution) {
  await database.$transaction(async (tx) => {
    await tx.incident.updateMany({
      where: { id: incidentId, status: { not: 'RESOLVED' } },
      data: {
        status: 'RESOLVED',
        activeFingerprint: null,
        resolvedAt: new Date(resolution.resolvedAt),
      },
    });
  });
}

export const incidentActivities: IncidentActivities = {
  initializeIncidentWorkflow,
  publishIncidentNotifications,
  initiatePrimaryCall,
  initiateSecondaryCall,
  getCallResult,
  acknowledgeIncident,
  resolveIncident,
};
