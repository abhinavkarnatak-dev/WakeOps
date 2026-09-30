import { Client, Connection } from '@temporalio/client';
import { z } from 'zod';

const temporalConfigSchema = z.object({
  TEMPORAL_ADDRESS: z.string().min(1),
  TEMPORAL_NAMESPACE: z.string().min(1),
  TEMPORAL_API_KEY: z.string().min(1),
  TEMPORAL_TASK_QUEUE: z.string().min(1).default('wakeops-incidents'),
});

let clientPromise: Promise<Client> | null = null;

export function temporalTaskQueue() {
  return temporalConfigSchema.parse(process.env).TEMPORAL_TASK_QUEUE;
}

export function getTemporalClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const temporalConfig = temporalConfigSchema.parse(process.env);
      const connection = await Connection.connect({
        address: temporalConfig.TEMPORAL_ADDRESS,
        tls: true,
        apiKey: temporalConfig.TEMPORAL_API_KEY,
      });
      return new Client({
        connection,
        namespace: temporalConfig.TEMPORAL_NAMESPACE,
      });
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}
