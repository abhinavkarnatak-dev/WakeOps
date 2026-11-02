'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

type Person = 'idle' | 'ringing' | 'missed' | 'answered';

const steps: {
  time: string;
  title: string;
  body: string;
  log: string;
  tone: 'alarm' | 'ring' | 'signal' | 'muted';
  riya: Person;
  arjun: Person;
  channels: boolean;
}[] = [
  {
    time: '03:07:01',
    title: 'Grafana fires',
    body: 'checkout-api crosses a 5% error rate in production. Grafana posts the alert to your WakeOps webhook, which answers in milliseconds.',
    log: 'POST /webhooks/grafana  202  41ms',
    tone: 'alarm',
    riya: 'idle',
    arjun: 'idle',
    channels: false,
  },
  {
    time: '03:07:02',
    title: 'Matched to an owner',
    body: 'Alert labels point to checkout-api on ip-10-0-3-17. Riya is on call and Arjun is her senior. A repeat delivery of the same problem is ignored.',
    log: 'mapped service=checkout-api env=production owner=riya',
    tone: 'muted',
    riya: 'idle',
    arjun: 'idle',
    channels: false,
  },
  {
    time: '03:07:04',
    title: "Riya's phone rings",
    body: 'WakeOps calls her and reads out the service, environment, host and alert. Slack and email go out at the same time.',
    log: 'call 1 to riya  ringing   slack + email queued',
    tone: 'ring',
    riya: 'ringing',
    arjun: 'idle',
    channels: true,
  },
  {
    time: '03:08:34',
    title: 'No answer, so it calls again',
    body: 'The workflow waits durably between attempts. A crashed server or a deploy does not lose its place.',
    log: 'call 1 no-answer   call 2 to riya ringing',
    tone: 'ring',
    riya: 'missed',
    arjun: 'idle',
    channels: true,
  },
  {
    time: '03:10:05',
    title: 'Escalated to Arjun',
    body: 'Two missed calls means the senior engineer gets woken instead. Nobody has to notice that the first call failed.',
    log: 'call 2 no-answer   escalate  call 3 to arjun ringing',
    tone: 'alarm',
    riya: 'missed',
    arjun: 'ringing',
    channels: true,
  },
  {
    time: '03:10:19',
    title: 'Acknowledged',
    body: 'Arjun picks up. The incident is marked acknowledged and every call, message and retry sits on its timeline.',
    log: 'acknowledged by arjun   3m 18s after the alert',
    tone: 'signal',
    riya: 'missed',
    arjun: 'answered',
    channels: true,
  },
];

const toneText = {
  alarm: 'text-alarm',
  ring: 'text-ring',
  signal: 'text-signal',
  muted: 'text-zinc-300',
};

