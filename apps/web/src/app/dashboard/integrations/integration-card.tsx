'use client';

import { useId, useRef, type ReactNode } from 'react';

function IntegrationLogo({ service }: { service: 'email' | 'slack' | 'grafana' }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        display: 'block',
        backgroundImage: `url('/integrations/${service}.svg')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
      }}
    />
  );
}

export function IntegrationCard({
  name,
  description,
  status,
  tone,
  service,
  children,
}: {
  name: string;
  description: string;
  status: string;
  tone: 'lime' | 'amber' | 'zinc';
  service: 'email' | 'slack' | 'grafana';
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const statusStyle =
    tone === 'lime'
      ? 'border-signal/25 bg-signal/10 text-signal'
      : tone === 'amber'
        ? 'border-amber-400/20 bg-amber-400/8 text-amber-300'
        : 'border-white/10 bg-white/[0.025] text-zinc-400';

  return (
    <>
      <section className="group relative flex min-h-72 flex-col overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.015] p-6 transition duration-500 hover:border-white/15 hover:bg-white/[0.03]">
        <span
          className={`pointer-events-none absolute -top-20 -right-20 size-48 rounded-full blur-3xl transition-opacity duration-700 ${
            tone === 'lime'
              ? 'bg-signal/10 opacity-100'
              : 'bg-white/5 opacity-0 group-hover:opacity-100'
          }`}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="relative grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-black/40">
            <IntegrationLogo service={service} />
          </div>
          <span
            className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${statusStyle}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {status}
          </span>
        </div>
        <h2 className="relative mt-8 text-2xl font-semibold tracking-[-0.02em] text-white">
          {name}
        </h2>
        <p className="relative mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="relative mt-auto flex h-11 items-center justify-between rounded-full border border-white/10 pr-1.5 pl-5 text-sm font-medium text-zinc-200 transition hover:border-signal hover:bg-signal hover:text-black"
        >
          <span>{status === 'Not connected' ? `Connect ${name}` : 'Manage connection'}</span>
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-white/[0.06]"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-3.5"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </button>
      </section>

      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        className="fixed inset-0 m-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0c0b] p-0 text-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0a0c0b]/90 px-5 py-4 backdrop-blur-xl sm:px-7">
          <div>
            <h2 id={headingId} className="text-xl font-semibold text-white">
              {name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="grid size-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label={`Close ${name} settings`}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="size-3.5"
              aria-hidden="true"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </dialog>
    </>
  );
}
