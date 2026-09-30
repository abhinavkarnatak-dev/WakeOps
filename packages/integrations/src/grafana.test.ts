import { describe, expect, it } from 'vitest';
import { parseGrafanaWebhook } from './grafana.js';

describe('Grafana webhook adapter', () => {
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
});
