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
      className="ml-auto flex w-full flex-col justify-end gap-2 sm:w-fit sm:flex-row"
    >
      <label className="sr-only" htmlFor={`${controlId}-incident-search`}>
        Search incidents
      </label>
      <input
        id={`${controlId}-incident-search`}
        type="search"
        name="q"
        defaultValue={query}
        onInput={scheduleFilters}
        placeholder="Search incidents"
        className="min-w-0 rounded-xl border border-white/10 bg-[#0b0c0c] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-lime-300 sm:w-72"
      />
      <label className="sr-only" htmlFor={`${controlId}-incident-status`}>
        Filter by status
      </label>
      <select
        id={`${controlId}-incident-status`}
        name="status"
        defaultValue={status ?? ''}
        onChange={applyFilters}
        className="rounded-xl border border-white/10 bg-[#0b0c0c] px-3.5 py-2.5 text-sm text-zinc-300 outline-none transition focus:border-lime-300"
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
