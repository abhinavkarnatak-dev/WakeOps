import Image from 'next/image';
import Link from 'next/link';

import { auth } from '@/auth';
import { LandingScrollLink } from '@/components/landing-scroll-link';

const workflow = [
  {
    number: '01',
    title: 'Grafana sends the alert',
    description: 'A Grafana contact point sends a signed webhook when an alert starts or recovers.',
  },
  {
    number: '02',
    title: 'WakeOps maps the service',
    description: 'Alert labels identify the host, application, environment, and assigned engineers.',
  },
  {
    number: '03',
    title: 'The engineer gets called',
    description: 'WakeOps calls the on-call engineer with the incident details and tracks the result.',
  },
  {
    number: '04',
    title: 'No answer means escalation',
    description: 'The call is retried, then escalated to the senior engineer when needed.',
  },
];

const capabilities = [
  {
    eyebrow: 'PHONE ALERTS',
    title: 'Reach people beyond another notification tab',
    description:
      'Assigned engineers receive a direct phone call with the service, environment, resource, and alert name.',
  },
  {
    eyebrow: 'RETRY AND ESCALATION',
    title: 'Keep moving when the first person does not answer',
    description:
      'WakeOps retries the on-call contact and moves to the senior contact based on the incident workflow.',
  },
  {
    eyebrow: 'EMAIL AND SLACK',
    title: 'Send the same context to every connected channel',
    description:
      'Email and Slack notifications are sent independently, so one provider failing does not block the others.',
  },
  {
    eyebrow: 'INCIDENT HISTORY',
    title: 'See exactly what happened after the alert arrived',
    description:
      'Each incident has its own page with call attempts, notification results, acknowledgement, and a timeline.',
  },
];

function WakeOpsBrand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="WakeOps home">
      <Image src="/icon.svg" alt="" width={38} height={38} priority />
      <span className="text-lg font-bold tracking-[-0.03em] text-white">WakeOps</span>
    </Link>
  );
}

