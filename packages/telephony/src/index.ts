import { createHmac, timingSafeEqual } from 'node:crypto';

import twilio from 'twilio';

export type TelephonyCallStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'CANCELED';

export type CreateCallInput = {
  to: string;
  from: string;
  voiceUrl: string;
  statusCallbackUrl: string;
};

export type CreateCallResult = {
  providerCallId: string;
  status: TelephonyCallStatus;
};

export interface TelephonyProvider {
  createCall(input: CreateCallInput): Promise<CreateCallResult>;
}

export function createTwilioProvider(
  accountSid: string,
  authToken: string,
  options: { trialMode?: boolean } = {},
): TelephonyProvider {
  const client = twilio(accountSid, authToken);
  return {
    async createCall(input) {
      const baseRequest = {
        to: input.to,
        from: input.from,
        url: input.voiceUrl,
        statusCallback: input.statusCallbackUrl,
      };
      const call = await client.calls.create(
        options.trialMode
          ? baseRequest
          : {
              ...baseRequest,
              method: 'POST',
              statusCallbackMethod: 'POST',
              statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            },
      );
      return {
        providerCallId: call.sid,
        status: normalizeTwilioCallStatus(call.status),
      };
    },
  };
}

export function normalizeTwilioCallStatus(status: string): TelephonyCallStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'queued' || normalized === 'initiated') return 'QUEUED';
  if (normalized === 'ringing') return 'RINGING';
  if (normalized === 'in-progress' || normalized === 'answered') return 'IN_PROGRESS';
  if (normalized === 'completed') return 'COMPLETED';
  if (normalized === 'busy') return 'BUSY';
  if (normalized === 'no-answer') return 'NO_ANSWER';
  if (normalized === 'canceled') return 'CANCELED';
  return 'FAILED';
}

const terminalStatuses = new Set<TelephonyCallStatus>([
  'COMPLETED',
  'FAILED',
  'NO_ANSWER',
  'BUSY',
  'CANCELED',
]);
const statusRank: Record<TelephonyCallStatus, number> = {
  CREATED: 0,
  QUEUED: 1,
  RINGING: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  FAILED: 4,
  NO_ANSWER: 4,
  BUSY: 4,
  CANCELED: 4,
};

export function advanceCallStatus(current: TelephonyCallStatus, incoming: TelephonyCallStatus) {
  if (terminalStatuses.has(current)) return current;
  if (terminalStatuses.has(incoming)) return incoming;
  return statusRank[incoming] >= statusRank[current] ? incoming : current;
}

export function isTerminalCallStatus(status: TelephonyCallStatus) {
  return terminalStatuses.has(status);
}

export function validateTwilioWebhook(
  authToken: string,
  signature: string,
  url: string,
  parameters: Record<string, string>,
) {
  return twilio.validateRequest(authToken, signature, url, parameters);
}

export function createTrialVoiceToken(authToken: string, callAttemptId: string) {
  return createHmac('sha256', authToken)
    .update(`wakeops:trial-voice:${callAttemptId}`)
    .digest('hex');
}

export function validateTrialVoiceToken(
  authToken: string,
  callAttemptId: string,
  candidate: string,
) {
  const expected = Buffer.from(createTrialVoiceToken(authToken, callAttemptId), 'hex');
  const received = Buffer.from(candidate, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function incidentVoiceXml(message: string) {
  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice: 'Polly.Aditi' }, message);
  response.pause({ length: 1 });
  return response.toString();
}
