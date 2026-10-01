export const INCIDENT_WORKFLOW_NAME = 'incidentWorkflow';
export const INCIDENT_ACKNOWLEDGED_SIGNAL = 'incidentAcknowledged';
export const INCIDENT_RESOLVED_SIGNAL = 'incidentResolved';
export const INCIDENT_CALL_COMPLETED_SIGNAL = 'incidentCallCompleted';
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
  callAttemptId: string | null;
};

export type IncidentWorkflowResult = {
  incidentId: string;
  finalStatus: 'ACKNOWLEDGED' | 'RESOLVED';
};

export type InitializeIncidentResult = {
  status: 'NOTIFYING' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedAt: string | null;
};

export type InitiateEngineerCallResult = {
  callAttemptId: string | null;
  engineerName: string | null;
  status: 'STARTED' | 'EXISTING' | 'SKIPPED' | 'FAILED' | 'SUBMISSION_UNKNOWN';
};

export type IncidentCallResult = {
  callAttemptId: string;
  status: 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY' | 'CANCELED';
  answered: boolean;
  completedAt: string;
};

export type IncidentActivities = {
  initializeIncidentWorkflow(incidentId: string): Promise<InitializeIncidentResult>;
  publishIncidentNotifications(incidentId: string): Promise<void>;
  initiatePrimaryCall(
    incidentId: string,
    attemptNumber: number,
  ): Promise<InitiateEngineerCallResult>;
  initiateSecondaryCall(
    incidentId: string,
    attemptNumber: number,
  ): Promise<InitiateEngineerCallResult>;
  getCallResult(callAttemptId: string): Promise<IncidentCallResult | null>;
  acknowledgeIncident(incidentId: string, acknowledgement: IncidentAcknowledgement): Promise<void>;
  resolveIncident(incidentId: string, resolution: IncidentResolution): Promise<void>;
};

export function incidentWorkflowId(incidentId: string) {
  return `incident-${incidentId}`;
}
