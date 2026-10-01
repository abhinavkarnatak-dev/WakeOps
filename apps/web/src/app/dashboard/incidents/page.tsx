import { database, type Prisma } from '@wakeops/database';
import Link from 'next/link';

import { IncidentFilters } from '@/components/incident-filters';
import { CountUpNumber } from '@/components/animated-number';
import {
  formatDate,
  IncidentStatus,
  Panel,
  Severity,
  shortIncidentId,
} from '@/components/incident-ui';
import { requireOrganization } from '@/lib/organization';
import { incidentFilterStatus } from '@/lib/incident-filter-values';

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireOrganization();
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
  const startedSortHref = nextSortParameters.size
    ? `/dashboard/incidents?${nextSortParameters.toString()}`
    : '/dashboard/incidents';
  const where: Prisma.IncidentWhereInput = {
    organizationId: membership.organizationId,
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
  const incidents = await database.incident.findMany({
    where,
    orderBy: { startedAt: sort },
    take: 100,
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
  });

  const activeCount = incidents.filter((incident) =>
    ['OPEN', 'NOTIFYING'].includes(incident.status),
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
            Incident history
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            Every alert. One timeline.
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Review what fired, who WakeOps called, and how the incident was acknowledged.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-zinc-400">
            <CountUpNumber value={incidents.length} className="inline-flex w-[3ch] justify-end" />{' '}
            total
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-400/8 px-3 py-1.5 text-rose-300">
            <CountUpNumber value={activeCount} className="inline-flex w-[3ch] justify-end" /> active
          </span>
        </div>
      </header>

      <div className="mt-8">
        <IncidentFilters action="/dashboard/incidents" query={query} status={status} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        {incidents.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-white/8 bg-white/[0.02] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Incident</th>
                  <th className="px-5 py-3.5 font-semibold">Service</th>
                  <th className="px-5 py-3.5 font-semibold">Environment</th>
                  <th className="px-5 py-3.5 font-semibold">Resource</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Engineer</th>
                  <th className="px-5 py-3.5 font-semibold">
                    <Link
                      href={startedSortHref}
                      scroll={false}
                      aria-label={`Sort by started date, currently ${sort === 'desc' ? 'newest first' : 'oldest first'}`}
                      className="group inline-flex items-center gap-1.5 transition hover:text-lime-300"
                    >
                      Started
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
                {incidents.map((incident) => (
                  <tr key={incident.id} className="group transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/incidents/${incident.id}`}
                        className="font-medium text-white transition group-hover:text-lime-200"
                      >
                        {incident.alertName}
                      </Link>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Severity severity={incident.severity} />
                        <span className="font-mono text-[10px] text-zinc-600">
                          {shortIncidentId(incident.id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-300">{incident.application.name}</td>
                    <td className="px-5 py-4 text-sm text-zinc-500">{incident.environment.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {incident.resource.externalIdentifier}
                    </td>
                    <td className="px-5 py-4">
                      <IncidentStatus status={incident.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-400">
                      {incident.callAttempts[0]?.engineer.name ?? 'Not called'}
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-500">
                      {formatDate(incident.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/8 bg-white/[0.025] text-lime-300">
              0
            </div>
            <h2 className="mt-4 font-medium text-white">
              {query || status ? 'No incidents match these filters' : 'No incidents recorded'}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              A mapped Grafana alert will create the first incident.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
