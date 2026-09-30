import { database } from '@wakeops/database';
import {
  createTrialVoiceToken,
  createTwilioProvider,
  type TelephonyProvider,
} from '@wakeops/telephony';
import type {
  IncidentAcknowledgement,
  IncidentActivities,
  IncidentResolution,
  InitializeIncidentResult,
  InitiatePrimaryCallResult,
} from '@wakeops/workflows/contracts';

import { requireTwilioConfig } from './config.js';

function callUrls(baseUrl: string, callAttemptId: string, trialToken?: string) {
  const query = trialToken ? `?token=${trialToken}` : '';
  return {
    voiceUrl: `${baseUrl}/webhooks/twilio/voice/${callAttemptId}${query}`,
    statusCallbackUrl: `${baseUrl}/webhooks/twilio/status/${callAttemptId}`,
  };
}

async function primaryEngineer(incidentId: string) {
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
          primaryEngineer: { select: { id: true, phoneNumber: true } },
        },
      },
    },
  });
  const engineer = mapping?.assignment?.primaryEngineer;
  if (!engineer) throw new Error('No primary engineer is assigned to this incident.');
  return { incident, engineer };
}

async function initiatePrimaryCall(incidentId: string): Promise<InitiatePrimaryCallResult> {
  const { incident, engineer } = await primaryEngineer(incidentId);
  if (!engineer) return { callAttemptId: null, status: 'SKIPPED' };
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
          attemptNumber: 1,
        },
      },
    });
    if (existing) return existing;
    const saved = await tx.callAttempt.create({
      data: {
        incidentId: incident.id,
        engineerId: engineer.id,
        attemptNumber: 1,
      },
    });
    await tx.auditEvent.create({
      data: {
        incidentId: incident.id,
        type: 'CALL_REQUESTED',
        details: { callAttemptId: saved.id, engineerId: engineer.id },
      },
    });
    return saved;
  });

  if (attempt.providerCallId) return { callAttemptId: attempt.id, status: 'EXISTING' };
  const claimed = await database.callAttempt.updateMany({
    where: { id: attempt.id, submissionStartedAt: null },
    data: { submissionStartedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { callAttemptId: attempt.id, status: 'SUBMISSION_UNKNOWN' };
  }

  const trialToken = config.trialMode
    ? createTrialVoiceToken(config.authToken, attempt.id)
    : undefined;
  const urls = callUrls(config.webhookBaseUrl, attempt.id, trialToken);
  try {
    const call = await provider.createCall({
      to: engineer.phoneNumber,
      from: config.phoneNumber,
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
    return { callAttemptId: attempt.id, status: 'STARTED' };
  } catch (error) {
    const failureCode =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code).slice(0, 100)
        : null;
    await database.callAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        failureCode,
        failureMessage: 'Twilio could not confirm that the call was created.',
        completedAt: new Date(),
      },
    });
    return { callAttemptId: attempt.id, status: 'FAILED' };
  }
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

async function acknowledgeIncident(incidentId: string, acknowledgement: IncidentAcknowledgement) {
  await database.$transaction(async (tx) => {
    await tx.incident.updateMany({
      where: { id: incidentId, status: { in: ['OPEN', 'NOTIFYING'] } },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(acknowledgement.acknowledgedAt),
      },
    });
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
  initiatePrimaryCall,
  acknowledgeIncident,
  resolveIncident,
};
