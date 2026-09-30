import {
  calculateAlertEventKey,
  calculateAlertFingerprint,
  calculateRejectedAlertEventKey,
  type AlertNormalizationResult,
  type IncidentAlert,
  type RejectedAlert,
} from '@wakeops/alerts';
import { Prisma, type PrismaClient } from '@wakeops/database';

type QueryDatabase = Pick<
  Prisma.TransactionClient,
  'alertEvent' | 'application' | 'environment' | 'monitoredResource' | 'resourceMapping'
>;

type Mapping = {
  id: string;
  resourceId: string;
  applicationId: string;
  environmentId: string;
  primaryEngineerId: string;
  primaryEngineerName: string;
  secondaryEngineerId: string | null;
  secondaryEngineerName: string | null;
};

export type AlertProcessingResult = {
  outcome:
    | 'INCIDENT_CREATED'
    | 'INCIDENT_UPDATED'
    | 'INCIDENT_RESOLVED'
    | 'MAPPING_FAILED'
    | 'UNMATCHED_RESOLUTION'
    | 'DUPLICATE_DELIVERY';
  eventId: string;
  incidentId: string | null;
  message: string;
};

function eventData(alert: IncidentAlert, eventKey: string) {
  return {
    organizationId: alert.organizationId,
    source: alert.source,
    eventKey,
    externalEventId: alert.externalEventId,
    lifecycleStatus: alert.status,
    alertName: alert.alertName,
    resourceIdentifier: alert.resourceIdentifier,
    service: alert.service,
    environment: alert.environment,
    severity: alert.severity,
    value: alert.value,
    labels: alert.labels,
    annotations: alert.annotations,
    metadata: alert.metadata,
    startedAt: alert.startedAt,
    endedAt: alert.endedAt,
  };
}

async function existingDelivery(
  database: QueryDatabase,
  organizationId: string,
  eventKey: string,
): Promise<{ id: string; incidentId: string | null } | null> {
  return database.alertEvent.findUnique({
    where: { organizationId_eventKey: { organizationId, eventKey } },
    select: { id: true, incidentId: true },
  });
}

async function resolveMapping(
  database: QueryDatabase,
  alert: IncidentAlert,
): Promise<Mapping | string> {
  const [resource, application, environment] = await Promise.all([
    database.monitoredResource.findUnique({
      where: {
        organizationId_source_externalIdentifier: {
          organizationId: alert.organizationId,
          source: alert.source,
          externalIdentifier: alert.resourceIdentifier,
        },
      },
      select: { id: true },
    }),
    database.application.findUnique({
      where: {
        organizationId_name: {
          organizationId: alert.organizationId,
          name: alert.service,
        },
      },
      select: { id: true },
    }),
    database.environment.findUnique({
      where: {
        organizationId_name: {
          organizationId: alert.organizationId,
          name: alert.environment,
        },
      },
      select: { id: true },
    }),
  ]);

  if (!resource) return `No monitored host matches instance "${alert.resourceIdentifier}".`;
  if (!application) return `No application matches service "${alert.service}".`;
  if (!environment) return `No environment matches "${alert.environment}".`;

  const mapping = await database.resourceMapping.findUnique({
    where: {
      organizationId_resourceId_applicationId_environmentId: {
        organizationId: alert.organizationId,
        resourceId: resource.id,
        applicationId: application.id,
        environmentId: environment.id,
      },
    },
    include: {
      assignment: {
        include: { primaryEngineer: true, secondaryEngineer: true },
      },
    },
  });
  if (!mapping) {
    return 'The host, service and environment exist, but they are not connected as one service deployment.';
  }
  if (!mapping.assignment) return 'This service deployment has no primary engineer assigned.';

  return {
    id: mapping.id,
    resourceId: mapping.resourceId,
    applicationId: mapping.applicationId,
    environmentId: mapping.environmentId,
    primaryEngineerId: mapping.assignment.primaryEngineerId,
    primaryEngineerName: mapping.assignment.primaryEngineer.name,
    secondaryEngineerId: mapping.assignment.secondaryEngineerId,
    secondaryEngineerName: mapping.assignment.secondaryEngineer?.name ?? null,
  };
}

