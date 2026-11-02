import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DashboardLiveRefresh } from '@/components/dashboard-live-refresh';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardTopbar } from '@/components/dashboard-topbar';
import { requireOrganization } from '@/lib/organization';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const membership = await requireOrganization();

  return (
    <div className="relative min-h-screen bg-[#050606] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_40%_at_60%_-5%,rgba(190,242,100,0.06),transparent)]" />
      <DashboardLiveRefresh />
      <DashboardSidebar
        organizationName={membership.organization.name}
        userName={membership.user.name ?? membership.user.email ?? 'WakeOps user'}
        userEmail={membership.user.email ?? 'No email available'}
        role={membership.role}
      />
      <div className="relative md:pl-[16.75rem]">
        <DashboardTopbar organizationName={membership.organization.name} />
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
