'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

type Line = { indent: number; text: string; key?: string; value?: string; mapsTo?: number };

const payload: Line[] = [
  { indent: 0, text: '{' },
  { indent: 1, text: '', key: 'status', value: '"firing"' },
  { indent: 1, text: '', key: 'receiver', value: '"wakeops"' },
  { indent: 1, text: '"alerts": [{' },
  { indent: 2, text: '"labels": {' },
  { indent: 3, text: '', key: 'alertname', value: '"High 5xx rate"', mapsTo: 0 },
  { indent: 3, text: '', key: 'service', value: '"checkout-api"', mapsTo: 1 },
  { indent: 3, text: '', key: 'environment', value: '"production"', mapsTo: 2 },
  { indent: 3, text: '', key: 'instance', value: '"ip-10-0-3-17"', mapsTo: 3 },
  { indent: 3, text: '', key: 'severity', value: '"critical"', mapsTo: 4 },
  { indent: 2, text: '}' },
  { indent: 1, text: '}]' },
  { indent: 0, text: '}' },
];

const mapped = [
  ['Alert', 'High 5xx rate'],
  ['Service', 'checkout-api'],
  ['Environment', 'production'],
  ['Host', 'ip-10-0-3-17'],
  ['Severity', 'Critical'],
];

const checks = [
  'Per-organization secret, stored only as a hash',
  'Test the connection before you rely on it',
  'Firing and recovered events both handled',
  'Webhook answers fast, the call runs in the background',
];

export function PayloadMap() {
  const root = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const id = window.setTimeout(() => setRevealed(mapped.length), 0);
      return () => window.clearTimeout(id);
    }
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top 70%' },
      });
      timeline.from('[data-code-line]', {
        opacity: 0,
        x: -12,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power3.out',
      });
      mapped.forEach((_, index) => {
        timeline.call(() => setRevealed(index), [], `>+0.32`);
      });
      timeline.call(() => setRevealed(mapped.length), [], '>+0.4');
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      id="grafana"
      aria-labelledby="grafana-title"
      className="relative overflow-hidden bg-[#050606] pb-28 sm:pb-40"
    >
      <div
        ref={root}
        className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12"
      >
        <div className="lg:pt-10">
          <span
            aria-hidden="true"
            className="block size-12 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/integrations/grafana.svg')" }}
          />
          <h2
            id="grafana-title"
            className="mt-8 text-[clamp(2rem,4vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-white"
          >
            Your labels already say who to call.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">
            Add one webhook as a Grafana contact point. WakeOps reads the service, environment and
            instance labels on every alert and matches them to the engineers you assigned.
          </p>
          <ul className="mt-10 space-y-4">
            {checks.map((check) => (
              <li key={check} className="flex gap-3 text-sm text-zinc-300">
                <svg
                  viewBox="0 0 16 16"
                  className="mt-0.5 size-4 shrink-0 text-signal"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m3 8.5 3 3 7-7" />
                </svg>
                {check}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(244,104,0,0.12),transparent)] blur-2xl" />
          <div className="signal-edge relative overflow-hidden rounded-[28px] bg-[#0a0c0b]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
              <span className="font-mono text-xs text-zinc-500">POST /webhooks/grafana</span>
              <span className="rounded-full bg-signal/10 px-2.5 py-1 font-mono text-[11px] text-signal">
                202 Accepted
              </span>
            </div>

            <div className="grid sm:grid-cols-[1.25fr_1fr]">
              <pre className="overflow-x-auto border-b border-white/8 p-5 font-mono text-[12.5px] leading-6 sm:border-r sm:border-b-0">
                <code>
                  {payload.map((line, index) => {
                    const lit = line.mapsTo !== undefined && revealed >= line.mapsTo;
                    return (
                      <span
                        key={index}
                        data-code-line
                        className={`-mx-2 block rounded px-2 transition-colors duration-500 ${lit ? 'bg-signal/[0.08]' : ''}`}
                        style={{ paddingLeft: `${line.indent * 1.1 + 0.5}rem` }}
                      >
                        {line.key ? (
                          <>
                            <span className={lit ? 'text-signal' : 'text-zinc-400'}>
                              &quot;{line.key}&quot;
                            </span>
                            <span className="text-zinc-600">: </span>
                            <span className={lit ? 'text-white' : 'text-zinc-500'}>
                              {line.value}
                            </span>
                            <span className="text-zinc-700">,</span>
                          </>
                        ) : (
                          <span className="text-zinc-600">{line.text}</span>
                        )}
                      </span>
                    );
                  })}
                </code>
              </pre>

              <div className="p-5">
                <p className="text-xs text-zinc-500">WakeOps reads</p>
                <dl className="mt-4 space-y-2">
                  {mapped.map(([label, value], index) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-500 ease-out-expo ${
                        revealed >= index
                          ? 'translate-x-0 border-white/10 bg-white/[0.03] opacity-100'
                          : 'translate-x-3 border-transparent opacity-0'
                      }`}
                    >
                      <dt className="text-zinc-500">{label}</dt>
                      <dd className="truncate font-medium text-white">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div
                  className={`mt-5 rounded-2xl border p-4 transition-all duration-700 ease-out-expo ${
                    revealed >= mapped.length
                      ? 'border-signal/30 bg-signal/[0.08] opacity-100'
                      : 'border-white/8 opacity-30'
                  }`}
                >
                  <p className="text-xs text-zinc-400">Calling first</p>
                  <p className="mt-1 text-lg font-semibold text-white">Riya, on call</p>
                  <p className="mt-0.5 text-sm text-zinc-500">Arjun if she misses it</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
