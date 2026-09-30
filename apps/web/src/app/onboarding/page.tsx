import { database } from '@wakeops/database';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { SignOutButton } from '@/components/sign-out-button';

import { OrganizationForm } from './organization-form';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user.id) redirect('/login');

  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (membership) redirect('/dashboard');

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-300">Step 1 of onboarding</p>
            <h1 className="mt-2 text-3xl font-bold">Create your organization</h1>
          </div>
          <SignOutButton />
        </div>
        <p className="mt-3 text-slate-300">
          This becomes the top-level workspace that owns applications, engineers, integrations, and
          incidents. You will be its first admin.
        </p>
        <OrganizationForm />
      </section>
    </main>
  );
}
