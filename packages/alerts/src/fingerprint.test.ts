import { describe, expect, it } from 'vitest';
import { calculateAlertEventKey, calculateAlertFingerprint } from './fingerprint.js';
import type { IncidentAlert } from './types.js';

function alert(overrides: Partial<IncidentAlert> = {}): IncidentAlert {
  return {
    source: 'GRAFANA',
    externalEventId: 'grafana-1',
    organizationId: 'org-1',
    resourceIdentifier: 'i-111',
    service: 'payment-service',
    environment: 'production',
    alertName: 'HighErrorRate',
    severity: 'CRITICAL',
    value: '8.7%',
    startedAt: new Date('2026-09-30T10:00:00.000Z'),
    endedAt: null,
    status: 'FIRING',
    labels: { region: 'ap-south-1', severity: 'critical' },
    annotations: {},
    metadata: {},
    ...overrides,
  };
}

describe('alert identity', () => {
  it('keeps the fingerprint stable when value or severity changes', () => {
    const first = calculateAlertFingerprint(alert());
    const second = calculateAlertFingerprint(
      alert({
        value: '9.2%',
        severity: 'WARNING',
        labels: { severity: 'warning', region: 'ap-south-1' },
      }),
    );
    expect(second).toBe(first);
  });

  it('changes the fingerprint for another resource or identity label', () => {
    const first = calculateAlertFingerprint(alert());
    expect(calculateAlertFingerprint(alert({ resourceIdentifier: 'i-222' }))).not.toBe(first);
    expect(
      calculateAlertFingerprint(alert({ labels: { region: 'us-east-1', severity: 'critical' } })),
    ).not.toBe(first);
  });

  it('uses status and occurrence time for exact delivery identity', () => {
    const firing = calculateAlertEventKey(alert());
    expect(calculateAlertEventKey(alert())).toBe(firing);
    expect(calculateAlertEventKey(alert({ status: 'RESOLVED' }))).not.toBe(firing);
    expect(calculateAlertEventKey(alert({ value: '9.2%' }))).not.toBe(firing);
    expect(
      calculateAlertEventKey(alert({ startedAt: new Date('2026-09-30T11:00:00.000Z') })),
    ).not.toBe(firing);
  });
});
