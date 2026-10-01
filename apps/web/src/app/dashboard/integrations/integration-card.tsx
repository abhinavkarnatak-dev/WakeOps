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
      ? 'border-lime-400/20 bg-lime-400/8 text-lime-300'
      : tone === 'amber'
        ? 'border-amber-400/20 bg-amber-400/8 text-amber-300'
        : 'border-white/10 bg-white/[0.025] text-zinc-400';

  return (
    <>
      <section className="flex min-h-64 flex-col rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-white/15 hover:bg-white/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-11 place-items-center rounded-xl border border-white/8 bg-black/25 text-xs font-black tracking-[0.12em] text-zinc-300">
            <IntegrationLogo service={service} />
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs ${statusStyle}`}>{status}</span>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">{name}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="mt-auto flex items-center justify-between border-t border-white/8 pt-5 text-sm font-semibold text-zinc-200 transition hover:text-lime-300"
        >
          <span>{status === 'Not connected' ? 'Connect service' : 'Manage connection'}</span>
          <span aria-hidden="true">-&gt;</span>
        </button>
      </section>

      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        className="fixed inset-0 m-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0d0d] p-0 text-white shadow-2xl backdrop:bg-black/80"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#0c0d0d]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Service connection
            </p>
            <h2 id={headingId} className="mt-1 text-xl font-semibold text-white">
              {name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="grid size-9 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label={`Close ${name} settings`}
          >
            x
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </dialog>
    </>
  );
}
