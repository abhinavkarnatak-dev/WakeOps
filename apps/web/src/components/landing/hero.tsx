'use client';

import gsap from 'gsap';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { LandingScrollLink } from '@/components/landing-scroll-link';
import { Magnetic } from '@/components/landing/magnetic';
import { SignalField } from '@/components/landing/signal-field';

function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());
    const first = window.setTimeout(() => setTime(format()), 0);
    const id = window.setInterval(() => setTime(format()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return time;
}

export function Hero({ appHref, appLabel }: { appHref: string; appLabel: string }) {
  const root = useRef<HTMLElement>(null);
  const [callState, setCallState] = useState<CallState>('ringing');
  const time = useClock();

  useEffect(() => {
    const context = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        gsap.set('[data-hero-fade], [data-hero-line] > span, [data-call]', { opacity: 1, y: 0 });
        return;
      }
      const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
      timeline
        .from('[data-hero-line] > span', { yPercent: 110, duration: 1.4, stagger: 0.09 }, 0.15)
        .from('[data-hero-fade]', { opacity: 0, y: 18, duration: 1.1, stagger: 0.08 }, 0.7)
        .from('[data-call]', { opacity: 0, y: 40, scale: 0.94, duration: 1.2 }, 1.5);
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
      aria-labelledby="hero-title"
    >
      <SignalField className="absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#050606_0%,transparent_30%,transparent_70%,rgba(5,6,6,0.6)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#050606]" />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 pt-28 pb-10 sm:px-8 lg:px-12 lg:pt-32">
        <div className="flex items-start justify-between gap-6" data-hero-fade>
          <p className="max-w-[17rem] text-sm leading-6 text-zinc-400">
            Phone calls, retries and escalation for Grafana alerts.
          </p>
          <p className="hidden text-right font-mono text-xs leading-5 text-zinc-500 sm:block">
            <span className="text-zinc-300 tabular-nums">{time ?? '--:--:--'}</span>
            <br />
            your time, wherever the pager is
          </p>
        </div>

        <div className="mt-auto grid items-end gap-10 pt-16 lg:grid-cols-[1fr_auto] lg:gap-14">
          <div>
            <h1
              id="hero-title"
              className="font-display text-[13.5vw] sm:text-[clamp(2.6rem,9.2vw,9.6rem)] leading-[0.86] font-extrabold tracking-[-0.045em] text-white uppercase"
            >
              <span className="line-mask" data-hero-line>
                <span className="block">Someone</span>
              </span>
              <span className="line-mask" data-hero-line>
                <span className="block">has to</span>
              </span>
              <span className="line-mask" data-hero-line>
                <span className="block text-signal">wake up.</span>
              </span>
            </h1>

            <div className="mt-9 flex flex-col gap-8 xl:max-w-3xl xl:flex-row xl:items-end xl:justify-between">
              <p className="max-w-md text-base leading-7 text-zinc-400 sm:text-lg" data-hero-fade>
                When a Grafana alert fires, WakeOps calls the engineer who owns that service. If
                they sleep through it, it calls again, then calls their senior.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-3" data-hero-fade>
                <Magnetic>
                  <Link
                    href={appHref}
                    className="group relative inline-flex h-13 items-center gap-3 overflow-hidden rounded-full bg-signal px-6 text-sm font-bold text-black"
                  >
                    <span className="absolute inset-0 translate-y-full rounded-full bg-white transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
                    <span className="relative">{appLabel}</span>
                    <span className="relative grid size-6 place-items-center rounded-full bg-black text-signal transition-transform duration-500 ease-out-expo group-hover:rotate-[-45deg]">
                      <svg
                        viewBox="0 0 16 16"
                        className="size-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 8h10M9 4l4 4-4 4" />
                      </svg>
                    </span>
                  </Link>
                </Magnetic>
                <LandingScrollLink
                  target="sequence"
                  className="inline-flex h-13 items-center rounded-full border border-white/12 px-5 text-sm font-semibold text-zinc-300 backdrop-blur transition hover:border-white/30 hover:text-white"
                >
                  Watch a call unfold
                </LandingScrollLink>
              </div>
            </div>
          </div>

          <IncomingCall state={callState} onChange={setCallState} />
        </div>
      </div>
    </section>
  );
}

type CallState = 'ringing' | 'acknowledged' | 'declined';

function IncomingCall({
  state,
  onChange,
}: {
  state: CallState;
  onChange: (state: CallState) => void;
}) {
  const ringing = state === 'ringing';
  const acknowledged = state === 'acknowledged';
  const accent = acknowledged ? 'bg-signal' : state === 'declined' ? 'bg-ring' : 'bg-alarm';

  const status = {
    ringing: ['Incoming call', 'Critical'],
    acknowledged: ['Connected 00:04', 'Acknowledged'],
    declined: ['Call declined', 'Escalating'],
  }[state];

  const message = {
    ringing: 'Error rate is 8.7% on ip-10-0-3-17. You are on call for this service.',
    acknowledged: 'Thanks Riya. Slack and email have the details. Arjun will not be called.',
    declined: 'No problem. Calling Arjun, the senior engineer for checkout-api, now.',
  }[state];

  return (
    <div data-call className="relative w-full max-w-[22rem] justify-self-start lg:justify-self-end">
      <div className={ringing ? 'buzz' : ''}>
        <div className="signal-edge overflow-hidden rounded-[28px] bg-[#0b0d0c]/80 p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="font-mono">{status[0]}</span>
            <span className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${accent}`} />
              {status[1]}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative grid size-14 shrink-0 place-items-center">
              {ringing && (
                <>
                  <span className="ripple absolute inset-0 rounded-full border border-alarm/50" />
                  <span className="ripple absolute inset-0 rounded-full border border-alarm/40 [animation-delay:0.6s]" />
                </>
              )}
              <span
                className={`relative grid size-14 place-items-center rounded-full font-display text-lg font-black text-black transition-colors duration-700 ${accent}`}
              >
                W
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-white">WakeOps</p>
              <p className="truncate text-sm text-zinc-400">
                checkout-api is failing in production
              </p>
            </div>
          </div>

          <p
            key={state}
            aria-live="polite"
            className="rise mt-5 min-h-[6.5rem] rounded-2xl bg-white/[0.04] p-4 text-sm leading-6 text-zinc-300"
          >
            {message}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ringing ? (
              <>
                <button
                  type="button"
                  onClick={() => onChange('declined')}
                  className="h-11 rounded-full bg-white/[0.06] text-sm font-semibold text-zinc-300 transition hover:bg-alarm hover:text-black"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => onChange('acknowledged')}
                  className="h-11 rounded-full bg-signal text-sm font-bold text-black transition hover:bg-white"
                >
                  Acknowledge
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onChange('ringing')}
                className="col-span-2 h-11 rounded-full border border-white/10 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                Ring again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
