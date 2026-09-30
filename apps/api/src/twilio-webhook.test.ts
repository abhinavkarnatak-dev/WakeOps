import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';

const callSid = `CA${'a'.repeat(32)}`;
const voiceMessage = vi.fn(async () => 'Critical incident for payments production.');
const recordStatus = vi.fn(async () => true);
const server = createApp({
  twilioWebhooks: {
    validate: (_path, signature) => signature === 'valid-signature',
    validateTrialVoice: (_callAttemptId, token) => token === 'a'.repeat(64),
    trialMode: false,
    voiceMessage,
    recordStatus,
    voiceXml: (message) => `<Response><Say>${message}</Say></Response>`,
  },
}).listen(0);

const trialServer = createApp({
  twilioWebhooks: {
    validate: () => false,
    validateTrialVoice: (_callAttemptId, token) => token === 'a'.repeat(64),
    trialMode: true,
    voiceMessage,
    recordStatus,
    voiceXml: (message) => `<Response><Say>${message}</Say></Response>`,
  },
}).listen(0);

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });
  await new Promise<void>((resolve) => {
    if (trialServer.listening) resolve();
    else trialServer.once('listening', resolve);
  });
});

afterAll(() => {
  server.close();
  trialServer.close();
});

function endpoint(path: string, target = server) {
  const address = target.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP port.');
  return `http://127.0.0.1:${address.port}${path}`;
}

describe('Twilio webhooks', () => {
  it('returns deterministic TwiML for an authenticated call', async () => {
    const response = await fetch(endpoint('/webhooks/twilio/voice/call-1'), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': 'valid-signature',
      },
      body: new URLSearchParams({ CallSid: callSid }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/xml');
    expect(await response.text()).toContain('Critical incident for payments production.');
    expect(voiceMessage).toHaveBeenCalledWith('call-1', callSid);
  });

  it('records authenticated call status callbacks', async () => {
    const response = await fetch(endpoint('/webhooks/twilio/status/call-1'), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': 'valid-signature',
      },
      body: new URLSearchParams({ CallSid: callSid, CallStatus: 'ringing' }),
    });
    expect(response.status).toBe(204);
    expect(recordStatus).toHaveBeenCalledWith('call-1', callSid, 'ringing');
  });

  it('accepts a trial voice request with its per-call token', async () => {
    const response = await fetch(
      endpoint(`/webhooks/twilio/voice/call-1?token=${'a'.repeat(64)}`, trialServer),
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ CallSid: callSid }),
      },
    );
    expect(response.status).toBe(200);
  });

  it('rejects an invalid trial voice token', async () => {
    const response = await fetch(
      endpoint(`/webhooks/twilio/voice/call-1?token=${'b'.repeat(64)}`, trialServer),
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ CallSid: callSid }),
      },
    );
    expect(response.status).toBe(403);
  });

  it('rejects an invalid Twilio signature', async () => {
    const response = await fetch(endpoint('/webhooks/twilio/status/call-1'), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': 'invalid-signature',
      },
      body: new URLSearchParams({ CallSid: callSid, CallStatus: 'completed' }),
    });
    expect(response.status).toBe(403);
  });
});
