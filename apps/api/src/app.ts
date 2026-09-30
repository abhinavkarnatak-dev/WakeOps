import express from 'express';
import { pinoHttp } from 'pino-http';
import { database } from '@wakeops/database';
import { matchesGrafanaWebhookSecret, normalizeGrafanaWebhook } from '@wakeops/integrations';
import { processAlerts } from '@wakeops/incidents';

import { createGrafanaWebhookRouter } from './grafana-webhook.js';
import { syncIncidentWorkflows } from './incident-workflow.js';
import { logger } from './logger.js';
import { twilioWebhookDependencies } from './twilio-calls.js';
import { createTwilioWebhookRouter, type TwilioWebhookDependencies } from './twilio-webhook.js';

type AppOptions = {
  authenticateGrafanaWebhook?: Parameters<typeof createGrafanaWebhookRouter>[0]['authenticate'];
  recordGrafanaTest?: Parameters<typeof createGrafanaWebhookRouter>[0]['recordTest'];
  processGrafanaAlerts?: Parameters<typeof createGrafanaWebhookRouter>[0]['processAlerts'];
  twilioWebhooks?: TwilioWebhookDependencies;
};

async function authenticateGrafanaWebhook(organizationId: string, secret: string) {
  const integration = await database.grafanaIntegration.findUnique({
    where: { organizationId },
    select: { secretHash: true },
  });
  return integration ? matchesGrafanaWebhookSecret(secret, integration.secretHash) : false;
}

async function recordGrafanaTest(
  organizationId: string,
  summary: {
    receiver: string | null;
    status: string;
    alertCount: number;
    alertName: string | null;
    payloadPreview: {
      receiver: string | null;
      status: 'firing' | 'resolved';
      commonLabels: Record<string, string>;
      commonAnnotations: Record<string, string>;
      alerts: Array<{
        status: 'firing' | 'resolved';
        labels: Record<string, string>;
        annotations: Record<string, string>;
        startsAt: string | null;
        endsAt: string | null;
      }>;
    };
  },
) {
  const organization = await database.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) return false;
  await database.$transaction([
    database.monitoringWebhookTest.deleteMany({
      where: { organizationId, source: 'GRAFANA' },
    }),
    database.monitoringWebhookTest.create({
      data: { organizationId, source: 'GRAFANA', ...summary },
    }),
    database.grafanaIntegration.update({
      where: { organizationId },
      data: { lastVerifiedAt: new Date() },
    }),
  ]);
  return true;
}

async function processGrafanaAlerts(organizationId: string, payload: unknown) {
  const alerts = normalizeGrafanaWebhook(payload, organizationId);
  const results = await processAlerts(database, alerts);
  await syncIncidentWorkflows(alerts, results);
  return results;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(request) {
          request.url = request.url?.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
          return request;
        },
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/webhooks/grafana',
    createGrafanaWebhookRouter({
      authenticate: options.authenticateGrafanaWebhook ?? authenticateGrafanaWebhook,
      recordTest: options.recordGrafanaTest ?? recordGrafanaTest,
      processAlerts: options.processGrafanaAlerts ?? processGrafanaAlerts,
    }),
  );

  app.use(
    '/webhooks/twilio',
    createTwilioWebhookRouter(options.twilioWebhooks ?? twilioWebhookDependencies),
  );

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'wakeops-api' });
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  return app;
}
