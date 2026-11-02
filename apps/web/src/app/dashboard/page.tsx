import { database, type Prisma } from '@wakeops/database';
import Link from 'next/link';

import { OdometerNumber } from '@/components/animated-number';
import { IncidentList, PageHeader, timeAgo } from '@/components/dashboard-ui';
import { IncidentFilters } from '@/components/incident-filters';
import { SignalField } from '@/components/landing/signal-field';
import { requireOrganization } from '@/lib/organization';
import { incidentFilterStatus } from '@/lib/incident-filter-values';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireOrganization();
  const organizationId = membership.organizationId;
  const parameters = await searchParams;
  const query = typeof parameters.q === 'string' ? parameters.q.trim().slice(0, 100) : '';
  const status = incidentFilterStatus(
    typeof parameters.status === 'string' ? parameters.status : undefined,
  );
  const sort = parameters.sort === 'asc' ? 'asc' : 'desc';
  const nextSortParameters = new URLSearchParams();
  if (query) nextSortParameters.set('q', query);
  if (status) nextSortParameters.set('status', status);
  if (sort === 'desc') nextSortParameters.set('sort', 'asc');
  const createdSortHref = nextSortParameters.size
    ? `/dashboard?${nextSortParameters.toString()}`
    : '/dashboard';
  const recentWhere: Prisma.IncidentWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { alertName: { contains: query, mode: 'insensitive' } },
            { application: { name: { contains: query, mode: 'insensitive' } } },
            { environment: { name: { contains: query, mode: 'insensitive' } } },
            { resource: { externalIdentifier: { contains: query, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [active, acknowledged, calls, applications, recentIncidents, firstActive, latest] =
    await Promise.all([
      database.incident.count({
        where: { organizationId, status: { in: ['OPEN', 'NOTIFYING'] } },
      }),
      database.incident.count({ where: { organizationId, status: 'ACKNOWLEDGED' } }),
      database.callAttempt.count({
        where: { incident: { organizationId } },
      }),
      database.application.count({ where: { organizationId } }),
      database.incident.findMany({
        where: recentWhere,
        orderBy: { createdAt: sort },
        take: 6,
        include: {
          application: true,
          environment: true,
          resource: true,
          callAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { engineer: true },
          },
        },
      }),
      database.incident.findFirst({
        where: { organizationId, status: { in: ['OPEN', 'NOTIFYING'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, alertName: true },
      }),
      database.incident.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

  const alerting = active > 0;
  const stats = [
    { label: 'Open now', value: active, tone: alerting ? 'text-alarm' : 'text-zinc-500' },
    { label: 'Acknowledged', value: acknowledged, tone: 'text-signal' },
    { label: 'Calls placed', value: calls, tone: 'text-signal' },
    { label: 'Services watched', value: applications, tone: 'text-signal' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <PageHeader
        kicker="Operations center"
        title="Overview"
        actions={
          <Link
            href="/dashboard/incidents"
            className="inline-flex h-11 items-center rounded-full border border-white/12 px-5 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
          >
            Incident history
          </Link>
        }
      />

      <section
        aria-label="Current status"
        className={`relative isolate mt-8 overflow-hidden rounded-[28px] border ${
          alerting ? 'border-alarm/25' : 'border-white/[0.07]'
        } bg-[#070908]`}
      >
        <SignalField
          key={alerting ? 'alert' : 'quiet'}
          mode={alerting ? 'incident' : 'quiet'}
          density={0.7}
          className="absolute inset-0 -z-10 opacity-80"
        />
        <div
          className={`pointer-events-none absolute inset-0 -z-10 ${
            alerting
              ? 'bg-[linear-gradient(90deg,rgba(7,9,8,0.96)_25%,rgba(7,9,8,0.5)_60%,rgba(80,10,25,0.25))]'
              : 'bg-[linear-gradient(90deg,rgba(7,9,8,0.96)_25%,rgba(7,9,8,0.4)_70%,transparent)]'
          }`}
        />

        <div className="flex min-h-[19rem] flex-col justify-between gap-10 p-6 sm:p-9">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="relative flex size-2">
                <span
                  className={`absolute inset-0 animate-ping rounded-full opacity-60 ${alerting ? 'bg-alarm' : 'bg-signal'}`}
                />
                <span
                  className={`relative size-2 rounded-full ${alerting ? 'bg-alarm' : 'bg-signal'}`}
                />
              </span>
              {alerting ? 'Response in progress' : `Last alert ${timeAgo(latest?.createdAt)}`}
            </p>
            <h2
              className={`font-display mt-5 text-[2.6rem] leading-[0.9] font-extrabold tracking-[-0.045em] uppercase sm:text-[4.2rem] ${
                alerting ? 'text-alarm' : 'text-white'
              }`}
            >
              {alerting
                ? `${active} ${active === 1 ? 'incident needs' : 'incidents need'} someone.`
                : 'All quiet.'}
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-zinc-400">
              {alerting
                ? 'WakeOps is calling the assigned engineers. Each retry and escalation lands on the incident timeline.'
                : applications
                  ? `No open incidents. When Grafana fires for any of your ${applications} ${applications === 1 ? 'service' : 'services'}, the on-call engineer gets a call.`
                  : 'Nothing is being watched yet. Add your services and engineers to start routing alerts.'}
            </p>
            {alerting && firstActive && (
              <Link
                href={`/dashboard/incidents/${firstActive.id}`}
                className="mt-6 inline-flex h-11 max-w-full items-center gap-2 rounded-full bg-alarm px-5 text-sm font-semibold text-black transition hover:bg-white"
              >
                <span className="truncate">Open {firstActive.alertName}</span>
              </Link>
            )}
            {!alerting && !applications && (
              <Link
                href="/dashboard/setup"
                className="mt-6 inline-flex h-11 items-center rounded-full bg-signal px-5 text-sm font-semibold text-black transition hover:bg-white"
              >
                Set up services
              </Link>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] backdrop-blur-md sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-[#070908]/85 px-5 py-4">
                <dt className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className={`size-1.5 rounded-full bg-current ${stat.tone}`} />
                  {stat.label}
                </dt>
                <dd className="mt-2">
                  <OdometerNumber
                    value={stat.value}
                    className="font-display text-3xl font-extrabold tracking-[-0.03em] text-white"
                  />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">
              Recent incidents
            </h2>
            <p className="mt-1 text-sm text-zinc-500">The latest alerts across every service</p>
          </div>
          <IncidentFilters action="/dashboard" query={query} status={status} />
        </div>

        <IncidentList
          incidents={recentIncidents}
          sort={sort}
          sortHref={createdSortHref}
          sortLabel="Created"
          empty={
            query || status
              ? {
                  title: 'No incidents match',
                  body: 'Try a different search or clear the status filter.',
                }
              : {
                  title: 'No incidents yet',
                  body: 'Your first mapped Grafana alert will show up here, along with every call WakeOps makes for it.',
                }
          }
        />
        {recentIncidents.length > 0 && (
          <Link
            href="/dashboard/incidents"
            className="mt-4 inline-flex text-sm text-zinc-400 transition hover:text-signal"
          >
            See the full history
          </Link>
        )}
      </section>
    </div>
  );
}
