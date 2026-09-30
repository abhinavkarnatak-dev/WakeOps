'use client';

import { useState, type ReactNode } from 'react';
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
  const [editing, setEditing] = useState(false);
  return (
    <li className="border-b border-slate-800 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 break-words">{value}</div>
        {editable && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
              className="rounded-md px-2 py-1 text-cyan-300 hover:bg-slate-800"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <SetupForm kind={kind} operation="delete" recordId={recordId} compact>
              {null}
            </SetupForm>
          </div>
        )}
      </div>
      {editing && editable && (
        <div className="mt-4">
          <SetupForm kind={kind} operation="update" recordId={recordId}>
            {editFields}
          </SetupForm>
        </div>
      )}
    </li>
  );
}
