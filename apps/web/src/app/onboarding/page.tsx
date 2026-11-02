import { database } from '@wakeops/database';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AuthShell } from '@/components/auth-shell';
import { SignOutButton } from '@/components/sign-out-button';

import { OrganizationForm } from './organization-form';

export const metadata: Metadata = {
  title: 'Create organization',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user.id) redirect('/login');

  const membership = await database.membership.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (membership) redirect('/dashboard');

  return (
    <AuthShell
      aside={{
        title: (
          <>
            One workspace
            <br />
            for every
            <br />
            <span className="text-signal">3 AM page.</span>
          </>
        ),
        body: 'Your organization owns the applications, engineers, integrations and incident history. You will be its first admin.',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-zinc-500">Step 1 of 3</p>
        <SignOutButton />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        Name your organization
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-400">
        Usually your company or team name. You will map services to engineers next.
      </p>
      <OrganizationForm />
      <ol className="mt-12 space-y-3 border-t border-white/8 pt-6 text-sm">
        {['Name your organization', 'Map services to engineers', 'Connect Grafana'].map(
          (item, index) => (
            <li key={item} className="flex items-center gap-3">
              <span
                className={`grid size-6 place-items-center rounded-full font-mono text-[11px] ${
                  index === 0 ? 'bg-signal text-black' : 'border border-white/12 text-zinc-500'
                }`}
              >
                {index + 1}
              </span>
              <span className={index === 0 ? 'text-white' : 'text-zinc-500'}>{item}</span>
            </li>
          ),
        )}
      </ol>
    </AuthShell>
  );
}
