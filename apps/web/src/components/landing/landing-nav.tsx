'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LandingScrollLink } from '@/components/landing-scroll-link';

const links = [
  { target: 'sequence', label: 'How a call unfolds' },
  { target: 'capabilities', label: 'What it does' },
  { target: 'grafana', label: 'Grafana' },
];

export function LandingNav({ signedIn, appHref }: { signedIn: boolean; appHref: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={`mx-auto flex max-w-[1440px] items-center justify-between rounded-full py-2 pr-2 pl-3 transition-all duration-500 ease-out-expo sm:pl-4 ${
          scrolled
            ? 'border border-white/10 bg-[#0a0c0b]/70 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:max-w-[880px]'
            : 'border border-transparent'
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="WakeOps, back to top"
          onClick={(event) => {
            if (window.location.pathname !== '/') return;
            event.preventDefault();
            const lenis = (
              window as unknown as {
                __lenis?: { scrollTo: (target: number, options?: { duration?: number }) => void };
              }
            ).__lenis;
            if (lenis) lenis.scrollTo(0, { duration: 1.4 });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Image src="/icon.svg" alt="" width={30} height={30} priority />
          <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-white">
            WakeOps
          </span>
        </Link>

        <div className="hidden items-center gap-1 text-sm text-zinc-400 md:flex">
          {links.map((link) => (
            <LandingScrollLink
              key={link.target}
              target={link.target}
              className="rounded-full px-3.5 py-2 transition hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </LandingScrollLink>
          ))}
        </div>

        <Link
          href={appHref}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-signal"
        >
          {signedIn ? 'Dashboard' : 'Sign in'}
        </Link>
      </nav>
    </header>
  );
}
