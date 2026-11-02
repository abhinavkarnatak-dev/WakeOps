'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SignOutButton } from '@/components/sign-out-button';

const icons = {
  overview: 'M3 12h4l3-8 4 16 3-8h4',
  incidents: 'M12 3 2 20h20L12 3Zm0 6v5m0 3v.5',
  organization: 'M4 20V8l8-5 8 5v12M9 20v-6h6v6',
  integrations: 'M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-10 0V7Zm5 9v5',
};

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: icons.overview },
  { href: '/dashboard/incidents', label: 'Incidents', icon: icons.incidents },
  { href: '/dashboard/setup', label: 'Organization', icon: icons.organization },
  { href: '/dashboard/integrations', label: 'Integrations', icon: icons.integrations },
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function BrandMark() {
  return <Image src="/icon.svg" alt="" width={34} height={34} className="shrink-0" priority />;
}

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
  const mobileMenu = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      if (
        event.target instanceof Node &&
        mobileMenu.current &&
        !mobileMenu.current.contains(event.target)
      ) {
        setMobileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('pointerdown', closeProfile);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeProfile);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <aside className="sticky top-0 z-30 border-b border-white/8 bg-[#070808]/90 backdrop-blur-xl md:fixed md:inset-y-3 md:left-3 md:z-20 md:w-60 md:rounded-[26px] md:border md:border-white/[0.07] md:bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] md:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
      <div ref={mobileMenu} className="md:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-white">
                WakeOps
              </p>
              <p className="truncate text-[11px] text-zinc-500">{organizationName}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-dashboard-menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            <span aria-hidden="true" className="flex w-4 flex-col gap-1">
              <span
                className={`h-px w-4 bg-current transition ${mobileOpen ? 'translate-y-1 rotate-45' : ''}`}
              />
              <span className={`h-px w-4 bg-current transition ${mobileOpen ? 'opacity-0' : ''}`} />
              <span
                className={`h-px w-4 bg-current transition ${mobileOpen ? '-translate-y-1 -rotate-45' : ''}`}
              />
            </span>
          </button>
        </div>

        {mobileOpen && (
          <div
            id="mobile-dashboard-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/8 bg-[#080909] p-4 shadow-2xl shadow-black/60"
          >
            <nav className="space-y-1">
              {navigation.map((item) => {
                const active =
                  item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      active
                        ? 'bg-white/[0.07] text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className={active ? 'text-signal' : 'text-zinc-500'}>
                      <NavIcon path={item.icon} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-white/8 pt-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-white/8 px-3 py-3 transition hover:border-white/15 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-lime-300/20 bg-lime-300/10 text-xs font-bold text-lime-300">
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-200">Profile</span>
                    <span className="block truncate text-[11px] text-zinc-600">{displayName}</span>
                  </span>
                  <span className="text-xs text-zinc-600 transition group-open:rotate-180">^</span>
                </summary>

                <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.025] p-4">
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
                      <dd className="max-w-40 truncate font-medium text-zinc-300">
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
        )}
      </div>

      <div className="hidden h-full flex-col md:flex">
        <div className="flex h-20 items-center gap-3 px-5 pt-1">
          <BrandMark />
          <div>
            <p className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-white">
              WakeOps
            </p>
            <p className="max-w-40 truncate text-[11px] text-zinc-500">{organizationName}</p>
          </div>
        </div>

        <p className="px-6 pt-4 pb-2 text-xs text-zinc-600">Workspace</p>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:overflow-visible md:pb-0">
          {navigation.map((item) => {
            const active =
              item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span
                  className={`absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-signal shadow-[0_0_12px_#bef264] transition-all duration-500 ease-out-expo ${
                    active ? 'opacity-100' : 'scale-y-0 opacity-0'
                  }`}
                />
                <span
                  className={`transition-colors ${active ? 'text-signal' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                >
                  <NavIcon path={item.icon} />
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden p-4 md:block">
          <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-50" />
                <span className="relative size-2 rounded-full bg-signal shadow-[0_0_10px_rgba(190,242,100,0.6)]" />
              </span>
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
