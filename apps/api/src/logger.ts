import pino from 'pino';

import { config } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: 'wakeops-api',
    environment: config.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-twilio-signature',
      'req.query.token',
      '*.accessToken',
      '*.refreshToken',
      '*.phoneNumber',
    ],
    censor: '[REDACTED]',
  },
});
