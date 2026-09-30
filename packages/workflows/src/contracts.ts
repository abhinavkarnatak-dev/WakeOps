export const INCIDENT_WORKFLOW_NAME = 'incidentWorkflow';
export const INCIDENT_ACKNOWLEDGED_SIGNAL = 'incidentAcknowledged';
export const INCIDENT_RESOLVED_SIGNAL = 'incidentResolved';
export const INCIDENT_STATE_QUERY = 'incidentState';

export type IncidentWorkflowInput = {
  incidentId: string;
};

export type IncidentAcknowledgement = {
  acknowledgedBy: string;
  channel: 'VOICE' | 'DASHBOARD' | 'SYSTEM';
  acknowledgedAt: string;
};

export type IncidentResolution = {
  resolvedAt: string;
};

export type IncidentWorkflowPhase =
  'STARTING' | 'WAITING_FOR_ACKNOWLEDGEMENT' | 'ACKNOWLEDGED' | 'RESOLVED';

export type IncidentWorkflowState = {
  incidentId: string;
  phase: IncidentWorkflowPhase;
  acknowledgement: IncidentAcknowledgement | null;
};

export type IncidentWorkflowResult = {
  incidentId: string;
  finalStatus: 'RESOLVED';
};

export type InitializeIncidentResult = {
  status: 'NOTIFYING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedAt: string | null;
};

export type IncidentActivities = {
  initializeIncidentWorkflow(incidentId: string): Promise<InitializeIncidentResult>;
  acknowledgeIncident(incidentId: string, acknowledgement: IncidentAcknowledgement): Promise<void>;
  resolveIncident(incidentId: string, resolution: IncidentResolution): Promise<void>;
};

export function incidentWorkflowId(incidentId: string) {
  return `incident-${incidentId}`;
}
