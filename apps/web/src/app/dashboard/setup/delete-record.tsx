'use client';

import { useActionState, useId, useRef, type ReactNode } from 'react';
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
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
        className={
          compact
            ? 'rounded-md px-2 py-1 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50'
            : 'rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50'
        }
      >
        Delete
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl backdrop:bg-black/70"
      >
        <h2 id={headingId} className="text-xl font-semibold">
          Delete {kind}?
        </h2>
        <p className="mt-3 text-sm text-slate-300">
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
          {state.error && (
            <p role="alert" className="mb-4 text-sm text-red-300">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
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
