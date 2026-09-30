import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../apps/api/src/app';
import { generateGrafanaWebhookSecret, hashGrafanaWebhookSecret } from '@wakeops/integrations';

const database = new PrismaClient();
afterAll(() => database.$disconnect());

const payload = {
  receiver: 'wakeops-integration-test',
  status: 'firing',
  alerts: [
    {
      status: 'firing',
      labels: { alertname: 'DatabaseWebhookTest' },
      annotations: { summary: 'Integration test' },
    },
  ],
};

describe('organization Grafana authentication', () => {
  it('accepts only the secret generated for that organization', async () => {
    const organization = await database.organization.create({
      data: { name: 'Grafana Test', slug: randomUUID() },
    });
    const secret = generateGrafanaWebhookSecret();
    await database.grafanaIntegration.create({
      data: {
        organizationId: organization.id,
        secretHash: hashGrafanaWebhookSecret(secret),
        secretHint: secret.slice(-6),
      },
    });
    const server = createApp().listen(0);

    try {
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Test server has no TCP port.');
      const endpoint = `http://127.0.0.1:${address.port}/webhooks/grafana/${organization.id}`;

      const rejected = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-secret', 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(rejected.status).toBe(401);

      const accepted = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(accepted.status).toBe(202);

      const integration = await database.grafanaIntegration.findUnique({
        where: { organizationId: organization.id },
      });
      const receipt = await database.monitoringWebhookTest.findFirst({
        where: { organizationId: organization.id },
      });
      expect(integration?.lastVerifiedAt).toBeInstanceOf(Date);
      expect(receipt?.alertName).toBe('DatabaseWebhookTest');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.organization.delete({ where: { id: organization.id } });
    }
  });
});
