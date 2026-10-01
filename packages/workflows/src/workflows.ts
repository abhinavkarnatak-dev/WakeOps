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
  INCIDENT_CALL_COMPLETED_SIGNAL,
  INCIDENT_RESOLVED_SIGNAL,
  INCIDENT_STATE_QUERY,
  type IncidentAcknowledgement,
  type IncidentCallResult,
  type IncidentActivities,
  type IncidentResolution,
  type IncidentWorkflowInput,
  type IncidentWorkflowResult,
  type IncidentWorkflowState,
} from './contracts.js';
import {
  callTimingPolicy,
  callResultDecision,
  incidentEscalationPlan,
  transitionIncidentWorkflow,
  type EngineerCallRole,
} from './state.js';

const activities = proxyActivities<IncidentActivities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    nonRetryableErrorTypes: ['IncidentNotFoundError'],
  },
});

const notificationActivities = proxyActivities<
  Pick<IncidentActivities, 'publishIncidentNotifications'>
>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '10 seconds',
    maximumAttempts: 5,
  },
});

const acknowledgedSignal = defineSignal<[IncidentAcknowledgement]>(INCIDENT_ACKNOWLEDGED_SIGNAL);
const callCompletedSignal = defineSignal<[IncidentCallResult]>(INCIDENT_CALL_COMPLETED_SIGNAL);
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
  let pendingCallResult: IncidentCallResult | null = null;
  let notificationPromise: Promise<void> | null = null;
  const shorterRetryTiming = patched('call-retry-timing-v1');

  setHandler(stateQuery, () => state);
  setHandler(acknowledgedSignal, (acknowledgement) => {
    if (state.phase !== 'RESOLVED') pendingAcknowledgement = acknowledgement;
  });
  setHandler(resolvedSignal, (resolution) => {
    pendingResolution = resolution;
  });
  setHandler(callCompletedSignal, (result) => {
    pendingCallResult = result;
  });

  async function callEngineer(role: EngineerCallRole) {
    const attempts = incidentEscalationPlan().filter((target) => target.role === role);
    for (const [index, target] of attempts.entries()) {
      const { attemptNumber } = target;
      const call =
        role === 'PRIMARY'
          ? await activities.initiatePrimaryCall(input.incidentId, attemptNumber)
          : await activities.initiateSecondaryCall(input.incidentId, attemptNumber);
      state = transitionIncidentWorkflow(state, {
        type: 'CALL_REQUESTED',
        callAttemptId: call.callAttemptId,
      });

      if (!call.callAttemptId || call.status === 'SKIPPED') return;

      let result: IncidentCallResult | null = null;
      let receivedResult = call.status === 'FAILED';
      if (call.status === 'FAILED') {
        result = await activities.getCallResult(call.callAttemptId);
      } else {
        receivedResult = await condition(
          () =>
            pendingResolution !== null ||
            pendingAcknowledgement !== null ||
            pendingCallResult?.callAttemptId === call.callAttemptId,
          shorterRetryTiming ? callTimingPolicy.resultTimeout : '2 minutes',
        );
        const signaledResult = pendingCallResult as IncidentCallResult | null;
        if (signaledResult?.callAttemptId === call.callAttemptId) {
          result = signaledResult;
          pendingCallResult = null;
        } else if (!pendingResolution && !pendingAcknowledgement) {
          result = await activities.getCallResult(call.callAttemptId);
        }
      }

      if (result && callResultDecision(result) === 'ACKNOWLEDGE') {
        pendingAcknowledgement = {
          acknowledgedBy: call.engineerName ?? 'Assigned engineer',
          channel: 'VOICE',
          acknowledgedAt: result.completedAt,
        };
        return;
      }

      if (pendingResolution || pendingAcknowledgement || index === attempts.length - 1) return;
      if (receivedResult) {
        await condition(
          () => pendingResolution !== null || pendingAcknowledgement !== null,
          shorterRetryTiming ? callTimingPolicy.retryDelay : '1 minute',
        );
      }
      if (pendingResolution || pendingAcknowledgement) return;
    }
  }

  const initialized = await activities.initializeIncidentWorkflow(input.incidentId);
  state = transitionIncidentWorkflow(state, {
    type: 'INITIALIZED',
    acknowledged: initialized.status === 'ACKNOWLEDGED',
    resolved: initialized.status === 'RESOLVED',
  });

  if (state.phase === 'ACKNOWLEDGED' && patched('complete-on-acknowledgement-v1')) {
    return { incidentId: input.incidentId, finalStatus: 'ACKNOWLEDGED' };
  }

  if (patched('incident-notifications-v1') && state.phase === 'WAITING_FOR_ACKNOWLEDGEMENT') {
    notificationPromise = notificationActivities
      .publishIncidentNotifications(input.incidentId)
      .catch(() => undefined);
  }

  if (patched('primary-call-v1') && state.phase === 'WAITING_FOR_ACKNOWLEDGEMENT') {
    if (patched('call-outcome-retry-v1')) {
      await callEngineer('PRIMARY');
      if (patched('secondary-escalation-v1') && !pendingResolution && !pendingAcknowledgement) {
        await callEngineer('SECONDARY');
      }
    } else {
      const call = await activities.initiatePrimaryCall(input.incidentId, 1);
      state = transitionIncidentWorkflow(state, {
        type: 'CALL_REQUESTED',
        callAttemptId: call.callAttemptId,
      });
    }
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
      if (patched('complete-on-acknowledgement-v1')) {
        if (notificationPromise) await notificationPromise;
        return { incidentId: input.incidentId, finalStatus: 'ACKNOWLEDGED' };
      }
    }
  }

  if (notificationPromise) await notificationPromise;
  return { incidentId: input.incidentId, finalStatus: 'RESOLVED' };
}
