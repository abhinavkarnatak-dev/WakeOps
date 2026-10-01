import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DashboardLiveRefresh } from '@/components/dashboard-live-refresh';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { requireOrganization } from '@/lib/organization';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const membership = await requireOrganization();

  return (
    <div className="min-h-screen bg-[#050606] text-zinc-100">
      <DashboardLiveRefresh />
      <DashboardSidebar
        organizationName={membership.organization.name}
        userName={membership.user.name ?? membership.user.email ?? 'WakeOps user'}
        userEmail={membership.user.email ?? 'No email available'}
        role={membership.role}
      />
      <div className="md:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
