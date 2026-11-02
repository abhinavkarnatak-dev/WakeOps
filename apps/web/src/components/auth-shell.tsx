import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SignalField } from '@/components/landing/signal-field';

/** Split layout for sign-in and onboarding: the live signal field on one side, the task on the other. */
export function AuthShell({
  aside,
  children,
}: {
  aside: { title: ReactNode; body: string };
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-[100svh] bg-[#050606] text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative isolate hidden overflow-hidden border-r border-white/8 lg:flex lg:flex-col">
        <SignalField className="absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#050606_0%,transparent_35%,transparent_75%,#050606_100%)]" />
        <div className="p-10">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="WakeOps home">
            <Image src="/icon.svg" alt="" width={30} height={30} priority />
            <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
              WakeOps
            </span>
          </Link>
        </div>
        <div className="mt-auto p-10">
          <h2 className="font-display max-w-xl text-[clamp(2.4rem,4.4vw,4.4rem)] leading-[0.9] font-extrabold tracking-[-0.045em] uppercase">
            {aside.title}
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">{aside.body}</p>
        </div>
      </section>

      <section className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(190,242,100,0.07),transparent)]" />
        <Link
          href="/"
          className="relative inline-flex items-center gap-2.5 lg:hidden"
          aria-label="WakeOps home"
        >
          <Image src="/icon.svg" alt="" width={30} height={30} priority />
          <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
            WakeOps
          </span>
        </Link>
        <div className="relative m-auto w-full max-w-md py-16">{children}</div>
      </section>
    </main>
  );
}
