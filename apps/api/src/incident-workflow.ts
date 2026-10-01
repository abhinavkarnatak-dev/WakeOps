import { WorkflowExecutionAlreadyStartedError, WorkflowNotFoundError } from '@temporalio/client';
import type { AlertNormalizationResult } from '@wakeops/alerts';
import { database } from '@wakeops/database';
import type { AlertProcessingResult } from '@wakeops/incidents';
import {
  INCIDENT_ACKNOWLEDGED_SIGNAL,
  INCIDENT_CALL_COMPLETED_SIGNAL,
  INCIDENT_RESOLVED_SIGNAL,
  INCIDENT_WORKFLOW_NAME,
  type IncidentAcknowledgement,
  type IncidentCallResult,
  incidentWorkflowId,
} from '@wakeops/workflows/contracts';

import { getTemporalClient, temporalTaskQueue } from './temporal.js';

export type IncidentWorkflowAction = 'START' | 'RESOLVE' | 'NONE';

export function incidentWorkflowAction(
  alert: AlertNormalizationResult,
  result: AlertProcessingResult,
): IncidentWorkflowAction {
  if (!alert.ok || !result.incidentId) return 'NONE';
  if (alert.alert.status === 'RESOLVED') return 'RESOLVE';
  if (
    result.outcome === 'INCIDENT_CREATED' ||
    result.outcome === 'INCIDENT_UPDATED' ||
    result.outcome === 'DUPLICATE_DELIVERY'
  ) {
    return 'START';
  }
  return 'NONE';
}

async function ensureIncidentWorkflow(incidentId: string) {
  const client = await getTemporalClient();
  try {
    await client.workflow.start(INCIDENT_WORKFLOW_NAME, {
      workflowId: incidentWorkflowId(incidentId),
      taskQueue: temporalTaskQueue(),
      args: [{ incidentId }],
      workflowIdConflictPolicy: 'USE_EXISTING',
      workflowIdReusePolicy: 'REJECT_DUPLICATE',
    });
  } catch (error) {
    if (!(error instanceof WorkflowExecutionAlreadyStartedError)) throw error;
  }
}

async function resolveIncidentWorkflow(incidentId: string, resolvedAt: Date) {
  const client = await getTemporalClient();
  const workflowId = incidentWorkflowId(incidentId);
  const handle = client.workflow.getHandle(workflowId);

  try {
    await handle.describe();
  } catch (error) {
    if (!(error instanceof WorkflowNotFoundError)) throw error;
    await ensureIncidentWorkflow(incidentId);
  }

  const description = await handle.describe();
  if (description.status.name === 'RUNNING') {
    await handle.signal(INCIDENT_RESOLVED_SIGNAL, { resolvedAt: resolvedAt.toISOString() });
  }
}

export async function signalIncidentCallResult(incidentId: string, result: IncidentCallResult) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(incidentWorkflowId(incidentId));
  const description = await handle.describe();
  if (description.status.name === 'RUNNING') {
    await handle.signal(INCIDENT_CALL_COMPLETED_SIGNAL, result);
  }
}

export async function signalIncidentAcknowledgement(
  incidentId: string,
  acknowledgement: IncidentAcknowledgement,
) {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(incidentWorkflowId(incidentId));
  const description = await handle.describe();
  if (description.status.name === 'RUNNING') {
    await handle.signal(INCIDENT_ACKNOWLEDGED_SIGNAL, acknowledgement);
  }
}

export async function reconcileAcknowledgedIncidentWorkflows() {
  const incidents = await database.incident.findMany({
    where: { status: 'ACKNOWLEDGED', acknowledgedAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      acknowledgedAt: true,
      callAttempts: {
        where: { status: 'COMPLETED', answeredAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { engineer: { select: { name: true } } },
      },
    },
  });
  const client = await getTemporalClient();

  for (const incident of incidents) {
    const handle = client.workflow.getHandle(incidentWorkflowId(incident.id));
    try {
      const description = await handle.describe();
      if (description.status.name === 'RUNNING' && incident.acknowledgedAt) {
        await handle.signal(INCIDENT_ACKNOWLEDGED_SIGNAL, {
          acknowledgedBy: incident.callAttempts[0]?.engineer.name ?? 'Assigned engineer',
          channel: 'VOICE',
          acknowledgedAt: incident.acknowledgedAt.toISOString(),
        });
      }
    } catch (error) {
      if (!(error instanceof WorkflowNotFoundError)) throw error;
    }
  }
}

export async function syncIncidentWorkflows(
  alerts: AlertNormalizationResult[],
  results: AlertProcessingResult[],
) {
  for (const [index, result] of results.entries()) {
    const alert = alerts[index];
    if (!alert || !result.incidentId) continue;

    const action = incidentWorkflowAction(alert, result);
    if (action === 'START') {
      await ensureIncidentWorkflow(result.incidentId);
    } else if (action === 'RESOLVE') {
      const resolvedAt = alert.ok ? (alert.alert.endedAt ?? new Date()) : new Date();
      await resolveIncidentWorkflow(result.incidentId, resolvedAt);
    }
  }
}
