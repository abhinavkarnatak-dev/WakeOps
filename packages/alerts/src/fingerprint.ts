import { createHash } from 'node:crypto';
import type { IncidentAlert, RejectedAlert } from './types.js';

const routingLabels = new Set([
  'alertname',
  'environment',
  'instance',
  'service',
  'severity',
  'value',
]);

function sortedEntries(values: Record<string, string>) {
  return Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function calculateAlertFingerprint(alert: IncidentAlert) {
  return digest({
    organizationId: alert.organizationId,
    source: alert.source,
    alertName: alert.alertName.toLowerCase(),
    resourceIdentifier: alert.resourceIdentifier,
    service: alert.service.toLowerCase(),
    environment: alert.environment.toLowerCase(),
    identityLabels: sortedEntries(
      Object.fromEntries(
        Object.entries(alert.labels).filter(([key]) => !routingLabels.has(key.toLowerCase())),
      ),
    ),
  });
}

export function calculateAlertEventKey(alert: IncidentAlert) {
  return digest({
    fingerprint: calculateAlertFingerprint(alert),
    externalEventId: alert.externalEventId,
    status: alert.status,
    startedAt: alert.startedAt.toISOString(),
    endedAt: alert.endedAt?.toISOString() ?? null,
    severity: alert.severity,
    value: alert.value,
    labels: sortedEntries(alert.labels),
    annotations: sortedEntries(alert.annotations),
  });
}

export function calculateRejectedAlertEventKey(alert: RejectedAlert) {
  return digest({
    organizationId: alert.organizationId,
    source: alert.source,
    externalEventId: alert.externalEventId,
    status: alert.status,
    startedAt: alert.startedAt.toISOString(),
    endedAt: alert.endedAt?.toISOString() ?? null,
    labels: sortedEntries(alert.labels),
  });
}
