import { z } from 'zod';

const workerConfigSchema = z.object({
  TEMPORAL_ADDRESS: z.string().min(1),
  TEMPORAL_NAMESPACE: z.string().min(1),
  TEMPORAL_API_KEY: z.string().min(1),
  TEMPORAL_TASK_QUEUE: z.string().min(1).default('wakeops-incidents'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export const workerConfig = workerConfigSchema.parse(process.env);
