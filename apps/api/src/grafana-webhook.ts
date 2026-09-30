import { Router } from 'express';
import { parseGrafanaWebhook, type GrafanaWebhookSummary } from '@wakeops/integrations';
import type { AlertProcessingResult } from '@wakeops/incidents';
import { z } from 'zod';

type Dependencies = {
  authenticate: (organizationId: string, secret: string) => Promise<boolean>;
  recordTest: (organizationId: string, summary: GrafanaWebhookSummary) => Promise<boolean>;
  processAlerts: (organizationId: string, payload: unknown) => Promise<AlertProcessingResult[]>;
};

const organizationIdSchema = z.string().min(1).max(100);

function bearerSecret(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return null;
  const secret = header.slice(7).trim();
  return secret || null;
}

export function createGrafanaWebhookRouter({
  authenticate,
  recordTest,
  processAlerts,
}: Dependencies) {
  const router = Router();

  router.post('/:organizationId', async (request, response) => {
    const organizationId = organizationIdSchema.safeParse(request.params.organizationId);
    if (!organizationId.success) {
      response.status(400).json({ error: 'Invalid organization identifier.' });
      return;
    }

    const secret = bearerSecret(request.get('authorization'));
    if (!secret || !(await authenticate(organizationId.data, secret))) {
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
      const saved = await recordTest(organizationId.data, summary);
      if (!saved) {
        response.status(404).json({ error: 'Organization not found.' });
        return;
      }
      const results = await processAlerts(organizationId.data, request.body);
      request.log.info(
        {
          organizationId: organizationId.data,
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
      request.log.error({ error, organizationId: organizationId.data }, 'Grafana webhook failed');
      response.status(500).json({ error: 'Could not record the Grafana webhook.' });
    }
  });

  return router;
}
