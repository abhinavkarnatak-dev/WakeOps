import { describe, expect, it } from 'vitest';
import {
  generateGrafanaWebhookSecret,
  hashGrafanaWebhookSecret,
  matchesGrafanaWebhookSecret,
} from './grafana-secret.js';

describe('Grafana webhook secrets', () => {
  it('generates different high-entropy secrets', () => {
    const first = generateGrafanaWebhookSecret();
    const second = generateGrafanaWebhookSecret();
    expect(first).toMatch(/^wakeops_grafana_[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  it('matches only the original secret', () => {
    const secret = generateGrafanaWebhookSecret();
    const hash = hashGrafanaWebhookSecret(secret);
    expect(matchesGrafanaWebhookSecret(secret, hash)).toBe(true);
    expect(matchesGrafanaWebhookSecret(`${secret}x`, hash)).toBe(false);
  });
});
