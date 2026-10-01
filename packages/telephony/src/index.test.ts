import { describe, expect, it } from 'vitest';

import {
  advanceCallStatus,
  createTrialVoiceToken,
  incidentVoiceXml,
  normalizeTwilioCallStatus,
  twilioCallRequest,
  validateTrialVoiceToken,
} from './index.js';

describe('Twilio telephony helpers', () => {
  it('omits unsupported call options in trial mode', () => {
    const input = {
      to: '+910000000000',
      from: '+10000000000',
      voiceUrl: 'https://example.com/voice',
      statusCallbackUrl: 'https://example.com/status',
      ringTimeoutSeconds: 30,
    };
    expect(twilioCallRequest(input, true)).not.toHaveProperty('timeout');
    expect(twilioCallRequest(input, false)).toMatchObject({
      timeout: 30,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });
  });

  it.each([
    ['queued', 'QUEUED'],
    ['ringing', 'RINGING'],
    ['in-progress', 'IN_PROGRESS'],
    ['completed', 'COMPLETED'],
    ['busy', 'BUSY'],
    ['no-answer', 'NO_ANSWER'],
    ['canceled', 'CANCELED'],
    ['unknown', 'FAILED'],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(normalizeTwilioCallStatus(input)).toBe(expected);
  });

  it('escapes incident text in TwiML', () => {
    const xml = incidentVoiceXml('Payments < production & critical');
    expect(xml).toContain('Payments &lt; production &amp; critical');
    expect(xml).toContain('<Say');
  });

  it('does not regress or reopen call statuses', () => {
    expect(advanceCallStatus('RINGING', 'QUEUED')).toBe('RINGING');
    expect(advanceCallStatus('COMPLETED', 'RINGING')).toBe('COMPLETED');
    expect(advanceCallStatus('RINGING', 'NO_ANSWER')).toBe('NO_ANSWER');
  });

  it('authenticates trial voice URLs without exposing the auth token', () => {
    const token = createTrialVoiceToken('secret-token', 'call-1');
    expect(token).toHaveLength(64);
    expect(token).not.toContain('secret-token');
    expect(validateTrialVoiceToken('secret-token', 'call-1', token)).toBe(true);
    expect(validateTrialVoiceToken('secret-token', 'call-2', token)).toBe(false);
  });
});
