import {
  condition,
  defineQuery,
  defineSignal,
  proxyActivities,
  patched,
  setHandler,
} from '@temporalio/workflow';

import {
  INCIDENT_ACKNOWLEDGED_SIGNAL,
  INCIDENT_RESOLVED_SIGNAL,
  INCIDENT_STATE_QUERY,
  type IncidentAcknowledgement,
  type IncidentActivities,
  type IncidentResolution,
  type IncidentWorkflowInput,
  type IncidentWorkflowResult,
  type IncidentWorkflowState,
} from './contracts.js';
import { transitionIncidentWorkflow } from './state.js';

const activities = proxyActivities<IncidentActivities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    nonRetryableErrorTypes: ['IncidentNotFoundError'],
  },
});

const acknowledgedSignal = defineSignal<[IncidentAcknowledgement]>(INCIDENT_ACKNOWLEDGED_SIGNAL);
const resolvedSignal = defineSignal<[IncidentResolution]>(INCIDENT_RESOLVED_SIGNAL);
const stateQuery = defineQuery<IncidentWorkflowState>(INCIDENT_STATE_QUERY);

export async function incidentWorkflow(
  input: IncidentWorkflowInput,
): Promise<IncidentWorkflowResult> {
  let state: IncidentWorkflowState = {
    incidentId: input.incidentId,
    phase: 'STARTING',
    acknowledgement: null,
    callAttemptId: null,
  };
  let pendingAcknowledgement: IncidentAcknowledgement | null = null;
  let pendingResolution: IncidentResolution | null = null;

  setHandler(stateQuery, () => state);
  setHandler(acknowledgedSignal, (acknowledgement) => {
    if (state.phase !== 'RESOLVED') pendingAcknowledgement = acknowledgement;
  });
  setHandler(resolvedSignal, (resolution) => {
    pendingResolution = resolution;
  });

  const initialized = await activities.initializeIncidentWorkflow(input.incidentId);
  state = transitionIncidentWorkflow(state, {
    type: 'INITIALIZED',
    acknowledged: initialized.status === 'ACKNOWLEDGED',
    resolved: initialized.status === 'RESOLVED',
  });

  if (patched('primary-call-v1') && state.phase === 'WAITING_FOR_ACKNOWLEDGEMENT') {
    const call = await activities.initiatePrimaryCall(input.incidentId);
    state = transitionIncidentWorkflow(state, {
      type: 'CALL_REQUESTED',
      callAttemptId: call.callAttemptId,
    });
  }

  while (state.phase !== 'RESOLVED') {
    await condition(() => pendingAcknowledgement !== null || pendingResolution !== null);

    if (pendingResolution) {
      const resolution = pendingResolution;
      pendingResolution = null;
      await activities.resolveIncident(input.incidentId, resolution);
      state = transitionIncidentWorkflow(state, { type: 'RESOLVED' });
      continue;
    }

    if (pendingAcknowledgement) {
      const acknowledgement = pendingAcknowledgement;
      pendingAcknowledgement = null;
      await activities.acknowledgeIncident(input.incidentId, acknowledgement);
      state = transitionIncidentWorkflow(state, { type: 'ACKNOWLEDGED', acknowledgement });
    }
  }

  return { incidentId: input.incidentId, finalStatus: 'RESOLVED' };
}