export default async function HomePage() {
  const session = await auth();
  const appHref = session ? '/dashboard' : '/login';
  const appLabel = session ? 'Open dashboard' : 'Get started';

  return (
    <main className="min-h-screen overflow-hidden bg-[#050606] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_50%_-15%,rgba(190,242,100,0.14),transparent_52%)]" />

      <nav className="relative z-20 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <WakeOpsBrand />
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <LandingScrollLink target="how-it-works" className="transition hover:text-white">
            How it works
          </LandingScrollLink>
          <LandingScrollLink target="capabilities" className="transition hover:text-white">
            Capabilities
          </LandingScrollLink>
          <LandingScrollLink target="grafana" className="transition hover:text-white">
            Grafana
          </LandingScrollLink>
        </div>
        <Link
          href={appHref}
          className="rounded-xl border border-lime-300/25 bg-lime-300/8 px-4 py-2 text-sm font-semibold text-lime-200 transition hover:border-lime-300/50 hover:bg-lime-300/12"
        >
          {session ? 'Dashboard' : 'Sign in'}
        </Link>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100svh-78px)] max-w-[1280px] items-center gap-14 px-5 py-12 sm:px-8 sm:py-16 lg:h-[calc(100dvh-78px)] lg:min-h-0 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-0">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-lime-300">
            <span className="size-1.5 rounded-full bg-lime-300 shadow-[0_0_12px_#bef264]" />
            Grafana incident response
          </div>
          <h1 className="mt-7 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[82px]">
            Turn Grafana alerts into action.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            WakeOps receives your Grafana alerts, finds the engineer responsible for the affected
            service, calls them, retries unanswered calls, and escalates when necessary.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={appHref}
              className="rounded-xl bg-lime-300 px-5 py-3 text-center text-sm font-bold text-zinc-950 transition hover:bg-lime-200"
            >
              {appLabel}
            </Link>
            <LandingScrollLink
              target="how-it-works"
              className="rounded-xl border border-white/10 bg-white/[0.025] px-5 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            >
              See how it works
            </LandingScrollLink>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-500">
            {['Secure Grafana webhook', 'Duplicate alert protection', 'Durable call workflow'].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-lime-300" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-full bg-lime-300/[0.04] blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c0b] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-400" />
                <span className="size-2 rounded-full bg-amber-300" />
                <span className="size-2 rounded-full bg-lime-300" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Example incident
              </span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-red-400">
                    Critical alert
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Checkout API 5xx spike
                  </h2>
                </div>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-xs text-amber-200">
                  Notifying
                </span>
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Service', 'checkout-api'],
                  ['Environment', 'production'],
                  ['Instance', 'i-0f3a92c7b81e46d20'],
                  ['Error rate', '8.7%'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/7 bg-white/[0.025] p-3.5">
                    <dt className="text-xs text-zinc-600">{label}</dt>
                    <dd className="mt-1 break-all font-medium text-zinc-200">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 space-y-4 border-l border-white/10 pl-5">
                {[
                  ['Grafana alert received', '14:02:01', 'bg-lime-300'],
                  ['Incident INC-4D8KXXXX created', '14:02:02', 'bg-lime-300'],
                  ['Primary on-call ringing', '14:02:04', 'bg-amber-300'],
                ].map(([label, time, color]) => (
                  <div key={label} className="relative flex items-center justify-between gap-4">
                    <span className={`absolute -left-[23px] size-1.5 rounded-full ${color}`} />
                    <span className="text-sm text-zinc-300">{label}</span>
                    <span className="font-mono text-[11px] text-zinc-600">{time}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-xl border border-lime-300/15 bg-lime-300/[0.05] p-4">
                <span className="grid size-9 place-items-center rounded-full bg-lime-300 text-sm font-black text-black">
                  1
                </span>
                <div>
                  <p className="text-sm font-semibold text-lime-200">Call workflow active</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Attempt 1 of 2 - waiting for acknowledgement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative bg-[linear-gradient(180deg,#050606_0%,#080a09_18%,#080a09_100%)]"
      >
        <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              From firing alert to the right engineer.
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-500">
              WakeOps sits between Grafana and your on-call contacts. The webhook returns quickly
              while the call workflow continues safely in the background.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((step) => (
              <article key={step.number} className="bg-[#080a09] p-6 sm:p-7">
                <span className="font-mono text-xs text-lime-300">{step.number}</span>
                <h3 className="mt-8 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
              What WakeOps offers
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              A focused incident response loop.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-500">
            No crowded feature list. WakeOps focuses on receiving a Grafana alert, reaching the
            responsible engineer, and keeping a clear record of the response.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {capabilities.map((capability) => (
            <article
              key={capability.title}
              className="group rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition hover:border-lime-300/20 hover:bg-lime-300/[0.025] sm:p-8"
            >
              <p className="text-[10px] font-semibold tracking-[0.16em] text-lime-300">
                {capability.eyebrow}
              </p>
              <h3 className="mt-5 max-w-lg text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {capability.title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
                {capability.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="grafana" className="px-5 pb-24 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c0b] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex min-h-72 items-center justify-center border-b border-white/8 bg-[radial-gradient(circle_at_center,rgba(244,104,0,0.14),transparent_62%)] p-10 lg:border-r lg:border-b-0">
            <div className="grid size-32 place-items-center rounded-3xl border border-orange-400/20 bg-black/35 shadow-2xl shadow-orange-950/30">
              <span
                aria-hidden="true"
                style={{
                  width: 72,
                  height: 72,
                  display: 'block',
                  backgroundImage: "url('/integrations/grafana.svg')",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                }}
              />
            </div>
          </div>
          <div className="p-7 sm:p-10 lg:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
              Built for Grafana alerts
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              One secure webhook connects Grafana to WakeOps.
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-500">
              Add the organization webhook as a Grafana contact point. When an alert fires,
              WakeOps validates the secret, reads the labels, maps the affected service, and starts
              the incident workflow.
            </p>
            <div className="mt-7 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
              {[
                'Connection testing',
                'Secret verification',
                'Service label mapping',
                'Duplicate alert protection',
                'Firing and recovery events',
                'Fast webhook response',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-lime-300">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/7 px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
            Start your incident flow
          </p>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            Make sure a critical Grafana alert reaches a person.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-500">
            Create your organization, map services to engineers, connect Grafana, and test the full
            flow before relying on it.
          </p>
          <Link
            href={appHref}
            className="mt-9 rounded-xl bg-lime-300 px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-lime-200"
          >
            {appLabel}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/7">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <WakeOpsBrand />
          <p className="text-xs text-zinc-600">Grafana alerting, engineer calls, and escalation.</p>
        </div>
      </footer>
    </main>
  );
}
