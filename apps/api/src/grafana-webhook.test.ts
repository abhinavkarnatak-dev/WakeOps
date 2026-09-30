import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

const secret = 'grafana-test-secret-with-at-least-32-characters';
const authenticateGrafanaWebhook = vi.fn(async (_organizationId: string, provided: string) =>
  provided === secret,
);
const recordGrafanaTest = vi.fn(async () => true);
const server = createApp({ authenticateGrafanaWebhook, recordGrafanaTest }).listen(0);

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });
});

afterAll(() => server.close());

function endpoint() {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP port.');
  return `http://127.0.0.1:${address.port}/webhooks/grafana/org-1`;
}

const payload = {
  receiver: 'wakeops',
  status: 'firing',
  alerts: [
    {
      status: 'firing',
      labels: { alertname: 'TestAlert' },
      annotations: { summary: 'Notification test' },
    },
  ],
};

describe('Grafana webhook', () => {
  it('accepts an authenticated test notification', async () => {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(response.status).toBe(202);
    expect(authenticateGrafanaWebhook).toHaveBeenCalledWith('org-1', secret);
    expect(recordGrafanaTest).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        receiver: 'wakeops',
        status: 'firing',
        alertCount: 1,
        alertName: 'TestAlert',
      }),
    );
  });

  it('rejects a missing secret', async () => {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(response.status).toBe(401);
  });

  it('rejects malformed Grafana data', async () => {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'firing', alerts: [] }),
    });
    expect(response.status).toBe(400);
  });
});
