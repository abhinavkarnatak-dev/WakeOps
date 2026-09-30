import { describe, expect, it } from 'vitest';

import type { AlertNormalizationResult } from '@wakeops/alerts';
import type { AlertProcessingResult } from '@wakeops/incidents';

import { incidentWorkflowAction } from './incident-workflow.js';

function alert(status: 'FIRING' | 'RESOLVED'): AlertNormalizationResult {
  return {
    ok: true,
    alert: {
      source: 'GRAFANA',
      externalEventId: null,
      organizationId: 'org-1',
      resourceIdentifier: 'host-1',
      service: 'payments',
      environment: 'production',
      alertName: 'HighErrorRate',
      severity: 'CRITICAL',
      value: '8.7',
      status,
      startedAt: new Date('2026-10-01T08:00:00.000Z'),
      endedAt: status === 'RESOLVED' ? new Date('2026-10-01T08:10:00.000Z') : null,
      labels: {},
      annotations: {},
      metadata: {},
    },
  };
}

function result(
  outcome: AlertProcessingResult['outcome'],
  incidentId: string | null = 'incident-1',
): AlertProcessingResult {
  return { outcome, incidentId, eventId: 'event-1', message: 'Test' };
}

describe('incident workflow orchestration', () => {
  it('starts workflows for new and repeated firing alerts', () => {
    expect(incidentWorkflowAction(alert('FIRING'), result('INCIDENT_CREATED'))).toBe('START');
    expect(incidentWorkflowAction(alert('FIRING'), result('DUPLICATE_DELIVERY'))).toBe('START');
  });

  it('signals resolution including a retried delivery', () => {
    expect(incidentWorkflowAction(alert('RESOLVED'), result('INCIDENT_RESOLVED'))).toBe('RESOLVE');
    expect(incidentWorkflowAction(alert('RESOLVED'), result('DUPLICATE_DELIVERY'))).toBe('RESOLVE');
  });

  it('does nothing when no incident was mapped', () => {
    expect(incidentWorkflowAction(alert('FIRING'), result('MAPPING_FAILED', null))).toBe('NONE');
  });
});
