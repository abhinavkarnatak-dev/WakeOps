import Link from 'next/link';

import { auth } from '@/auth';

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <nav className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">WakeOps</span>
        <Link
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:border-cyan-300"
          href={session ? '/dashboard' : '/login'}
        >
          {session ? 'Open dashboard' : 'Sign in'}
        </Link>
      </nav>

      <section className="flex flex-1 items-center py-20">
        <div className="max-w-3xl">
          <p className="mb-4 font-medium text-cyan-300">Incidents should wake the right person.</p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Alert, call, explain, and acknowledge.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            WakeOps receives monitoring alerts, starts a durable incident workflow, and calls the
            assigned engineer with verified context. The voice demo arrives in a later milestone.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200"
              href={session ? '/dashboard' : '/login'}
            >
              {session ? 'Go to dashboard' : 'Get started'}
            </Link>
            <span className="rounded-lg border border-slate-700 px-5 py-3 text-slate-400">
              Try Incident Agent - coming later
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
