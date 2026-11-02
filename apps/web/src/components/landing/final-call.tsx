'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Magnetic } from '@/components/landing/magnetic';

gsap.registerPlugin(ScrollTrigger);

const setup = [
  'Create your organization',
  'Assign engineers to each service',
  'Add the Grafana webhook',
  'Send a test alert',
];

export function FinalCall({ appHref, appLabel }: { appHref: string; appLabel: string }) {
  const root = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(fill.current, { clipPath: 'inset(0 0% 0 0)' });
        return;
      }
      gsap.fromTo(
        fill.current,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 75%',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        },
      );
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="final-title"
      className="relative overflow-hidden border-t border-white/8 bg-[#050606]"
    >
      <div className="mx-auto max-w-[1440px] px-5 pt-24 sm:px-8 sm:pt-32 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2
              id="final-title"
              className="max-w-3xl text-[clamp(2rem,4.6vw,4.2rem)] leading-[1] font-semibold tracking-[-0.045em] text-white"
            >
              Set it up before tonight&apos;s alert, not after.
            </h2>
            <ol className="mt-10 grid gap-x-8 gap-y-3 text-sm text-zinc-400 sm:grid-cols-2">
              {setup.map((item, index) => (
                <li key={item} className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-signal">{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <Magnetic>
            <Link
              href={appHref}
              className="group relative grid size-40 place-items-center overflow-hidden rounded-full bg-signal text-center text-base font-bold text-black sm:size-48"
            >
              <span className="absolute inset-0 scale-0 rounded-full bg-white transition-transform duration-700 ease-out-expo group-hover:scale-100" />
              <span className="relative px-6">{appLabel}</span>
            </Link>
          </Magnetic>
        </div>
      </div>

      <div className="relative mt-20 select-none sm:mt-28" aria-hidden="true">
        <p className="font-display text-center text-[15.2vw] leading-[0.78] font-black tracking-[-0.06em] text-transparent uppercase [-webkit-text-stroke:1px_rgba(255,255,255,0.14)]">
          WakeOps
        </p>
        <span
          ref={fill}
          className="font-display absolute inset-0 text-center text-[15.2vw] leading-[0.78] font-black tracking-[-0.06em] text-signal uppercase"
          style={{ clipPath: 'inset(0 100% 0 0)' }}
        >
          WakeOps
        </span>
      </div>

      <footer className="relative border-t border-white/8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>WakeOps. Grafana alerts, engineer calls and escalation.</p>
          <p className="font-mono">Made for the 3 AM page.</p>
        </div>
      </footer>
    </section>
  );
}
