'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const titles: [string, string][] = [
  ['/dashboard/incidents/', 'Incident'],
  ['/dashboard/incidents', 'Incidents'],
  ['/dashboard/setup', 'Organization'],
  ['/dashboard/integrations', 'Integrations'],
  ['/dashboard', 'Overview'],
];

export function DashboardTopbar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  const [time, setTime] = useState<string | null>(null);
  const page = titles.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Overview';

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    const first = window.setTimeout(() => setTime(format()), 0);
    const id = window.setInterval(() => setTime(format()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="sticky top-0 z-20 hidden border-b border-white/[0.06] bg-[#050606]/75 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-6 px-8 lg:px-10">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/dashboard" className="truncate text-zinc-500 transition hover:text-white">
            {organizationName}
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-200">{page}</span>
        </nav>
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60" />
              <span className="relative size-1.5 rounded-full bg-signal" />
            </span>
            Live, refreshing every 3s
          </span>
          <span className="font-mono text-zinc-300 tabular-nums">{time ?? '--:--:--'}</span>
        </div>
      </div>
    </div>
  );
}