async function saveRejectedAlert(
  database: PrismaClient,
  alert: RejectedAlert,
): Promise<AlertProcessingResult> {
  const eventKey = calculateRejectedAlertEventKey(alert);
  const existing = await existingDelivery(database, alert.organizationId, eventKey);
  if (existing) {
    return {
      outcome: 'DUPLICATE_DELIVERY',
      eventId: existing.id,
      incidentId: existing.incidentId,
      message: 'This exact invalid alert delivery was already recorded.',
    } satisfies AlertProcessingResult;
  }

  try {
    const event = await database.alertEvent.create({
      data: {
        organizationId: alert.organizationId,
        source: alert.source,
        eventKey,
        externalEventId: alert.externalEventId,
        lifecycleStatus: alert.status,
        processingStatus: 'MAPPING_FAILED',
        mappingError: alert.error,
        alertName: alert.alertName,
        resourceIdentifier: alert.resourceIdentifier,
        service: alert.service,
        environment: alert.environment,
        severity: alert.severity,
        labels: alert.labels,
        annotations: alert.annotations,
        metadata: {},
        startedAt: alert.startedAt,
        endedAt: alert.endedAt,
      },
    });
    return {
      outcome: 'MAPPING_FAILED',
      eventId: event.id,
      incidentId: null,
      message: alert.error,
    } satisfies AlertProcessingResult;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await existingDelivery(database, alert.organizationId, eventKey);
      if (duplicate) {
        return {
          outcome: 'DUPLICATE_DELIVERY',
          eventId: duplicate.id,
          incidentId: duplicate.incidentId,
          message: 'This exact invalid alert delivery was already recorded.',
        } satisfies AlertProcessingResult;
      }
    }
    throw error;
  }
}

async function saveMappingFailure(
  database: PrismaClient,
  alert: IncidentAlert,
  fingerprint: string,
  eventKey: string,
  message: string,
): Promise<AlertProcessingResult> {
  try {
    const event = await database.alertEvent.create({
      data: {
        ...eventData(alert, eventKey),
        processingStatus: 'MAPPING_FAILED',
        mappingError: message,
        metadata: { ...alert.metadata, fingerprint },
      },
    });
    return {
      outcome: 'MAPPING_FAILED',
      eventId: event.id,
      incidentId: null,
      message,
    } satisfies AlertProcessingResult;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await existingDelivery(database, alert.organizationId, eventKey);
      if (duplicate) {
        return {
          outcome: 'DUPLICATE_DELIVERY',
          eventId: duplicate.id,
          incidentId: duplicate.incidentId,
          message: 'This exact alert delivery was already processed.',
        } satisfies AlertProcessingResult;
      }
    }
    throw error;
  }
}

async function processResolvedAlert(
  database: PrismaClient,
  alert: IncidentAlert,
  fingerprint: string,
  eventKey: string,
): Promise<AlertProcessingResult> {
  return database.$transaction(async (tx): Promise<AlertProcessingResult> => {
    const duplicate = await existingDelivery(tx, alert.organizationId, eventKey);
    if (duplicate) {
      return {
        outcome: 'DUPLICATE_DELIVERY',
        eventId: duplicate.id,
        incidentId: duplicate.incidentId,
        message: 'This exact resolved delivery was already processed.',
      } satisfies AlertProcessingResult;
    }

    const incident = await tx.incident.findUnique({
      where: {
        organizationId_activeFingerprint: {
          organizationId: alert.organizationId,
          activeFingerprint: fingerprint,
        },
      },
      select: { id: true },
    });
    if (!incident) {
      const event = await tx.alertEvent.create({
        data: {
          ...eventData(alert, eventKey),
          processingStatus: 'UNMATCHED_RESOLUTION',
          mappingError: 'No active incident matches this resolved alert.',
        },
      });
      return {
        outcome: 'UNMATCHED_RESOLUTION',
        eventId: event.id,
        incidentId: null,
        message: 'No active incident matches this resolved alert.',
      } satisfies AlertProcessingResult;
    }

    await tx.incident.update({
      where: { id: incident.id },
      data: {
        status: 'RESOLVED',
        activeFingerprint: null,
        resolvedAt: alert.endedAt ?? new Date(),
        lastSeenAt: new Date(),
        value: alert.value,
        severity: alert.severity,
        labels: alert.labels,
        annotations: alert.annotations,
        metadata: alert.metadata,
      },
    });
    const event = await tx.alertEvent.create({
      data: {
        ...eventData(alert, eventKey),
        incidentId: incident.id,
        processingStatus: 'PROCESSED',
      },
    });
    await tx.auditEvent.createMany({
      data: [
        { incidentId: incident.id, type: 'ALERT_RECEIVED' },
        { incidentId: incident.id, type: 'INCIDENT_RESOLVED' },
      ],
    });
    return {
      outcome: 'INCIDENT_RESOLVED',
      eventId: event.id,
      incidentId: incident.id,
      message: 'The active incident was resolved.',
    } satisfies AlertProcessingResult;
  });
}

