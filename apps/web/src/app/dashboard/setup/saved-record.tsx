'use client';

import { useCallback, useId, useRef, type ReactNode } from 'react';
import { SetupForm } from './setup-form';

export function SavedRecord({
  kind,
  recordId,
  value,
  editFields,
  editable,
}: {
  kind: string;
  recordId: string;
  value: ReactNode;
  editFields: ReactNode;
  editable: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const closeDialog = useCallback(() => dialog.current?.close(), []);
  return (
    <li className="border-b border-white/6 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 break-words">{value}</div>
        {editable && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => dialog.current?.showModal()}
              aria-label={`Edit ${kind}`}
              title={`Edit ${kind}`}
              className="grid size-8 place-items-center rounded-lg text-lime-300 transition hover:bg-white/5"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.9 3.9 3.2 3.2M4 20l4.2-1 11-11a2.26 2.26 0 0 0-3.2-3.2l-11 11L4 20Z"
                />
              </svg>
            </button>
            <SetupForm kind={kind} operation="delete" recordId={recordId} compact>
              {null}
            </SetupForm>
          </div>
        )}
      </div>
      {editable && (
        <dialog
          ref={dialog}
          aria-labelledby={headingId}
          onClick={(event) => {
            if (event.target === dialog.current) dialog.current.close();
          }}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl rounded-[28px] border border-white/10 bg-[#0a0c0b] p-7 text-zinc-100 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        >
          <div className="mb-5 border-b border-white/8 pb-4">
            <h2 id={headingId} className="text-xl font-semibold text-white">
              Edit {kind}
            </h2>
          </div>
          <SetupForm
            kind={kind}
            operation="update"
            recordId={recordId}
            onSuccess={closeDialog}
            onCancel={closeDialog}
          >
            {editFields}
          </SetupForm>
        </dialog>
      )}
    </li>
  );
}
