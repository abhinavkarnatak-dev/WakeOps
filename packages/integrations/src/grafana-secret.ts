import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateGrafanaWebhookSecret() {
  return `wakeops_grafana_${randomBytes(32).toString('base64url')}`;
}

export function hashGrafanaWebhookSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function matchesGrafanaWebhookSecret(secret: string, expectedHash: string) {
  const provided = Buffer.from(hashGrafanaWebhookSecret(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
