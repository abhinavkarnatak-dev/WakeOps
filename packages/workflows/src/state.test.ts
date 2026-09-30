import { describe, expect, it } from 'vitest';

import type { IncidentWorkflowState } from './contracts.js';
import { transitionIncidentWorkflow } from './state.js';

const startingState: IncidentWorkflowState = {
  incidentId: 'incident-1',
  phase: 'STARTING',
  acknowledgement: null,
};

describe('incident workflow transitions', () => {
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