export function Sequence() {
  const section = useRef<HTMLElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const context = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * steps.length * 0.75}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const index = Math.min(
            steps.length - 1,
            Math.floor(self.progress * steps.length * 0.999),
          );
          setActive((current) => (current === index ? current : index));
          if (fill.current) fill.current.style.transform = `scaleX(${self.progress})`;
        },
      });
      return () => trigger.kill();
    }, section);
    return () => context.revert();
  }, []);

  const step = steps[active];

  return (
    <section
      id="sequence"
      ref={section}
      aria-labelledby="sequence-title"
      className="relative flex h-[100svh] min-h-[620px] flex-col overflow-hidden bg-[#050606]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:calc(100%/6)_100%]" />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 pt-24 pb-8 sm:px-8 lg:px-12 lg:pt-28">
        <div className="flex items-baseline justify-between gap-6">
          <h2 id="sequence-title" className="text-sm text-zinc-400">
            How a call unfolds
          </h2>
          <p className="font-mono text-xs text-zinc-600">
            INC-4D8K29QF <span className="hidden sm:inline">checkout-api production</span>
          </p>
        </div>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <p
              className={`font-display text-[clamp(3rem,10vw,9rem)] leading-none font-extrabold tracking-[-0.05em] tabular-nums transition-colors duration-500 ${toneText[step.tone]}`}
              aria-label={step.time}
            >
              {step.time.split('').map((char, index) => (
                <span
                  key={`${index}-${char}`}
                  className="rise inline-block"
                  style={{ animationDelay: `${index * 18}ms` }}
                >
                  {char}
                </span>
              ))}
            </p>
            <div key={active} className="mt-6 max-w-xl sm:mt-8">
              <p className="rise font-mono text-xs text-zinc-500">
                Step {active + 1} of {steps.length}
              </p>
              <h3 className="rise mt-3 text-3xl font-semibold tracking-[-0.03em] text-white [animation-delay:60ms] sm:text-5xl">
                {step.title}
              </h3>
              <p className="rise mt-4 text-base leading-7 text-zinc-400 [animation-delay:120ms] sm:text-lg">
                {step.body}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <PersonCard name="Riya" role="On call" state={step.riya} />
              <PersonCard name="Arjun" role="Senior" state={step.arjun} />
            </div>
            <div className="hidden rounded-3xl border border-white/8 bg-[#0a0c0b] p-5 sm:block">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Workflow log</span>
                <span className="flex gap-2">
                  {['Phone', 'Slack', 'Email'].map((channel, index) => (
                    <span
                      key={channel}
                      className={`rounded-full border px-2.5 py-1 transition-colors duration-500 ${
                        (index === 0 ? step.riya !== 'idle' : step.channels)
                          ? 'border-signal/30 bg-signal/10 text-signal'
                          : 'border-white/8 text-zinc-600'
                      }`}
                    >
                      {channel}
                    </span>
                  ))}
                </span>
              </div>
              <ol className="mt-5 space-y-2.5 font-mono text-[12px] leading-5">
                {steps.map((entry, index) => (
                  <li
                    key={entry.time}
                    className={`flex gap-4 transition-all duration-500 ${
                      index > active
                        ? 'translate-y-1 opacity-0'
                        : index === active
                          ? 'text-white'
                          : 'text-zinc-600'
                    }`}
                  >
                    <span className={index === active ? toneText[entry.tone] : ''}>
                      {entry.time}
                    </span>
                    <span className="min-w-0 truncate">{entry.log}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="h-px w-full bg-white/10" />
          <div
            ref={fill}
            className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-signal shadow-[0_0_12px_#bef264]"
          />
          <ol className="mt-4 grid grid-cols-6 gap-2 font-mono text-[10px] text-zinc-600 sm:text-[11px]">
            {steps.map((entry, index) => (
              <li
                key={entry.time}
                className={`transition-colors ${index <= active ? 'text-zinc-300' : ''}`}
              >
                <span className="hidden sm:inline">{entry.time}</span>
                <span className="sm:hidden">{entry.time.slice(3)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PersonCard({ name, role, state }: { name: string; role: string; state: Person }) {
  const label = { idle: 'Asleep', ringing: 'Ringing', missed: 'Missed call', answered: 'Answered' }[
    state
  ];
  const tone = {
    idle: 'text-zinc-500',
    ringing: 'text-ring',
    missed: 'text-alarm',
    answered: 'text-signal',
  }[state];

  return (
    <div
      className={`rounded-3xl border p-4 transition-colors sm:p-5 duration-500 ${
        state === 'ringing'
          ? 'border-ring/30 bg-ring/[0.06]'
          : state === 'answered'
            ? 'border-signal/30 bg-signal/[0.07]'
            : 'border-white/8 bg-[#0a0c0b]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="relative grid size-11 place-items-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
          {state === 'ringing' && (
            <span className="ripple absolute inset-0 rounded-full border border-ring/60" />
          )}
          {name[0]}
        </span>
        <span className={`text-xs ${tone}`}>{label}</span>
      </div>
      <p className="mt-3 font-semibold text-white sm:mt-5">{name}</p>
      <p className="text-sm text-zinc-500">{role}</p>
    </div>
  );
}
