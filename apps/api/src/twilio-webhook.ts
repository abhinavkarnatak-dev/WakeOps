import { Router } from 'express';
import { z } from 'zod';

type TwilioParameters = Record<string, string>;

export type TwilioWebhookDependencies = {
  validate: (path: string, signature: string, parameters: TwilioParameters) => boolean;
  validateTrialVoice: (callAttemptId: string, token: string) => boolean;
  trialMode: boolean;
  voiceMessage: (callAttemptId: string, providerCallId: string) => Promise<string | null>;
  recordStatus: (
    callAttemptId: string,
    providerCallId: string,
    providerStatus: string,
  ) => Promise<boolean>;
  voiceXml: (message: string) => string;
};

const callAttemptIdSchema = z.string().min(1).max(100);
const callSidSchema = z.string().regex(/^CA[0-9a-fA-F]{32}$/);

function parameters(body: unknown): TwilioParameters | null {
  if (!body || typeof body !== 'object') return null;
  const entries = Object.entries(body).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(entries);
}

export function createTwilioWebhookRouter(dependencies: TwilioWebhookDependencies) {
  const router = Router();

  router.post('/voice/:callAttemptId', async (request, response) => {
    const callAttemptId = callAttemptIdSchema.safeParse(request.params.callAttemptId);
    const body = parameters(request.body);
    const callSid = callSidSchema.safeParse(body?.CallSid);
    const signature = request.get('x-twilio-signature');
    const trialToken = z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .safeParse(request.query.token);
    const authenticated = dependencies.trialMode
      ? trialToken.success &&
        callAttemptId.success &&
        dependencies.validateTrialVoice(callAttemptId.data, trialToken.data)
      : Boolean(signature && body && dependencies.validate(request.originalUrl, signature, body));
    if (!callAttemptId.success || !body || !callSid.success || !authenticated) {
      response.status(403).send('Invalid Twilio request.');
      return;
    }
    const message = await dependencies.voiceMessage(callAttemptId.data, callSid.data);
    if (!message) {
      response.status(404).send('Call attempt not found.');
      return;
    }
    response.type('text/xml').send(dependencies.voiceXml(message));
  });

  router.post('/status/:callAttemptId', async (request, response) => {
    const callAttemptId = callAttemptIdSchema.safeParse(request.params.callAttemptId);
    const body = parameters(request.body);
    const callSid = callSidSchema.safeParse(body?.CallSid);
    const callStatus = z.string().min(1).max(50).safeParse(body?.CallStatus);
    const signature = request.get('x-twilio-signature');
    if (
      !callAttemptId.success ||
      !body ||
      !callSid.success ||
      !callStatus.success ||
      !signature ||
      !dependencies.validate(request.originalUrl, signature, body)
    ) {
      response.status(403).send('Invalid Twilio request.');
      return;
    }
    const saved = await dependencies.recordStatus(
      callAttemptId.data,
      callSid.data,
      callStatus.data,
    );
    response.sendStatus(saved ? 204 : 404);
  });

  return router;
}
