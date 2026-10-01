import type {
  IncidentCallResult,
  IncidentAcknowledgement,
  IncidentWorkflowPhase,
  IncidentWorkflowState,
} from './contracts.js';

export type CallResultDecision = 'ACKNOWLEDGE' | 'RETRY';
export type EngineerCallRole = 'PRIMARY' | 'SECONDARY';

export const callTimingPolicy = {
  resultTimeout: '45 seconds',
  retryDelay: '15 seconds',
} as const;

export function incidentEscalationPlan() {
  return [
    { role: 'PRIMARY' as const, attemptNumber: 1 },
    { role: 'PRIMARY' as const, attemptNumber: 2 },
    { role: 'SECONDARY' as const, attemptNumber: 1 },
    { role: 'SECONDARY' as const, attemptNumber: 2 },
  ];
}

export function callResultDecision(result: IncidentCallResult): CallResultDecision {
  return result.status === 'COMPLETED' && result.answered ? 'ACKNOWLEDGE' : 'RETRY';
}

export type IncidentWorkflowEvent =
  | { type: 'INITIALIZED'; acknowledged: boolean; resolved: boolean }
  | { type: 'CALL_REQUESTED'; callAttemptId: string | null }
  | { type: 'ACKNOWLEDGED'; acknowledgement: IncidentAcknowledgement }
  | { type: 'RESOLVED' };

export function transitionIncidentWorkflow(
  state: IncidentWorkflowState,
  event: IncidentWorkflowEvent,
): IncidentWorkflowState {
  if (state.phase === 'RESOLVED') return state;

  if (event.type === 'RESOLVED') {
    return { ...state, phase: 'RESOLVED' };
  }

  if (event.type === 'ACKNOWLEDGED') {
    return { ...state, phase: 'ACKNOWLEDGED', acknowledgement: event.acknowledgement };
  }

  if (event.type === 'CALL_REQUESTED') {
    return { ...state, callAttemptId: event.callAttemptId };
  }

  let phase: IncidentWorkflowPhase = 'WAITING_FOR_ACKNOWLEDGEMENT';
  if (event.resolved) phase = 'RESOLVED';
  else if (event.acknowledged) phase = 'ACKNOWLEDGED';
  return { ...state, phase };
}
