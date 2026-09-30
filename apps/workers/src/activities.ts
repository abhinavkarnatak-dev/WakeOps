import { database } from '@wakeops/database';
import type {
  IncidentAcknowledgement,
  IncidentActivities,
  IncidentResolution,
  InitializeIncidentResult,
} from '@wakeops/workflows/contracts';

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
  acknowledgeIncident,
  resolveIncident,
};
