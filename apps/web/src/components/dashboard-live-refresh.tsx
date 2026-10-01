'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const refreshIntervalMs = 3000;

export function DashboardLiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const enabled = pathname === '/dashboard' || pathname.startsWith('/dashboard/incidents');

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const timer = window.setInterval(refresh, refreshIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, router]);

  return null;
}
