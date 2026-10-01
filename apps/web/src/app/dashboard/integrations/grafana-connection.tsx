'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { CopyValueButton } from '@/components/copy-value-button';
import { useActionToast } from '@/components/toast-provider';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useActionToast(state);

  useEffect(() => {
    if (state.success === 'Grafana disconnected. The previous secret no longer works.') {
      dialog.current?.close();
    }
  }, [state.success]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold">Grafana credentials</p>
          <p className="mt-1 text-sm text-zinc-400">
            {lastVerifiedAt
              ? `Connected. Last webhook received ${new Date(lastVerifiedAt).toLocaleString()}.`
              : configured
                ? 'Connection credentials are ready. Webhook testing is tracked separately.'
                : 'Generate credentials before creating the Grafana contact point.'}
          </p>
          {configured && secretHint && (
            <p className="mt-1 text-xs text-zinc-500">Current secret ends with {secretHint}</p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            configured ? 'border-lime-400/25 text-lime-300' : 'border-white/10 text-zinc-300'
          }`}
        >
          {configured ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {state.secret && (
        <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/30 p-4">
          <p className="font-semibold text-amber-200">Copy this secret now</p>
          <p className="mt-1 text-sm text-zinc-300">
            WakeOps stores only its hash, so this value will not be shown again.
          </p>
          <div className="relative mt-3">
            <code className="block overflow-x-auto rounded border border-white/5 bg-black/35 p-3 pr-12 text-sm text-lime-200">
              {state.secret}
            </code>
            <CopyValueButton
              value={state.secret}
              label="Copy Grafana secret"
              successMessage="Grafana secret copied."
              className="absolute top-1/2 right-2 -translate-y-1/2"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="operation" value={configured ? 'rotate' : 'generate'} />
          <button
            disabled={pending}
            className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-50"
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
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-white/10 bg-[#0c0d0d] p-6 text-zinc-100 shadow-2xl backdrop:bg-black/70"
      >
        <h2 id={headingId} className="text-xl font-semibold">
          Disconnect Grafana?
        </h2>
        <p className="mt-3 text-sm text-zinc-300">
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
              className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
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
