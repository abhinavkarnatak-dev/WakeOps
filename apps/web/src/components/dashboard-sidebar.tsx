'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { SignOutButton } from '@/components/sign-out-button';

const navigation = [
  { href: '/dashboard', label: 'Overview', mark: 'OV' },
  { href: '/dashboard/incidents', label: 'Incidents', mark: 'IN' },
  { href: '/dashboard/setup', label: 'Organization', mark: 'OR' },
  { href: '/dashboard/integrations', label: 'Integrations', mark: 'IG' },
];

export function DashboardSidebar({
  organizationName,
  userName,
  userEmail,
  role,
}: {
  organizationName: string;
  userName: string;
  userEmail: string;
  role: 'ADMIN' | 'MEMBER';
}) {
  const pathname = usePathname();
  const profile = useRef<HTMLDetailsElement>(null);
  const displayName = userName?.trim() || userEmail?.split('@')[0] || 'WakeOps user';
  const displayEmail = userEmail || 'No email available';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function closeProfile(event: PointerEvent) {
      if (
        profile.current?.open &&
        event.target instanceof Node &&
        !profile.current.contains(event.target)
      ) {
        profile.current.open = false;
      }
    }
    document.addEventListener('pointerdown', closeProfile);
    return () => document.removeEventListener('pointerdown', closeProfile);
  }, []);

  return (
    <aside className="border-b border-white/8 bg-[#080909] md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:border-r md:border-b-0">
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center gap-3 px-5">
          <div className="grid size-9 place-items-center rounded-xl bg-lime-300 text-sm font-black text-black shadow-[0_0_24px_rgba(190,242,100,0.18)]">
            W
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-white">WakeOps</p>
            <p className="max-w-40 truncate text-[11px] text-zinc-500">{organizationName}</p>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:overflow-visible md:pb-0">
          {navigation.map((item) => {
            const active =
              item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-lime-300 text-black'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-lg text-[9px] font-black tracking-wider ${
                    active ? 'bg-black/10' : 'bg-white/5 text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  {item.mark}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden p-4 md:block">
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.6)]" />
              Alert pipeline online
            </div>
          </div>
          <details ref={profile} className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-white/8 px-3 py-2.5 transition hover:border-white/15 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-xs font-bold text-lime-300">
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-200">Profile</span>
                <span className="block truncate text-[11px] text-zinc-600">{displayName}</span>
              </span>
              <span className="text-xs text-zinc-600 transition group-open:rotate-180">^</span>
            </summary>

            <div className="absolute right-0 bottom-full left-0 mb-2 rounded-2xl border border-white/10 bg-[#0c0d0d] p-4 shadow-2xl shadow-black/50">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-300">
                Account
              </p>
              <p className="mt-3 truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{displayEmail}</p>

              <dl className="mt-4 space-y-3 border-t border-white/8 pt-4 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-600">Status</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-lime-300">
                    <span className="size-1.5 rounded-full bg-lime-300" />
                    Active
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-600">Role</dt>
                  <dd className="font-medium text-zinc-300">
                    {role === 'ADMIN' ? 'Admin' : 'Member'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-600">Organization</dt>
                  <dd className="max-w-32 truncate font-medium text-zinc-300">
                    {organizationName}
                  </dd>
                </div>
              </dl>

              <div className="mt-4">
                <SignOutButton menu />
              </div>
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}
