import { database } from '@wakeops/database';
import Link from 'next/link';
import { requireOrganization } from '@/lib/organization';
import { GrafanaConnection } from './grafana-connection';
import { GrafanaTestStatus, type GrafanaPayloadPreview } from './grafana-test-status';

export default async function IntegrationsPage() {
  const membership = await requireOrganization();
  const [integration, receipt] = await Promise.all([
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
  ]);
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const publicApiUrl = process.env.WEBHOOK_PUBLIC_BASE_URL ?? apiUrl;
  const webhookPath = `/webhooks/grafana/${membership.organizationId}`;
  const webhookUrl = `${publicApiUrl.replace(/\/$/, '')}${webhookPath}`;
  const localUrl = `http://localhost:4000${webhookPath}`;
  const dockerUrl = `http://host.docker.internal:4000${webhookPath}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/dashboard" className="text-sm text-cyan-300">
        Back to dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Integrations</h1>
      <p className="mt-2 max-w-3xl text-slate-300">
        Connect monitoring providers one step at a time. A Grafana webhook is an HTTP request that
        Grafana sends from its server to WakeOps when a test or alert fires.
      </p>
      <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-orange-300">Grafana</p>
            <h2 className="text-xl font-semibold">Test webhook connection</h2>
          </div>
          <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">
            Test mode
          </span>
        </div>

        <div className="mt-6 space-y-5">
          <GrafanaConnection
            configured={Boolean(integration)}
            secretHint={integration?.secretHint ?? null}
            lastVerifiedAt={integration?.lastVerifiedAt?.toISOString() ?? null}
          />
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
          />
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="font-semibold">Step 1 - Copy the reachable webhook URL</p>
            <p className="mt-2 text-sm text-slate-400">
              Grafana Cloud requires a public HTTPS URL. Localhost works only when Grafana runs
              directly on this computer.
            </p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-cyan-200">
              {webhookUrl}
            </code>
          </div>
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="font-semibold">Step 2 - Create the Grafana contact point</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Open Alerts and IRM, then Alerting.</li>
              <li>Open Notification configuration, then Contact points.</li>
              <li>Create a contact point and select Webhook.</li>
              <li>Paste the URL from Step 1 and select POST.</li>
              <li>Set Authentication Header Scheme to Bearer.</li>
              <li>Generate credentials above and copy the displayed secret.</li>
              <li>Paste that secret into Authentication Header Credentials.</li>
              <li>Do not place the secret in the URL.</li>
            </ol>
          </div>
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="font-semibold">Step 3 - Send the first test</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Keep this WakeOps page open.</li>
              <li>Click Test on the Grafana contact point.</li>
              <li>Select Predefined and send the test notification.</li>
              <li>Wait for the green confirmation above.</li>
            </ol>
          </div>
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="font-semibold">Step 4 - Inspect labels with a custom test</p>
            <p className="mt-2 text-sm text-slate-400">
              Open Grafana&apos;s Test dialog again, select Custom, and add these learning labels.
              Send the test and inspect the received payload above.
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {[
                ['alertname', 'WakeOpsLabelTest'],
                ['service', 'payment-service'],
                ['environment', 'production'],
                ['instance', 'i-111'],
                ['severity', 'critical'],
              ].map(([key, value]) => (
                <div key={key} className="rounded-md bg-slate-950 p-3">
                  <dt className="text-cyan-300">{key}</dt>
                  <dd className="mt-1 text-slate-300">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <details className="rounded-lg border border-slate-700 p-4">
            <summary className="cursor-pointer font-semibold">Local URL alternatives</summary>
            <div className="mt-3 space-y-3 text-sm text-slate-400">
              <p>Grafana installed directly on this computer:</p>
              <code className="block overflow-x-auto rounded bg-slate-950 p-2 text-cyan-200">
                {localUrl}
              </code>
              <p>Grafana running in local Docker:</p>
              <code className="block overflow-x-auto rounded bg-slate-950 p-2 text-cyan-200">
                {dockerUrl}
              </code>
            </div>
          </details>
          <div className="rounded-lg border border-slate-700 p-4">
            <p className="font-semibold">Common problems</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-red-300">blocked address</dt>
                <dd className="text-slate-400">
                  Grafana Cloud received a localhost or private URL. Use the public HTTPS URL.
                </dd>
              </div>
              <div>
                <dt className="text-red-300">401 Unauthorized</dt>
                <dd className="text-slate-400">
                  The Bearer credentials do not match this organization&apos;s generated secret.
                </dd>
              </div>
              <div>
                <dt className="text-red-300">400 Invalid payload</dt>
                <dd className="text-slate-400">
                  The request reached WakeOps but did not match Grafana&apos;s webhook format.
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-sm text-slate-400">
            This test only records a safe receipt. It does not create an incident or contact an
            engineer.
          </p>
        </div>
      </section>
    </main>
  );
}
