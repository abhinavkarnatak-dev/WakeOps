import { describe, expect, it } from 'vitest';

import type { IncidentWorkflowState } from './contracts.js';
import {
  callResultDecision,
  callTimingPolicy,
  incidentEscalationPlan,
  transitionIncidentWorkflow,
} from './state.js';

const startingState: IncidentWorkflowState = {
  incidentId: 'incident-1',
  phase: 'STARTING',
  acknowledgement: null,
  callAttemptId: null,
};

describe('incident workflow transitions', () => {
  it('retries within the 45 second escalation window', () => {
    expect(callTimingPolicy).toEqual({
      resultTimeout: '45 seconds',
      retryDelay: '15 seconds',
    });
  });

  it('calls the primary twice before escalating to the secondary', () => {
    expect(incidentEscalationPlan()).toEqual([
      { role: 'PRIMARY', attemptNumber: 1 },
      { role: 'PRIMARY', attemptNumber: 2 },
      { role: 'SECONDARY', attemptNumber: 1 },
      { role: 'SECONDARY', attemptNumber: 2 },
    ]);
  });

  it('acknowledges only an answered completed call', () => {
    expect(
      callResultDecision({
        callAttemptId: 'call-1',
        status: 'COMPLETED',
        answered: true,
        completedAt: '2026-10-01T09:00:00.000Z',
      }),
    ).toBe('ACKNOWLEDGE');
    for (const status of ['NO_ANSWER', 'BUSY', 'FAILED', 'CANCELED'] as const) {
      expect(
        callResultDecision({
          callAttemptId: 'call-2',
          status,
          answered: false,
          completedAt: '2026-10-01T09:01:00.000Z',
        }),
      ).toBe('RETRY');
    }
    expect(
      callResultDecision({
        callAttemptId: 'call-3',
        status: 'COMPLETED',
        answered: false,
        completedAt: '2026-10-01T09:02:00.000Z',
      }),
    ).toBe('RETRY');
  });

  it('waits for acknowledgement after initialization', () => {
    const state = transitionIncidentWorkflow(startingState, {
      type: 'INITIALIZED',
      acknowledged: false,
      resolved: false,
    });
    expect(state.phase).toBe('WAITING_FOR_ACKNOWLEDGEMENT');
  });

  it('keeps acknowledged separate from resolved', () => {
    const acknowledgement = {
      acknowledgedBy: 'Engineer A',
      channel: 'VOICE' as const,
      acknowledgedAt: '2026-10-01T09:00:00.000Z',
    };
    const acknowledged = transitionIncidentWorkflow(startingState, {
      type: 'ACKNOWLEDGED',
      acknowledgement,
    });
    const resolved = transitionIncidentWorkflow(acknowledged, { type: 'RESOLVED' });
    expect(acknowledged.phase).toBe('ACKNOWLEDGED');
    expect(resolved.phase).toBe('RESOLVED');
    expect(resolved.acknowledgement).toEqual(acknowledgement);
  });

  it('remembers the active call attempt', () => {
    const state = transitionIncidentWorkflow(startingState, {
      type: 'CALL_REQUESTED',
      callAttemptId: 'call-1',
    });
    expect(state.callAttemptId).toBe('call-1');
  });

  it('does not reopen a resolved workflow', () => {
    const resolved = transitionIncidentWorkflow(startingState, { type: 'RESOLVED' });
    const next = transitionIncidentWorkflow(resolved, {
      type: 'INITIALIZED',
      acknowledged: false,
      resolved: false,
    });
    expect(next).toEqual(resolved);
  });
});
