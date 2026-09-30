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
}) {
  const value = incident.value ? ` The reported value is ${incident.value}.` : '';
  return `${incident.severity.toLowerCase()} incident detected for ${incident.application.name} in ${incident.environment.name}. Alert ${incident.alertName}.${value} Please check the WakeOps dashboard.`;
}

async function voiceMessage(callAttemptId: string, providerCallId: string) {
  return database.$transaction(async (tx) => {
    const attempt = await tx.callAttempt.findUnique({
      where: { id: callAttemptId },
      include: {
        incident: {
          select: {
            alertName: true,
            severity: true,
            value: true,
            application: { select: { name: true } },
            environment: { select: { name: true } },
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
    return incidentMessage(attempt.incident);
  });
}

async function recordStatus(callAttemptId: string, providerCallId: string, providerStatus: string) {
  return database.$transaction(async (tx) => {
    const attempt = await tx.callAttempt.findUnique({ where: { id: callAttemptId } });
    if (!attempt || (attempt.providerCallId && attempt.providerCallId !== providerCallId))
      return false;
    const incoming = normalizeTwilioCallStatus(providerStatus);
    const status = advanceCallStatus(attempt.status, incoming);
    if (attempt.providerCallId === providerCallId && status === attempt.status) return true;
    const now = new Date();
    await tx.callAttempt.update({
      where: { id: attempt.id },
      data: {
        providerCallId,
        status,
        initiatedAt: attempt.initiatedAt ?? now,
        answeredAt: status === 'IN_PROGRESS' ? (attempt.answeredAt ?? now) : attempt.answeredAt,
        completedAt: isTerminalCallStatus(status) ? (attempt.completedAt ?? now) : null,
      },
    });
    await tx.auditEvent.create({
      data: {
        incidentId: attempt.incidentId,
        type: 'CALL_STATUS_UPDATED',
        details: { callAttemptId: attempt.id, status },
      },
    });
    return true;
  });
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
