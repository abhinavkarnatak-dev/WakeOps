import { z } from 'zod';

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
    generatorURL: z.string().optional(),
    fingerprint: z.string().optional(),
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
