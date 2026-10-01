import { database } from '@wakeops/database';
import {
  advanceCallStatus,
  incidentVoiceXml,
  isTerminalCallStatus,
  normalizeTwilioCallStatus,
  validateTrialVoiceToken,
  validateTwilioWebhook,
} from '@wakeops/telephony';
import { z } from 'zod';

import type { TwilioWebhookDependencies } from './twilio-webhook.js';
import {
  signalIncidentAcknowledgement,
  signalIncidentCallResult,
} from './incident-workflow.js';
import { logger } from './logger.js';

const twilioWebhookConfigSchema = z.object({
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_WEBHOOK_BASE_URL: z.string().url(),
  TWILIO_TRIAL_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

function config() {
  const parsed = twilioWebhookConfigSchema.parse(process.env);
  return {
    authToken: parsed.TWILIO_AUTH_TOKEN,
    baseUrl: parsed.TWILIO_WEBHOOK_BASE_URL.replace(/\/$/, ''),
    trialMode: parsed.TWILIO_TRIAL_MODE,
  };
}

function incidentMessage(incident: {
  alertName: string;
  severity: string;
  value: string | null;
  application: { name: string };
  environment: { name: string };
  resource: { externalIdentifier: string };
  annotations: unknown;
}) {
  const severity = incident.severity.toLowerCase();
  const urgency = severity === 'critical' ? 'requires immediate attention' : 'requires attention';
  const value = incident.value ? ` Current reported value: ${incident.value}.` : '';
  const annotations =
    incident.annotations &&
    typeof incident.annotations === 'object' &&
    !Array.isArray(incident.annotations)
      ? (incident.annotations as Record<string, unknown>)
      : null;
  const summaryValue = annotations?.summary;
  const summary =
    typeof summaryValue === 'string' && summaryValue.trim()
      ? ` Summary: ${summaryValue.trim().slice(0, 500)}.`
      : '';
  return `WakeOps ${severity} incident. ${incident.application.name} in ${incident.environment.name} ${urgency}. Resource: ${incident.resource.externalIdentifier}. Alert: ${incident.alertName}.${value}${summary} Please investigate the affected service and check the WakeOps dashboard.`;
}

async function voiceMessage(callAttemptId: string, providerCallId: string) {
  const result = await database.$transaction(async (tx) => {
    const attempt = await tx.callAttempt.findUnique({
      where: { id: callAttemptId },
      include: {
        engineer: { select: { name: true } },
        incident: {
          select: {
            alertName: true,
            severity: true,
            value: true,
            annotations: true,
            application: { select: { name: true } },
            environment: { select: { name: true } },
            resource: { select: { externalIdentifier: true } },
          },
        },
      },
    });
    if (!attempt || (attempt.providerCallId && attempt.providerCallId !== providerCallId))
      return null;
    const status = advanceCallStatus(attempt.status, 'IN_PROGRESS');
    await tx.callAttempt.update({
      where: { id: attempt.id },
      data: {
        providerCallId,
        status,
        answeredAt: attempt.answeredAt ?? new Date(),
      },
    });
    return {
      message: incidentMessage(attempt.incident),
      incidentId: attempt.incidentId,
      engineerName: attempt.engineer.name,
      answeredAt: attempt.answeredAt ?? new Date(),
    };
  });
  if (!result) return null;
  await signalIncidentAcknowledgement(result.incidentId, {
    acknowledgedBy: result.engineerName,
    channel: 'VOICE',
    acknowledgedAt: result.answeredAt.toISOString(),
  }).catch((error: unknown) => {
    logger.error(
      { error, incidentId: result.incidentId, callAttemptId },
      'Could not signal voice acknowledgement',
    );
  });
  return result.message;
}

async function recordStatus(callAttemptId: string, providerCallId: string, providerStatus: string) {
  const result = await database.$transaction(async (tx) => {
    const attempt = await tx.callAttempt.findUnique({ where: { id: callAttemptId } });
    if (!attempt || (attempt.providerCallId && attempt.providerCallId !== providerCallId))
      return null;
    const incoming = normalizeTwilioCallStatus(providerStatus);
    const status = advanceCallStatus(attempt.status, incoming);
    const now = new Date();
    const answeredAt = status === 'IN_PROGRESS' ? (attempt.answeredAt ?? now) : attempt.answeredAt;
    const completedAt = isTerminalCallStatus(status) ? (attempt.completedAt ?? now) : null;
    if (attempt.providerCallId !== providerCallId || status !== attempt.status) {
      await tx.callAttempt.update({
        where: { id: attempt.id },
        data: {
          providerCallId,
          status,
          initiatedAt: attempt.initiatedAt ?? now,
          answeredAt,
          completedAt,
        },
      });
      await tx.auditEvent.create({
        data: {
          incidentId: attempt.incidentId,
          type: 'CALL_STATUS_UPDATED',
          details: { callAttemptId: attempt.id, status },
        },
      });
    }
    return { attempt, status, answeredAt, completedAt };
  });

  if (!result) return false;
  if (isTerminalCallStatus(result.status) && result.completedAt) {
    await signalIncidentCallResult(result.attempt.incidentId, {
      callAttemptId: result.attempt.id,
      status: result.status,
      answered: result.answeredAt !== null,
      completedAt: result.completedAt.toISOString(),
    });
  }
  return true;
}

export const twilioWebhookDependencies: TwilioWebhookDependencies = {
  get trialMode() {
    return config().trialMode;
  },
  validate(path, signature, parameters) {
    const values = config();
    return validateTwilioWebhook(
      values.authToken,
      signature,
      `${values.baseUrl}${path}`,
      parameters,
    );
  },
  validateTrialVoice(callAttemptId, token) {
    const values = config();
    return validateTrialVoiceToken(values.authToken, callAttemptId, token);
  },
  voiceMessage,
  recordStatus,
  voiceXml: incidentVoiceXml,
};
