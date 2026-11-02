import { database, type Prisma } from '@wakeops/database';

import { CountUpNumber } from '@/components/animated-number';
import { IncidentList, PageHeader } from '@/components/dashboard-ui';
import { IncidentFilters } from '@/components/incident-filters';
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
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <PageHeader
        kicker="Incident history"
        title="Every alert, one timeline"
        description="What fired, who WakeOps called, and how each incident was acknowledged."
        actions={
          <>
            <span className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-zinc-300">
              <CountUpNumber value={incidents.length} className="text-white" />
              total
            </span>
            <span
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm ${
                activeCount
                  ? 'border-alarm/30 bg-alarm/10 text-alarm'
                  : 'border-white/10 text-zinc-400'
              }`}
            >
              <CountUpNumber
                value={activeCount}
                className={activeCount ? 'text-alarm' : 'text-white'}
              />
              open
            </span>
          </>
        }
      />

      <div className="mt-10 mb-5 flex justify-end">
        <IncidentFilters action="/dashboard/incidents" query={query} status={status} />
      </div>

      <IncidentList
        incidents={incidents}
        sort={sort}
        sortHref={startedSortHref}
        sortLabel="Started"
        empty={
          query || status
            ? {
                title: 'No incidents match',
                body: 'Try a different search or clear the status filter.',
              }
            : {
                title: 'No incidents recorded',
                body: 'A mapped Grafana alert will create the first incident. Send a test alert from Integrations to see one here.',
              }
        }
      />
    </div>
  );
}
