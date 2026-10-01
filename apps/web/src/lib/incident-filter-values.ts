export const incidentStatuses = ['OPEN', 'NOTIFYING', 'ACKNOWLEDGED', 'RESOLVED'] as const;

export type IncidentFilterStatus = (typeof incidentStatuses)[number];

export function incidentFilterStatus(value: string | undefined): IncidentFilterStatus | undefined {
  return incidentStatuses.find((status) => status === value);
}
