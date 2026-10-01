'use server';

import { randomUUID } from 'node:crypto';

import { database } from '@wakeops/database';
import { createResendEmailProvider } from '@wakeops/notifications';
import { revalidatePath } from 'next/cache';

import { requireOrganization } from '@/lib/organization';
import { decryptSlackToken, slackChannels } from '@/lib/slack';

export type NotificationActionState = { error?: string; success?: string };

function slackTestError(code: string | undefined, channelName: string) {
  if (code === 'not_in_channel') {
    return `WakeOps is not in #${channelName}. Run /invite @WakeOps in that channel.`;
  }
  if (code === 'channel_not_found') return 'Slack could not find the selected channel.';
  if (code === 'missing_scope') return 'Slack permissions changed. Reconnect the workspace.';
  if (code === 'invalid_auth' || code === 'token_revoked') {
    return 'The Slack connection is no longer valid. Reconnect the workspace.';
  }
  if (code === 'ratelimited') return 'Slack is temporarily rate limiting messages. Try again soon.';
  return 'Slack could not send the test message.';
}

export async function saveSlackDestination(
  _state: NotificationActionState,
  form: FormData,
): Promise<NotificationActionState> {
  void _state;
  const membership = await requireOrganization();
  if (membership.role !== 'ADMIN') return { error: 'Only admins can change Slack settings.' };
  const channelId = String(form.get('channelId') ?? '');
  const installation = await database.slackInstallation.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!installation) return { error: 'Connect Slack first.' };
  try {
    const channels = await slackChannels(installation.accessTokenEncrypted);
    const selected = channels.find((channel) => channel.id === channelId);
    if (!selected) return { error: 'Choose an available Slack channel.' };
    await database.slackDestination.upsert({
      where: { organizationId: membership.organizationId },
      create: {
        organizationId: membership.organizationId,
        installationId: installation.id,
        channelId: selected.id,
        channelName: selected.name,
      },
      update: {
        installationId: installation.id,
        channelId: selected.id,
        channelName: selected.name,
      },
    });
    revalidatePath('/dashboard/integrations');
    return { success: `Slack alerts will go to #${selected.name}.` };
  } catch {
    return { error: 'Slack channels could not be loaded. Reconnect Slack and try again.' };
  }
}

export async function disconnectSlack(
  _state: NotificationActionState,
  _form: FormData,
): Promise<NotificationActionState> {
  void _state;
  void _form;
  const membership = await requireOrganization();
  if (membership.role !== 'ADMIN') return { error: 'Only admins can disconnect Slack.' };
  await database.slackInstallation.deleteMany({
    where: { organizationId: membership.organizationId },
  });
  revalidatePath('/dashboard/integrations');
  return { success: 'Slack disconnected.' };
}

export async function testSlack(
  _state: NotificationActionState,
  _form: FormData,
): Promise<NotificationActionState> {
  void _state;
  void _form;
  const membership = await requireOrganization();
  const installation = await database.slackInstallation.findUnique({
    where: { organizationId: membership.organizationId },
    include: { destinations: true },
  });
  const destination = installation?.destinations[0];
  if (!installation || !destination) return { error: 'Connect Slack and choose a channel first.' };
  try {
    const token = decryptSlackToken(installation.accessTokenEncrypted);
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: destination.channelId,
        text: 'WakeOps test successful. Incident alerts can reach this channel.',
      }),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) {
      return { error: slackTestError(body.error, destination.channelName) };
    }
    return { success: `Test message sent to #${destination.channelName}.` };
  } catch {
    return { error: 'Slack could not be reached. Check the connection and try again.' };
  }
}

export async function testEmail(
  _state: NotificationActionState,
  _form: FormData,
): Promise<NotificationActionState> {
  void _state;
  void _form;
  const membership = await requireOrganization();
  const engineer = await database.engineer.findFirst({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: 'asc' },
  });
  if (!engineer) return { error: 'Add an engineer before testing email.' };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { error: 'Add RESEND_API_KEY and EMAIL_FROM first.' };
  try {
    await createResendEmailProvider(apiKey, from).sendIncident(engineer.email, {
      eventId: `email-test-${randomUUID()}`,
      incidentId: `TEST-${randomUUID()}`,
      organizationId: membership.organizationId,
      alertName: 'WakeOps email test',
      severity: 'INFO',
      application: 'test-service',
      environment: 'test',
      resource: 'test-resource',
      value: 'Connection successful',
      startedAt: new Date().toISOString(),
      dashboardUrl: `${process.env.WEB_URL ?? 'http://localhost:3000'}/dashboard/integrations`,
    });
    return { success: `Test email sent to ${engineer.email}.` };
  } catch {
    return { error: 'Resend could not send the test email. Check the API key and sender address.' };
  }
}
