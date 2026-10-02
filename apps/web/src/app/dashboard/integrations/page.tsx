import { database } from '@wakeops/database';
import { requireOrganization } from '@/lib/organization';
import { GrafanaConnection } from './grafana-connection';
import { CopyValueButton } from '@/components/copy-value-button';
import { EmailConnection, SlackConnection } from './notification-connections';
import { IntegrationCard } from './integration-card';
import { slackChannels } from '@/lib/slack';

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string }>;
}) {
  const membership = await requireOrganization();
  const [integration, slackInstallation] = await Promise.all([
    database.grafanaIntegration.findUnique({
      where: { organizationId: membership.organizationId },
      select: { secretHint: true, lastVerifiedAt: true },
    }),
    database.slackInstallation.findUnique({
      where: { organizationId: membership.organizationId },
      include: { destinations: true },
    }),
  ]);
  const query = await searchParams;
  let channels: { id: string; name: string }[] = [];
  if (slackInstallation) {
    try {
      channels = await slackChannels(slackInstallation.accessTokenEncrypted);
    } catch {
      channels = [];
    }
  }
  const slackNotices: Record<string, string> = {
    connected: 'Slack connected. Choose the channel that should receive incidents.',
    forbidden: 'Only an organization admin can connect Slack.',
    'config-error': 'Slack OAuth environment variables are not configured yet.',
    'oauth-error': 'Slack could not complete the connection. Try again.',
    'state-error': 'The Slack connection expired or failed its security check. Try again.',
  };
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const publicApiUrl = process.env.WEBHOOK_PUBLIC_BASE_URL ?? apiUrl;
  const webhookPath = `/webhooks/grafana/${membership.organization.slug}`;
  const webhookUrl = `${publicApiUrl.replace(/\/$/, '')}${webhookPath}`;

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const grafanaConfigured = Boolean(integration);
  const slackConfigured = Boolean(slackInstallation);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Connections</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
        Connect services
      </h1>
      <p className="mt-2 max-w-3xl text-zinc-500">
        Configure each provider in its own setup window. Service cards stay compact and show only
        the current connection state.
      </p>

      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        <IntegrationCard
          name="Email"
          service="email"
          description="Send incident details to the assigned on-call engineer through Resend."
          status={emailConfigured ? 'Connected' : 'Not connected'}
          tone={emailConfigured ? 'lime' : 'zinc'}
        >
          <EmailConnection configured={emailConfigured} />
          <div className="mt-6 rounded-xl border border-white/8 bg-black/20 p-4 text-sm leading-6 text-zinc-500">
            Email uses the platform&apos;s configured Resend sender. Organization engineers receive
            alerts at their saved email addresses.
          </div>
        </IntegrationCard>

        <IntegrationCard
          name="Slack"
          service="slack"
          description="Connect a workspace and route incident notifications to one selected channel."
          status={slackConfigured ? 'Connected' : 'Not connected'}
          tone={slackConfigured ? 'lime' : 'zinc'}
        >
          <SlackConnection
            connected={slackConfigured}
            teamName={slackInstallation?.teamName ?? null}
            destination={slackInstallation?.destinations[0]?.channelName ?? null}
            channels={channels}
            notice={query.slack ? (slackNotices[query.slack] ?? null) : null}
          />
        </IntegrationCard>

        <IntegrationCard
          name="Grafana"
          service="grafana"
          description="Create a secure webhook connection for Grafana alert notifications."
          status={grafanaConfigured ? 'Connected' : 'Not connected'}
          tone={grafanaConfigured ? 'lime' : 'zinc'}
        >
          <GrafanaConnection
            configured={grafanaConfigured}
            secretHint={integration?.secretHint ?? null}
            lastVerifiedAt={integration?.lastVerifiedAt?.toISOString() ?? null}
          />
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="font-semibold text-white">1. Copy the webhook URL</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Grafana Cloud requires a public HTTPS URL. This endpoint belongs to the current
                WakeOps organization.
              </p>
              <div className="relative mt-3">
                <code className="block overflow-x-auto rounded-lg bg-black/40 p-3 pr-12 text-xs text-lime-300">
                  {webhookUrl}
                </code>
                <CopyValueButton
                  value={webhookUrl}
                  label="Copy Grafana webhook URL"
                  successMessage="Grafana webhook URL copied."
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                />
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="font-semibold text-white">2. Create the Grafana contact point</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-400">
                <li>Open Alerts and IRM, then Alerting.</li>
                <li>Open Notification configuration, then Contact points.</li>
                <li>Create a contact point and select Webhook.</li>
                <li>Paste the webhook URL and select POST.</li>
                <li>Set Authentication Header Scheme to Bearer.</li>
                <li>Generate WakeOps credentials and copy the displayed secret.</li>
                <li>Paste it into Authentication Header Credentials.</li>
              </ol>
            </div>
          </div>
        </IntegrationCard>
      </div>

    </div>
  );
}
