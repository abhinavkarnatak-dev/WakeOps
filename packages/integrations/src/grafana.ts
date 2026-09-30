import { z } from 'zod';
import type { AlertNormalizationResult, AlertSeverity, AlertStatus } from '@wakeops/alerts';

const labels = z
  .record(z.string().max(100), z.string().max(2000))
  .refine((value) => Object.keys(value).length <= 100, 'Too many labels or annotations.');

const grafanaAlertSchema = z
  .object({
    status: z.enum(['firing', 'resolved']),
    labels: labels.default({}),
    annotations: labels.default({}),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    generatorURL: z.string().max(2000).optional(),
    dashboardURL: z.string().max(2000).optional(),
    panelURL: z.string().max(2000).optional(),
    silenceURL: z.string().max(2000).optional(),
    valueString: z.string().max(4000).optional(),
    fingerprint: z.string().max(500).optional(),
  })
  .passthrough();

export const grafanaWebhookSchema = z
  .object({
    receiver: z.string().max(200).optional(),
    status: z.enum(['firing', 'resolved']),
    orgId: z.number().optional(),
    alerts: z.array(grafanaAlertSchema).min(1).max(100),
    groupLabels: labels.optional(),
    commonLabels: labels.optional(),
    commonAnnotations: labels.optional(),
    externalURL: z.string().optional(),
    version: z.string().optional(),
    groupKey: z.string().optional(),
    truncatedAlerts: z.number().int().nonnegative().optional(),
    state: z.enum(['alerting', 'ok']).optional(),
  })
  .passthrough();

export type GrafanaWebhookSummary = {
  receiver: string | null;
  status: 'firing' | 'resolved';
  alertCount: number;
  alertName: string | null;
  payloadPreview: {
    receiver: string | null;
    status: 'firing' | 'resolved';
    commonLabels: Record<string, string>;
    commonAnnotations: Record<string, string>;
    alerts: Array<{
      status: 'firing' | 'resolved';
      labels: Record<string, string>;
      annotations: Record<string, string>;
      startsAt: string | null;
      endsAt: string | null;
    }>;
  };
};

export function parseGrafanaWebhook(input: unknown): GrafanaWebhookSummary {
  const payload = grafanaWebhookSchema.parse(input);
  const firstAlert = payload.alerts[0];
  return {
    receiver: payload.receiver ?? null,
    status: payload.status,
    alertCount: payload.alerts.length,
    alertName:
      firstAlert?.labels.alertname ?? payload.commonLabels?.alertname ?? 'Grafana test alert',
    payloadPreview: {
      receiver: payload.receiver ?? null,
      status: payload.status,
      commonLabels: payload.commonLabels ?? {},
      commonAnnotations: payload.commonAnnotations ?? {},
      alerts: payload.alerts.map((alert) => ({
        status: alert.status,
        labels: alert.labels,
        annotations: alert.annotations,
        startsAt: alert.startsAt ?? null,
        endsAt: alert.endsAt ?? null,
      })),
    },
  };
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function optionalDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSeverity(value: string | undefined): AlertSeverity | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'critical') return 'CRITICAL';
  if (normalized === 'warning' || normalized === 'warn') return 'WARNING';
  if (normalized === 'info' || normalized === 'informational') return 'INFO';
  return null;
}

function alertStatus(value: 'firing' | 'resolved'): AlertStatus {
  return value === 'firing' ? 'FIRING' : 'RESOLVED';
}

export function normalizeGrafanaWebhook(
  input: unknown,
  organizationId: string,
  receivedAt = new Date(),
): AlertNormalizationResult[] {
  const payload = grafanaWebhookSchema.parse(input);

  return payload.alerts.map((grafanaAlert) => {
    const mergedLabels = { ...payload.commonLabels, ...grafanaAlert.labels };
    const mergedAnnotations = { ...payload.commonAnnotations, ...grafanaAlert.annotations };
    const alertName = mergedLabels.alertname?.trim() || null;
    const resourceIdentifier = mergedLabels.instance?.trim() || null;
    const service = mergedLabels.service?.trim().toLowerCase() || null;
    const environment = mergedLabels.environment?.trim().toLowerCase() || null;
    const severityValue = mergedLabels.severity?.trim() || null;
    const severity = normalizeSeverity(severityValue ?? undefined);
    const startedAt = parseDate(grafanaAlert.startsAt, receivedAt);
    const endedAt = optionalDate(grafanaAlert.endsAt);
    const missing = [
      ['alertname', alertName],
      ['service', service],
      ['environment', environment],
      ['instance', resourceIdentifier],
      ['severity', severityValue],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);
    const errors: string[] = [];
    if (missing.length) errors.push(`Missing required Grafana labels: ${missing.join(', ')}.`);
    if (severityValue && !severity) {
      errors.push('Grafana severity must be critical, warning or info.');
    }

    if (
      errors.length ||
      !alertName ||
      !resourceIdentifier ||
      !service ||
      !environment ||
      !severity
    ) {
      return {
        ok: false,
        alert: {
          source: 'GRAFANA',
          externalEventId: grafanaAlert.fingerprint ?? null,
          organizationId,
          status: alertStatus(grafanaAlert.status),
          alertName,
          resourceIdentifier,
          service,
          environment,
          severity: severityValue,
          startedAt,
          endedAt,
          labels: mergedLabels,
          annotations: mergedAnnotations,
          error: errors.join(' '),
        },
      } satisfies AlertNormalizationResult;
    }

    return {
      ok: true,
      alert: {
        source: 'GRAFANA',
        externalEventId: grafanaAlert.fingerprint ?? null,
        organizationId,
        resourceIdentifier,
        service,
        environment,
        alertName,
        severity,
        value: mergedAnnotations.value ?? mergedLabels.value ?? grafanaAlert.valueString ?? null,
        startedAt,
        endedAt,
        status: alertStatus(grafanaAlert.status),
        labels: mergedLabels,
        annotations: mergedAnnotations,
        metadata: {
          receiver: payload.receiver ?? null,
          generatorUrl: grafanaAlert.generatorURL ?? null,
          dashboardUrl: grafanaAlert.dashboardURL ?? null,
          panelUrl: grafanaAlert.panelURL ?? null,
          silenceUrl: grafanaAlert.silenceURL ?? null,
        },
      },
    } satisfies AlertNormalizationResult;
  });
}
