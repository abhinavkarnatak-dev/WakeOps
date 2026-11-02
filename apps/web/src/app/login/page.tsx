import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AuthShell } from '@/components/auth-shell';
import { GoogleSignIn } from '@/components/google-sign-in';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/onboarding');

  return (
    <AuthShell
      aside={{
        title: (
          <>
            The pager
            <br />
            goes off.
            <br />
            <span className="text-signal">You&apos;re covered.</span>
          </>
        ),
        body: 'Map services to engineers once. WakeOps handles the calls, the retries and the escalation every time Grafana fires.',
      }}
    >
      <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Sign in</h1>
      <p className="mt-4 text-base leading-7 text-zinc-400">
        Use your Google account. New here? Your organization is set up right after.
      </p>
      <div className="mt-10">
        <GoogleSignIn />
      </div>
      <p className="mt-8 text-xs leading-5 text-zinc-600">
        WakeOps uses your name and email to identify you to your team. Engineer phone numbers are
        added separately during setup.
      </p>
    </AuthShell>
  );
}
