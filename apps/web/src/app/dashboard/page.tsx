import { database } from '@wakeops/database';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { SignOutButton } from '@/components/sign-out-button';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user.id) redirect('/login');

  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });
  if (!membership) redirect('/onboarding');

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
        <h2 className="text-xl font-semibold">Organization created</h2>
        <p className="mt-2 max-w-2xl text-slate-300">
          Authentication and the first onboarding step are working. Monitoring integrations,
          engineers, resource mapping, and incidents will be added milestone by milestone.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {['Connect monitoring', 'Add engineers', 'Map applications'].map((label) => (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5" key={label}>
              <p className="font-medium">{label}</p>
              <p className="mt-2 text-sm text-slate-400">Coming in the next milestones</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
