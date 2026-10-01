import { database, type Prisma } from '@wakeops/database';
import Link from 'next/link';

import { IncidentFilters } from '@/components/incident-filters';
import { OdometerNumber } from '@/components/animated-number';
import {
  formatDate,
  IncidentStatus,
  Panel,
  Severity,
  shortIncidentId,
} from '@/components/incident-ui';
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
  const [active, acknowledged, calls, applications, recentIncidents] = await Promise.all([
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
  ]);

  const metrics = [
    { label: 'Active incidents', value: active, tone: 'text-rose-300', note: 'Need attention' },
    {
      label: 'Acknowledged',
      value: acknowledged,
      tone: 'text-lime-300',
      note: 'Engineer reached',
    },
    { label: 'Call attempts', value: calls, tone: 'text-lime-300', note: 'Across all incidents' },
    { label: 'Applications', value: applications, tone: 'text-lime-300', note: 'Being watched' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="size-1.5 rounded-full bg-lime-300" />
            Operations center
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Incident overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Live alert, call, retry, and escalation activity for {membership.organization.name}.
          </p>
        </div>
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center justify-center rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200"
        >
          View all incidents
        </Link>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Panel key={metric.label} className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-zinc-500">{metric.label}</p>
              <span className={`mt-1 size-1.5 rounded-full bg-current ${metric.tone}`} />
            </div>
            <div className="mt-5">
              <OdometerNumber
                value={metric.value}
                className="text-3xl font-semibold tracking-tight text-white"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-600">{metric.note}</p>
          </Panel>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent incidents</h2>
            <p className="mt-1 text-xs text-zinc-500">Newest alerts across every application</p>
          </div>
          <Link href="/dashboard/incidents" className="text-xs font-semibold text-lime-300">
            See complete history
          </Link>
        </div>

        <div className="mb-4">
          <IncidentFilters action="/dashboard" query={query} status={status} />
        </div>

        <Panel className="overflow-hidden">
          {recentIncidents.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] table-fixed text-left">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="border-b border-white/8 bg-white/[0.02] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Incident</th>
                    <th className="px-5 py-3.5 font-semibold">Application</th>
                    <th className="px-5 py-3.5 font-semibold">Resource</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Last contact</th>
                    <th className="px-5 py-3.5 font-semibold">
                      <Link
                        href={createdSortHref}
                        scroll={false}
                        aria-label={`Sort by created date, currently ${sort === 'desc' ? 'newest first' : 'oldest first'}`}
                        className="group inline-flex items-center gap-1.5 transition hover:text-lime-300"
                      >
                        Created
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className={`size-3.5 text-zinc-500 transition-transform group-hover:text-lime-300 ${sort === 'asc' ? 'rotate-180' : ''}`}
                        >
                          <path d="M3 5h8M3 9h5M3 13h2" />
                          <path d="m13 7 2-2 2 2M15 5v10m-2-2 2 2 2-2" />
                        </svg>
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {recentIncidents.map((incident) => (
                    <tr key={incident.id} className="group transition hover:bg-white/[0.025]">
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/incidents/${incident.id}`}
                          className="block font-medium text-white group-hover:text-lime-200"
                        >
                          {incident.alertName}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <Severity severity={incident.severity} />
                          <span className="text-[10px] text-zinc-600">
                            {shortIncidentId(incident.id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {incident.application.name}
                        <p className="mt-1 text-xs text-zinc-600">{incident.environment.name}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-400">
                        {incident.resource.externalIdentifier}
                      </td>
                      <td className="px-5 py-4">
                        <IncidentStatus status={incident.status} />
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-400">
                        {incident.callAttempts[0]?.engineer.name ?? 'No call yet'}
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500">
                        {formatDate(incident.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-zinc-300">
                {query || status ? 'No recent incidents match these filters' : 'No incidents yet'}
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Your first mapped Grafana alert will appear here.
              </p>
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}
