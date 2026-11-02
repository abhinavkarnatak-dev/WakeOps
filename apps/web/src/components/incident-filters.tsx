'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { incidentStatuses, type IncidentFilterStatus } from '@/lib/incident-filter-values';

export function IncidentFilters({
  action,
  query,
  status,
}: {
  action: string;
  query: string;
  status?: IncidentFilterStatus;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const controlId = action === '/dashboard' ? 'overview' : 'incidents';
  const applyFilters = useCallback(() => {
    if (!form.current) return;
    const values = new FormData(form.current);
    const parameters = new URLSearchParams();
    const nextQuery = String(values.get('q') ?? '').trim();
    const nextStatus = String(values.get('status') ?? '');
    if (nextQuery) parameters.set('q', nextQuery);
    if (nextStatus) parameters.set('status', nextStatus);
    const serialized = parameters.toString();
    router.replace(serialized ? `${action}?${serialized}` : action);
  }, [action, router]);
  const scheduleFilters = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(applyFilters, 350);
  }, [applyFilters]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <form
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        applyFilters();
      }}
      className="flex w-full flex-col justify-end gap-2 sm:w-fit sm:flex-row"
    >
      <label className="sr-only" htmlFor={`${controlId}-incident-search`}>
        Search incidents
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zinc-500"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" />
        </svg>
        <input
          id={`${controlId}-incident-search`}
          type="search"
          name="q"
          defaultValue={query}
          onInput={scheduleFilters}
          placeholder="Search incidents"
          className="h-11 w-full min-w-0 rounded-full border border-white/10 bg-white/[0.03] pr-4 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-signal/70 focus:shadow-[0_0_0_4px_rgba(190,242,100,0.07)] sm:w-72"
        />
      </div>
      <label className="sr-only" htmlFor={`${controlId}-incident-status`}>
        Filter by status
      </label>
      <select
        id={`${controlId}-incident-status`}
        name="status"
        defaultValue={status ?? ''}
        onChange={applyFilters}
        className="h-11 rounded-full border border-white/10 bg-[#0a0c0b] px-4 text-sm text-zinc-300 outline-none transition focus:border-signal/70"
      >
        <option value="">All statuses</option>
        {incidentStatuses.map((item) => (
          <option key={item} value={item}>
            {item.charAt(0) + item.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </form>
  );
}
