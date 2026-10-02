import { describe, expect, it, vi } from 'vitest';

import {
  createResendEmailProvider,
  decryptSecret,
  encryptSecret,
  formatIncidentStartTime,
  incidentReference,
  slackClientMessageId,
  slackIncidentMessage,
} from './index.js';

describe('notification helpers', () => {
  it('encrypts and decrypts provider secrets', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const encrypted = encryptSecret('xoxb-private-token', key);
    expect(encrypted).not.toContain('xoxb-private-token');
    expect(decryptSecret(encrypted, key)).toBe('xoxb-private-token');
  });

  it('creates a stable Slack client message id', () => {
    const first = slackClientMessageId('incident-1');
    expect(first).toBe(slackClientMessageId('incident-1'));
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('formats incident start times in IST', () => {
    expect(formatIncidentStartTime('2026-10-01T15:00:00.000Z')).toBe('1 Oct 2026, 8:30 pm IST');
  });

  it('creates a clean Slack incident message', () => {
    const message = slackIncidentMessage({
      eventId: 'event-1',
      incidentId: 'cmupoceod000jhf6kulz5kzjp',
      organizationId: 'org-1',
      alertName: 'PollingTest5',
      severity: 'CRITICAL',
      application: 'auth-service',
      environment: 'production',
      resource: 'i-111',
      value: '10',
      startedAt: '2026-10-01T15:00:00.000Z',
      dashboardUrl: 'https://wakeops.example/incidents/1',
    });
    expect(incidentReference('cmupoceod000jhf6kulz5kzjp')).toBe('INC-ULZ5KZJP');
    expect(JSON.stringify(message)).toContain('Open Incident INC-ULZ5KZJP');
    expect(JSON.stringify(message)).toContain('Reported value');
    expect(JSON.stringify(message)).not.toContain("metric='foo'");
  });

  it('formats incident emails with the public reference and WakeOps styling', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email-1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await createResendEmailProvider('re_test', 'WakeOps <noreply@example.com>').sendIncident(
      'engineer@example.com',
      {
        eventId: 'event-1',
        incidentId: 'cmupoceod000jhf6kulz5kzjp',
        organizationId: 'org-1',
        alertName: 'Checkout API 5xx spike',
        severity: 'CRITICAL',
        application: 'checkout-api',
        environment: 'production',
        resource: 'i-123',
        value: '8.7%',
        startedAt: '2026-10-01T15:00:00.000Z',
        dashboardUrl: 'https://wakeops.example/incidents/1',
      },
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload.subject).toContain('INC-ULZ5KZJP');
    expect(payload.html).toContain('INC-ULZ5KZJP');
    expect(payload.html).not.toContain('cmupoceod000jhf6kulz5kzjp');
    expect(payload.html).toContain('background:#b6fb45');
    expect(payload.html).toContain('Open incident</a>');
    expect(payload.html).toContain('1 Oct 2026, 8:30 pm IST');
  });
});