async function processFiringAlert(
  database: PrismaClient,
  alert: IncidentAlert,
  mapping: Mapping,
  fingerprint: string,
  eventKey: string,
): Promise<AlertProcessingResult> {
  return database.$transaction(async (tx): Promise<AlertProcessingResult> => {
    const duplicate = await existingDelivery(tx, alert.organizationId, eventKey);
    if (duplicate) {
      return {
        outcome: 'DUPLICATE_DELIVERY',
        eventId: duplicate.id,
        incidentId: duplicate.incidentId,
        message: 'This exact alert delivery was already processed.',
      } satisfies AlertProcessingResult;
    }

    const activeIncident = await tx.incident.findUnique({
      where: {
        organizationId_activeFingerprint: {
          organizationId: alert.organizationId,
          activeFingerprint: fingerprint,
        },
      },
      select: { id: true },
    });
    if (activeIncident) {
      await tx.incident.update({
        where: { id: activeIncident.id },
        data: {
          lastSeenAt: new Date(),
          value: alert.value,
          severity: alert.severity,
          labels: alert.labels,
          annotations: alert.annotations,
          metadata: alert.metadata,
        },
      });
      const event = await tx.alertEvent.create({
        data: {
          ...eventData(alert, eventKey),
          incidentId: activeIncident.id,
          processingStatus: 'DEDUPLICATED',
        },
      });
      await tx.auditEvent.createMany({
        data: [
          { incidentId: activeIncident.id, type: 'ALERT_RECEIVED' },
          { incidentId: activeIncident.id, type: 'ALERT_DEDUPLICATED' },
        ],
      });
      return {
        outcome: 'INCIDENT_UPDATED',
        eventId: event.id,
        incidentId: activeIncident.id,
        message: 'The alert was attached to the existing active incident.',
      } satisfies AlertProcessingResult;
    }

    const incident = await tx.incident.create({
      data: {
        organizationId: alert.organizationId,
        applicationId: mapping.applicationId,
        environmentId: mapping.environmentId,
        resourceId: mapping.resourceId,
        source: alert.source,
        fingerprint,
        activeFingerprint: fingerprint,
        alertName: alert.alertName,
        severity: alert.severity,
        value: alert.value,
        labels: alert.labels,
        annotations: alert.annotations,
        metadata: {
          ...alert.metadata,
          primaryEngineerId: mapping.primaryEngineerId,
          primaryEngineerName: mapping.primaryEngineerName,
          secondaryEngineerId: mapping.secondaryEngineerId,
          secondaryEngineerName: mapping.secondaryEngineerName,
        },
        startedAt: alert.startedAt,
        lastSeenAt: new Date(),
      },
    });
    const event = await tx.alertEvent.create({
      data: {
        ...eventData(alert, eventKey),
        incidentId: incident.id,
        processingStatus: 'PROCESSED',
      },
    });
    await tx.auditEvent.createMany({
      data: [
        { incidentId: incident.id, type: 'ALERT_RECEIVED' },
        { incidentId: incident.id, type: 'INCIDENT_CREATED' },
      ],
    });
    return {
      outcome: 'INCIDENT_CREATED',
      eventId: event.id,
      incidentId: incident.id,
      message: 'A new incident was created and assigned.',
    } satisfies AlertProcessingResult;
  });
}

async function processValidAlert(
  database: PrismaClient,
  alert: IncidentAlert,
): Promise<AlertProcessingResult> {
  const fingerprint = calculateAlertFingerprint(alert);
  const eventKey = calculateAlertEventKey(alert);
  const existing = await existingDelivery(database, alert.organizationId, eventKey);
  if (existing) {
    return {
      outcome: 'DUPLICATE_DELIVERY',
      eventId: existing.id,
      incidentId: existing.incidentId,
      message: 'This exact alert delivery was already processed.',
    } satisfies AlertProcessingResult;
  }

  if (alert.status === 'RESOLVED') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await processResolvedAlert(database, alert, fingerprint, eventKey);
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034');
        if (!retryable || attempt === 2) throw error;
      }
    }
    throw new Error('Resolved alert processing retry limit reached.');
  }

  const mapping = await resolveMapping(database, alert);
  if (typeof mapping === 'string') {
    return saveMappingFailure(database, alert, fingerprint, eventKey, mapping);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await processFiringAlert(database, alert, mapping, fingerprint, eventKey);
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034');
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Error('Alert processing retry limit reached.');
}

export async function processAlerts(
  database: PrismaClient,
  alerts: AlertNormalizationResult[],
): Promise<AlertProcessingResult[]> {
  const results: AlertProcessingResult[] = [];
  for (const result of alerts) {
    results.push(
      result.ok
        ? await processValidAlert(database, result.alert)
        : await saveRejectedAlert(database, result.alert),
    );
  }
  return results;
}
