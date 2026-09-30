'use server';

import { database } from '@wakeops/database';
import {
  generateGrafanaWebhookSecret,
  hashGrafanaWebhookSecret,
} from '@wakeops/integrations/grafana-secret';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/lib/organization';

export type GrafanaConnectionState = {
  error?: string;
  success?: string;
  secret?: string;
};

export async function manageGrafanaConnection(
  _state: GrafanaConnectionState,
  form: FormData,
): Promise<GrafanaConnectionState> {
  const membership = await requireOrganization();
  if (membership.role !== 'ADMIN') {
    return { error: 'Only organization admins can change integrations.' };
  }

  const operation = form.get('operation');
  if (operation !== 'generate' && operation !== 'rotate' && operation !== 'disconnect') {
    return { error: 'Choose a supported Grafana action.' };
  }

  try {
    if (operation === 'disconnect') {
      await database.$transaction([
        database.monitoringWebhookTest.deleteMany({
          where: { organizationId: membership.organizationId, source: 'GRAFANA' },
        }),
        database.grafanaIntegration.deleteMany({
          where: { organizationId: membership.organizationId },
        }),
      ]);
      revalidatePath('/dashboard/integrations');
      return { success: 'Grafana disconnected. The previous secret no longer works.' };
    }

    const secret = generateGrafanaWebhookSecret();
    await database.$transaction([
      database.monitoringWebhookTest.deleteMany({
        where: { organizationId: membership.organizationId, source: 'GRAFANA' },
      }),
      database.grafanaIntegration.upsert({
        where: { organizationId: membership.organizationId },
        create: {
          organizationId: membership.organizationId,
          secretHash: hashGrafanaWebhookSecret(secret),
          secretHint: secret.slice(-6),
        },
        update: {
          secretHash: hashGrafanaWebhookSecret(secret),
          secretHint: secret.slice(-6),
          lastVerifiedAt: null,
        },
      }),
    ]);
    revalidatePath('/dashboard/integrations');
    return {
      success:
        operation === 'rotate'
          ? 'Secret rotated. Update the credentials in Grafana.'
          : 'Grafana credentials generated.',
      secret,
    };
  } catch {
    return { error: 'Could not update the Grafana integration. Try again.' };
  }
}
