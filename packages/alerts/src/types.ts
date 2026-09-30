export type AlertSource = 'GRAFANA';
export type AlertStatus = 'FIRING' | 'RESOLVED';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type IncidentAlert = {
  source: AlertSource;
  externalEventId: string | null;
  organizationId: string;
  resourceIdentifier: string;
  service: string;
  environment: string;
  alertName: string;
  severity: AlertSeverity;
  value: string | null;
  startedAt: Date;
  endedAt: Date | null;
  status: AlertStatus;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  metadata: Record<string, string | number | null>;
};

export type RejectedAlert = {
  source: AlertSource;
  externalEventId: string | null;
  organizationId: string;
  status: AlertStatus;
  alertName: string | null;
  resourceIdentifier: string | null;
  service: string | null;
  environment: string | null;
  severity: string | null;
  startedAt: Date;
  endedAt: Date | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  error: string;
};

export type AlertNormalizationResult =
  { ok: true; alert: IncidentAlert } | { ok: false; alert: RejectedAlert };
