import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const workerConfigSchema = z.object({
  TEMPORAL_ADDRESS: z.string().min(1),
  TEMPORAL_NAMESPACE: z.string().min(1),
  TEMPORAL_API_KEY: z.string().min(1),
  TEMPORAL_TASK_QUEUE: z.string().min(1).default('wakeops-incidents'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_PHONE_NUMBER: optionalString,
  TWILIO_WEBHOOK_BASE_URL: optionalUrl,
  TWILIO_TRIAL_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const workerConfig = workerConfigSchema.parse(process.env);

export function requireTwilioConfig() {
  const values = {
    accountSid: workerConfig.TWILIO_ACCOUNT_SID,
    authToken: workerConfig.TWILIO_AUTH_TOKEN,
    phoneNumber: workerConfig.TWILIO_PHONE_NUMBER,
    webhookBaseUrl: workerConfig.TWILIO_WEBHOOK_BASE_URL,
    trialMode: workerConfig.TWILIO_TRIAL_MODE,
  };
  if (!values.accountSid || !values.authToken || !values.phoneNumber || !values.webhookBaseUrl) {
    throw new Error('Twilio calling is not configured.');
  }
  return {
    accountSid: values.accountSid,
    authToken: values.authToken,
    phoneNumber: values.phoneNumber,
    webhookBaseUrl: values.webhookBaseUrl.replace(/\/$/, ''),
    trialMode: values.trialMode,
  };
}
