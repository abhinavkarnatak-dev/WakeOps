'use client';

import { useActionState, useId, useRef, useState } from 'react';
import { manageGrafanaConnection, type GrafanaConnectionState } from './actions';

type Props = {
  configured: boolean;
  secretHint: string | null;
  lastVerifiedAt: string | null;
};

export function GrafanaConnection({ configured, secretHint, lastVerifiedAt }: Props) {
  const [state, action, pending] = useActionState<GrafanaConnectionState, FormData>(
    manageGrafanaConnection,
    {},
  );
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  async function copySecret() {
    if (!state.secret) return;
    await navigator.clipboard.writeText(state.secret);
    setCopied(true);
  }

  return (
    <div className="rounded-lg border border-slate-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold">Grafana credentials</p>
          <p className="mt-1 text-sm text-slate-400">
            {lastVerifiedAt
              ? `Verified ${new Date(lastVerifiedAt).toLocaleString()}`
              : configured
                ? 'Configured, waiting for a successful Grafana test.'
                : 'Generate credentials before creating the Grafana contact point.'}
          </p>
          {configured && secretHint && (
            <p className="mt-1 text-xs text-slate-500">Current secret ends with {secretHint}</p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            lastVerifiedAt
              ? 'border-emerald-700 text-emerald-300'
              : configured
                ? 'border-amber-700 text-amber-300'
                : 'border-slate-600 text-slate-300'
          }`}
        >
          {lastVerifiedAt ? 'Connected' : configured ? 'Needs test' : 'Not connected'}
        </span>
      </div>

      {state.error && <p className="mt-4 text-sm text-red-300">{state.error}</p>}
      {state.success && <p className="mt-4 text-sm text-emerald-300">{state.success}</p>}
      {state.secret && (
        <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/30 p-4">
          <p className="font-semibold text-amber-200">Copy this secret now</p>
          <p className="mt-1 text-sm text-slate-300">
            WakeOps stores only its hash, so this value will not be shown again.
          </p>
          <code className="mt-3 block overflow-x-auto rounded bg-slate-950 p-3 text-sm text-cyan-200">
            {state.secret}
          </code>
          <button
            type="button"
            onClick={copySecret}
            className="mt-3 rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-200"
          >
            {copied ? 'Copied' : 'Copy secret'}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="operation" value={configured ? 'rotate' : 'generate'} />
          <button
            disabled={pending}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? 'Saving...' : configured ? 'Rotate secret' : 'Generate credentials'}
          </button>
        </form>
        {configured && (
          <button
            type="button"
            disabled={pending}
            onClick={() => dialog.current?.showModal()}
            className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
          >
            Disconnect
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl backdrop:bg-black/70"
      >
        <h2 id={headingId} className="text-xl font-semibold">
          Disconnect Grafana?
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          The current secret will stop working and the saved test receipt will be removed. You can
          generate new credentials later.
        </p>
        <form action={action} className="mt-5">
          <input type="hidden" name="operation" value="disconnect" />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
