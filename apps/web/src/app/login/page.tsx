import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { GoogleSignIn } from '@/components/google-sign-in';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/onboarding');

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/80 p-8">
        <p className="text-sm font-semibold text-cyan-300">WakeOps</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in</h1>
        <p className="mt-3 mb-8 text-slate-300">
          Use Google to create your account. Your organization is created in the next step.
        </p>
        <GoogleSignIn />
      </section>
    </main>
  );
}
