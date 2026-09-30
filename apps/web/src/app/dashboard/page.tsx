import { database } from '@wakeops/database';
import Link from 'next/link';

import { requireOrganization } from '@/lib/organization';
import { SignOutButton } from '@/components/sign-out-button';

export default async function DashboardPage() {
  const membership = await requireOrganization();
  const organizationId = membership.organizationId;
  const [engineers, applications, hosts, deployments] = await Promise.all([
    database.engineer.count({ where: { organizationId } }),
    database.application.count({ where: { organizationId } }),
    database.monitoredResource.count({ where: { organizationId } }),
    database.resourceMapping.count({ where: { organizationId } }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <p className="text-sm text-cyan-300">{membership.organization.name}</p>
          <h1 className="text-2xl font-bold">WakeOps dashboard</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="py-10">
        <h2 className="text-xl font-semibold">Set up incident ownership</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Add engineers and map monitored resources to the services they run. These mappings tell
          WakeOps who to contact when an alert arrives.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            `${engineers} engineers`,
            `${applications} applications`,
            `${hosts} monitored hosts`,
            `${deployments} service deployments`,
          ].map((label) => (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5" key={label}>
              <p className="font-medium">{label}</p>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/setup"
          className="mt-6 inline-block rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950"
        >
          Manage organization setup
        </Link>
      </section>
    </main>
  );
}
