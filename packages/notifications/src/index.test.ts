import { describe, expect, it } from 'vitest';

import {
  decryptSecret,
  encryptSecret,
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
});
