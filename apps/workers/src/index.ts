import { fileURLToPath } from 'node:url';

import { NativeConnection, Worker } from '@temporalio/worker';
import pino from 'pino';

import { incidentActivities } from './activities.js';
import { workerConfig } from './config.js';
import { startNotificationConsumers } from './notification-queue.js';

const logger = pino({
  level: workerConfig.LOG_LEVEL,
  base: { service: 'wakeops-workers' },
});

async function run() {
  await startNotificationConsumers(logger);
  const connection = await NativeConnection.connect({
    address: workerConfig.TEMPORAL_ADDRESS,
    tls: true,
    apiKey: workerConfig.TEMPORAL_API_KEY,
  });
  const workflowFile = import.meta.url.endsWith('.ts') ? './workflows.ts' : './workflows.js';
  const worker = await Worker.create({
    connection,
    namespace: workerConfig.TEMPORAL_NAMESPACE,
    taskQueue: workerConfig.TEMPORAL_TASK_QUEUE,
    workflowsPath: fileURLToPath(new URL(workflowFile, import.meta.url)),
    activities: incidentActivities,
  });

  logger.info(
    {
      namespace: workerConfig.TEMPORAL_NAMESPACE,
      taskQueue: workerConfig.TEMPORAL_TASK_QUEUE,
      callPolicy: 'primary-2-secondary-2-complete-on-ack',
    },
    'Temporal worker started',
  );
  await worker.run();
}

run().catch((error) => {
  logger.fatal({ error }, 'Temporal worker stopped unexpectedly');
  process.exitCode = 1;
});
