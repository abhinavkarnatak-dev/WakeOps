import { describe, expect, it } from 'vitest';
import {
  normalizeGrafanaValue,
  normalizeGrafanaWebhook,
  parseGrafanaWebhook,
} from './grafana.js';

describe('Grafana webhook adapter', () => {
  it('extracts the useful value from Grafana expression output', () => {
    expect(normalizeGrafanaValue("[ metric='foo' labels={instance=bar} value=10 ]")).toBe('10');
    expect(normalizeGrafanaValue(undefined)).toBeNull();
  });

  it('parses a Grafana test notification', () => {
    expect(
      parseGrafanaWebhook({
        receiver: 'wakeops',
        status: 'firing',
        alerts: [
          {
            status: 'firing',
            labels: { alertname: 'TestAlert', instance: 'Grafana' },
            annotations: { summary: 'Notification test' },
          },
        ],
      }),
    ).toMatchObject({
      receiver: 'wakeops',
      status: 'firing',
      alertCount: 1,
      alertName: 'TestAlert',
      payloadPreview: {
        commonLabels: {},
        alerts: [
          {
            labels: { alertname: 'TestAlert', instance: 'Grafana' },
            annotations: { summary: 'Notification test' },
          },
        ],
      },
    });
  });

  it('rejects a payload without alerts', () => {
    expect(() => parseGrafanaWebhook({ status: 'firing', alerts: [] })).toThrow();
  });

  it('normalizes custom labels into the internal alert format', () => {
    const [result] = normalizeGrafanaWebhook(
      {
        status: 'firing',
        receiver: 'wakeops',
        commonLabels: { environment: 'Production', region: 'ap-south-1' },
        commonAnnotations: { summary: 'Error rate is high' },
        alerts: [
          {
            status: 'firing',
            fingerprint: 'grafana-fingerprint',
            startsAt: '2026-09-30T10:00:00.000Z',
            labels: {
              alertname: 'HighErrorRate',
              service: 'Payment-Service',
              instance: 'i-111',
              severity: 'critical',
            },
            annotations: { value: '8.7%' },
          },
        ],
      },
      'org-1',
    );

    expect(result).toEqual({
      ok: true,
      alert: expect.objectContaining({
        organizationId: 'org-1',
        externalEventId: 'grafana-fingerprint',
        alertName: 'HighErrorRate',
        resourceIdentifier: 'i-111',
        service: 'payment-service',
        environment: 'production',
        severity: 'CRITICAL',
        status: 'FIRING',
        value: '8.7%',
        labels: expect.objectContaining({ region: 'ap-south-1' }),
        annotations: expect.objectContaining({ summary: 'Error rate is high' }),
      }),
    });
  });

  it('prefers a custom alertName over Grafana test alertname', () => {
    const [result] = normalizeGrafanaWebhook(
      {
        status: 'firing',
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'TestAlert',
              alertName: 'WakeOpsEscalationTest1',
              service: 'payment-service',
              environment: 'production',
              instance: 'i-111',
              severity: 'critical',
            },
          },
        ],
      },
      'org-1',
    );

    expect(result).toEqual({
      ok: true,
      alert: expect.objectContaining({ alertName: 'WakeOpsEscalationTest1' }),
    });
  });

  it('rejects one alert without rejecting valid alerts in the same webhook', () => {
    const results = normalizeGrafanaWebhook(
      {
        status: 'firing',
        alerts: [
          { status: 'firing', labels: { alertname: 'MissingRouting' } },
          {
            status: 'resolved',
            labels: {
              alertname: 'HighCpu',
              service: 'api',
              environment: 'production',
              instance: 'i-111',
              severity: 'warning',
            },
          },
        ],
      },
      'org-1',
    );
    expect(results[0]).toEqual({
      ok: false,
      alert: expect.objectContaining({
        error: 'Missing required Grafana labels: service, environment, instance, severity.',
      }),
    });
    expect(results[1]).toEqual({
      ok: true,
      alert: expect.objectContaining({ status: 'RESOLVED', severity: 'WARNING' }),
    });
  });
});
