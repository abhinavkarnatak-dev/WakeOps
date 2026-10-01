import { Router } from 'express';
import { parseGrafanaWebhook, type GrafanaWebhookSummary } from '@wakeops/integrations';
import type { AlertProcessingResult } from '@wakeops/incidents';
import { z } from 'zod';

type Dependencies = {
  resolveOrganizationId: (organizationKey: string) => Promise<string | null>;
  authenticate: (organizationId: string, secret: string) => Promise<boolean>;
  recordTest: (organizationId: string, summary: GrafanaWebhookSummary) => Promise<boolean>;
  processAlerts: (organizationId: string, payload: unknown) => Promise<AlertProcessingResult[]>;
};

const organizationKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/);

function bearerSecret(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return null;
  const secret = header.slice(7).trim();
  return secret || null;
}

export function createGrafanaWebhookRouter({
  resolveOrganizationId,
  authenticate,
  recordTest,
  processAlerts,
}: Dependencies) {
  const router = Router();

  router.post('/:organizationKey', async (request, response) => {
    const organizationKey = organizationKeySchema.safeParse(request.params.organizationKey);
    if (!organizationKey.success) {
      response.status(400).json({ error: 'Invalid organization identifier.' });
      return;
    }

    const organizationId = await resolveOrganizationId(organizationKey.data);
    const secret = bearerSecret(request.get('authorization'));
    if (!organizationId || !secret || !(await authenticate(organizationId, secret))) {
      response.status(401).json({ error: 'Invalid Grafana webhook credentials.' });
      return;
    }

    let summary: GrafanaWebhookSummary;
    try {
      summary = parseGrafanaWebhook(request.body);
    } catch {
      response.status(400).json({ error: 'Invalid Grafana webhook payload.' });
      return;
    }

    try {
      const saved = await recordTest(organizationId, summary);
      if (!saved) {
        response.status(404).json({ error: 'Organization not found.' });
        return;
      }
      const results = await processAlerts(organizationId, request.body);
      request.log.info(
        {
          organizationId,
          organizationKey: organizationKey.data,
          source: 'GRAFANA',
          status: summary.status,
          alertCount: summary.alertCount,
          alertName: summary.alertName,
          outcomes: results.map((result) => result.outcome),
        },
        'Grafana webhook received',
      );
      response.status(202).json({ accepted: true, processedAlerts: results.length });
    } catch (error) {
      request.log.error(
        { error, organizationId, organizationKey: organizationKey.data },
        'Grafana webhook failed',
      );
      response.status(500).json({ error: 'Could not record the Grafana webhook.' });
    }
  });

  return router;
}
