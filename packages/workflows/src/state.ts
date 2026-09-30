import type {
  IncidentAcknowledgement,
  IncidentWorkflowPhase,
  IncidentWorkflowState,
} from './contracts.js';

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
