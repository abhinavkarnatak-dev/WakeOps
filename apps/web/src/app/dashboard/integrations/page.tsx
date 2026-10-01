import { database } from '@wakeops/database';
import { requireOrganization } from '@/lib/organization';
import { GrafanaConnection } from './grafana-connection';
import { CopyValueButton } from '@/components/copy-value-button';
import {
  GrafanaTestStatus,
  type GrafanaPayloadPreview,
  type GrafanaProcessingResult,
} from './grafana-test-status';
import { EmailConnection, SlackConnection } from './notification-connections';
import { IntegrationCard } from './integration-card';
import { slackChannels } from '@/lib/slack';

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string }>;
}) {
  const membership = await requireOrganization();
  const [integration, receipt, processing, sampleMapping, slackInstallation] = await Promise.all([
    database.grafanaIntegration.findUnique({
      where: { organizationId: membership.organizationId },
      select: { secretHint: true, lastVerifiedAt: true },
    }),
    database.monitoringWebhookTest.findFirst({
      where: { organizationId: membership.organizationId, source: 'GRAFANA' },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        receiver: true,
        status: true,
        alertCount: true,
        alertName: true,
        payloadPreview: true,
        receivedAt: true,
      },
    }),
    database.alertEvent.findFirst({
      where: { organizationId: membership.organizationId, source: 'GRAFANA' },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        processingStatus: true,
        mappingError: true,
        alertName: true,
        resourceIdentifier: true,
        service: true,
        environment: true,
        severity: true,
        receivedAt: true,
        incident: {
          select: {
            id: true,
            status: true,
            metadata: true,
            application: { select: { name: true } },
            environment: { select: { name: true } },
            resource: { select: { name: true, externalIdentifier: true } },
          },
        },
      },
    }),
    database.resourceMapping.findFirst({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        resource: { select: { externalIdentifier: true } },
        application: { select: { name: true } },
        environment: { select: { name: true } },
      },
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

      <section className="mt-10 border-t border-white/8 pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
              Integration testing
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Grafana webhook test
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              This does not create the Grafana connection. It only confirms that a test payload
              reached WakeOps and shows whether its labels mapped to a service.
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.025] px-3 py-1 text-xs text-zinc-400">
            Separate test area
          </span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="font-semibold text-white">Send a connectivity test</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-500">
                <li>Open the connected contact point in Grafana.</li>
                <li>Click Test and select Predefined.</li>
                <li>Send the test notification.</li>
                <li>WakeOps will update the receipt panel automatically.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="font-semibold text-white">Test service mapping</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Select Custom in Grafana and use labels matching a saved WakeOps deployment.
              </p>
              {!sampleMapping && (
                <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3 text-sm text-amber-200">
                  Add a host and service deployment before testing mapping.
                </p>
              )}
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ['alertname', 'WakeOpsLabelTest'],
                  ['service', sampleMapping?.application.name ?? 'your-service-name'],
                  ['environment', sampleMapping?.environment.name ?? 'your-environment-name'],
                  [
                    'instance',
                    sampleMapping?.resource.externalIdentifier ?? 'your-host-identifier',
                  ],
                  ['severity', 'critical'],
                ].map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/6 bg-black/25 p-3">
                    <dt className="font-mono text-[11px] text-lime-300">{key}</dt>
                    <dd className="mt-1 break-words text-xs text-zinc-400">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <h3 className="mb-4 font-semibold text-white">Latest received test</h3>
            <GrafanaTestStatus
              initialReceipt={
                receipt
                  ? {
                      ...receipt,
                      payloadPreview: receipt.payloadPreview as GrafanaPayloadPreview | null,
                      receivedAt: receipt.receivedAt.toISOString(),
                    }
                  : null
              }
              initialProcessing={
                processing
                  ? ({
                      ...processing,
                      receivedAt: processing.receivedAt.toISOString(),
                    } as GrafanaProcessingResult)
                  : null
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
