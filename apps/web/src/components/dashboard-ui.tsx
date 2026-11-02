import Link from 'next/link';
import type { ReactNode } from 'react';

import { IncidentStatus, Severity, shortIncidentId } from '@/components/incident-ui';

/** Shared input styling for every dashboard form. */
export const fieldClass =
  'h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-signal/70 focus:bg-signal/[0.03] focus:shadow-[0_0_0_4px_rgba(190,242,100,0.07)]';

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="size-1.5 rounded-full bg-signal" />
          {kicker}
        </p>
        <h1 className="font-display mt-4 text-[2.1rem] leading-[0.92] font-extrabold tracking-[-0.045em] break-words text-white uppercase sm:text-[3.2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(value: Date | null | undefined) {
  if (!value) return 'Never';
  const seconds = Math.round((value.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const rail: Record<string, string> = {
  OPEN: 'bg-alarm shadow-[0_0_14px_rgba(251,113,133,0.6)]',
  NOTIFYING: 'bg-ring shadow-[0_0_14px_rgba(252,211,77,0.5)]',
  ACKNOWLEDGED: 'bg-signal',
  RESOLVED: 'bg-zinc-600',
};

export type IncidentRowData = {
  id: string;
  alertName: string;
  severity: string;
  status: string;
  createdAt: Date;
  startedAt?: Date | null;
  application: { name: string };
  environment: { name: string };
  resource: { externalIdentifier: string };
  callAttempts: { engineer: { name: string } }[];
};

/** Incident list used on the overview and the full history. Rows collapse to cards on small screens. */
export function IncidentList({
  incidents,
  sortHref,
  sort,
  sortLabel,
  empty,
}: {
  incidents: IncidentRowData[];
  sortHref: string;
  sort: 'asc' | 'desc';
  sortLabel: string;
  empty: { title: string; body: string };
}) {
  if (!incidents.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 px-6 py-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-signal/25 bg-signal/[0.06]">
          <span className="size-2 rounded-full bg-signal shadow-[0_0_12px_#bef264]" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-white">{empty.title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">{empty.body}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.012]">
      <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_8.5rem_minmax(0,1fr)_7.5rem] gap-4 border-b border-white/[0.07] px-6 py-3 text-xs text-zinc-500 lg:grid">
        <span>Incident</span>
        <span>Service</span>
        <span>Resource</span>
        <span>Status</span>
        <span>Last called</span>
        <Link
          href={sortHref}
          scroll={false}
          aria-label={`Sort by ${sortLabel.toLowerCase()}, currently ${sort === 'desc' ? 'newest first' : 'oldest first'}`}
          className="group inline-flex items-center gap-1.5 transition hover:text-signal"
        >
          {sortLabel}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={`size-3 transition-transform ${sort === 'asc' ? 'rotate-180' : ''}`}
          >
            <path d="M8 3v10m-4-4 4 4 4-4" />
          </svg>
        </Link>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {incidents.map((incident) => {
          const when = incident.startedAt ?? incident.createdAt;
          return (
            <li key={incident.id}>
              <Link
                href={`/dashboard/incidents/${incident.id}`}
                className="group relative grid gap-3 px-6 py-5 transition-colors hover:bg-white/[0.03] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_8.5rem_minmax(0,1fr)_7.5rem] lg:items-center lg:gap-4"
              >
                <span
                  className={`absolute top-4 bottom-4 left-0 w-[3px] rounded-r-full ${rail[incident.status] ?? rail.OPEN}`}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white transition-colors group-hover:text-signal">
                    {incident.alertName}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs">
                    <Severity severity={incident.severity} />
                    <span className="font-mono text-zinc-600">{shortIncidentId(incident.id)}</span>
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="truncate text-zinc-200">{incident.application.name}</p>
                  <p className="truncate text-xs text-zinc-500">{incident.environment.name}</p>
                </div>
                <p className="truncate font-mono text-xs text-zinc-400">
                  {incident.resource.externalIdentifier}
                </p>
                <div>
                  <IncidentStatus status={incident.status} />
                </div>
                <p className="truncate text-sm text-zinc-400">
                  {incident.callAttempts[0]?.engineer.name ?? 'Not called yet'}
                </p>
                <p className="text-xs text-zinc-500" title={when.toISOString()}>
                  {timeAgo(when)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
