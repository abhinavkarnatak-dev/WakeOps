import { createApp } from './app.js';
import { config } from './config.js';
import { reconcileAcknowledgedIncidentWorkflows } from './incident-workflow.js';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'WakeOps API is listening');
  void reconcileAcknowledgedIncidentWorkflows().catch((error) => {
    logger.error({ error }, 'Could not reconcile acknowledged incident workflows');
  });
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down API');
  server.close((error) => {
    if (error) {
      logger.error({ error }, 'API shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
