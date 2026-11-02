'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    title: 'Calls that wake people',
    tag: 'Voice',
    body: 'A real phone call to the engineer assigned to the service, reading out the environment, host and alert name.',
  },
  {
    title: 'Retries, then a senior',
    tag: 'Escalation',
    body: 'Unanswered calls are tried again, then handed to the senior engineer for that service.',
  },
  {
    title: 'Slack and email, side by side',
    tag: 'Channels',
    body: 'Each channel is delivered on its own queue, so one provider going down never blocks another.',
  },
  {
    title: 'One alert, one incident',
    tag: 'Dedupe',
    body: 'Repeat deliveries of a problem that is still active are recognised and ignored.',
  },
  {
    title: 'Every attempt on record',
    tag: 'Timeline',
    body: 'Each incident has its own page with calls, messages, acknowledgement and an audit trail.',
  },
];

export function CapabilityIndex() {
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.utils.toArray<HTMLElement>('[data-rule]').forEach((rule) => {
        gsap.from(rule, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.4,
          ease: 'expo.out',
          scrollTrigger: { trigger: rule, start: 'top 92%' },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-row-title]').forEach((title) => {
        gsap.from(title, {
          yPercent: 100,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: title, start: 'top 95%' },
        });
      });
    }, list);
    return () => context.revert();
  }, []);

  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-title"
      className="relative bg-[#050606] py-28 sm:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2
            id="capabilities-title"
            className="font-display text-[clamp(2.2rem,5.4vw,5rem)] leading-[0.92] font-extrabold tracking-[-0.045em] text-white uppercase"
          >
            Built for the
            <br />
            worst hour
            <br />
            of the night.
          </h2>
          <p className="max-w-md text-base leading-7 text-zinc-400 lg:justify-self-end">
            WakeOps does one job: get a firing Grafana alert to a person who can fix it, and keep a
            clear record of how that happened.
          </p>
        </div>

        <ul ref={list} className="mt-20 sm:mt-28">
          {capabilities.map((capability) => (
            <li key={capability.title} className="group relative">
              <div data-rule className="h-px bg-white/12" />
              <div className="relative overflow-hidden">
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-signal transition-transform duration-700 ease-out-expo group-hover:scale-y-100" />
                <div className="relative grid gap-4 py-8 transition-colors duration-500 group-hover:text-black sm:py-10 lg:grid-cols-[1.3fr_1fr_7rem] lg:items-center lg:gap-10">
                  <span className="line-mask">
                    <span
                      data-row-title
                      className="block text-[clamp(1.7rem,3.6vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white transition-[color,transform] duration-500 ease-out-expo group-hover:translate-x-4 group-hover:text-black"
                    >
                      {capability.title}
                    </span>
                  </span>
                  <p className="max-w-md text-sm leading-6 text-zinc-400 transition-colors duration-500 group-hover:text-black/75 sm:text-base">
                    {capability.body}
                  </p>
                  <span className="justify-self-start rounded-full border border-white/12 px-3 py-1 font-mono text-[11px] text-zinc-400 transition-colors duration-500 group-hover:border-black/20 group-hover:text-black lg:justify-self-end">
                    {capability.tag}
                  </span>
                </div>
              </div>
            </li>
          ))}
          <li aria-hidden="true">
            <div data-rule className="h-px bg-white/12" />
          </li>
        </ul>
      </div>
    </section>
  );
}
