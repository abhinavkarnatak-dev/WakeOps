'use client';

import { useActionState, useEffect, useId, useRef, type ReactNode } from 'react';
import { useActionToast } from '@/components/toast-provider';
import { saveSetup, type SetupState } from './actions';

export function DeleteRecord({
  kind,
  recordId,
  disabled,
  compact,
  children,
}: {
  kind: string;
  recordId?: string;
  disabled: boolean;
  compact: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [state, action, pending] = useActionState(saveSetup, {} as SetupState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) dialog.current?.close();
  }, [state.success]);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
        aria-label={`Delete ${kind}`}
        title={`Delete ${kind}`}
        className={
          compact
            ? 'grid size-8 place-items-center rounded-lg text-red-300 hover:bg-red-950/50 disabled:opacity-50'
            : 'rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50'
        }
      >
        {compact ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
          </svg>
        ) : (
          'Delete'
        )}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (!pending && event.target === dialog.current) dialog.current.close();
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-[#0c0d0d] p-6 text-zinc-100 shadow-2xl backdrop:bg-black/75"
      >
        <h2 id={headingId} className="text-xl font-semibold">
          Delete {kind}?
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          {kind === 'host'
            ? 'This removes the host and every service deployment attached to it. Contacts, applications and environments are kept.'
            : kind === 'deployment'
              ? 'This removes the service from this host and deletes its on-call assignment. The host and service are kept.'
              : 'This permanently removes the saved record. Records used by a resource cannot be deleted.'}
        </p>
        {children && <div className="mt-3">{children}</div>}
        <form action={action} className="mt-5">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="operation" value="delete" />
          <input type="hidden" name="recordId" value={recordId} />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || disabled}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {pending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
