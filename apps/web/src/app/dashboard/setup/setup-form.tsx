'use client';

import { useActionState, type ReactNode } from 'react';
import { saveSetup, type SetupState } from './actions';
import { DeleteRecord } from './delete-record';

export function SetupForm({
  kind,
  children,
  disabled = false,
  operation = 'create',
  recordId,
  compact = false,
}: {
  kind: string;
  children: ReactNode;
  disabled?: boolean;
  operation?: 'create' | 'update' | 'delete';
  recordId?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(saveSetup, {} as SetupState);
  if (operation === 'delete')
    return (
      <DeleteRecord kind={kind} recordId={recordId} disabled={disabled} compact={compact}>
        {children}
      </DeleteRecord>
    );
  return (
    <form action={action} className={compact ? 'relative shrink-0' : 'space-y-4'}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="operation" value={operation} />
      {recordId && <input type="hidden" name="recordId" value={recordId} />}
      {children && (
        <fieldset className="space-y-4 disabled:opacity-50" disabled={disabled || pending}>
          {children}
        </fieldset>
      )}
      {state.error && (
        <p
          role="alert"
          className={
            compact
              ? 'absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-red-900 bg-slate-950 p-3 text-sm text-red-300 shadow-lg'
              : 'text-sm text-red-300'
          }
        >
          {state.error}
        </p>
      )}
      {state.success && !compact && (
        <p role="status" className="text-sm text-emerald-300">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={disabled || pending}
        className={
          compact
            ? 'rounded-md px-2 py-1 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50'
            : 'rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50'
        }
      >
        {pending ? 'Working...' : operation === 'update' ? 'Save changes' : 'Save'}
      </button>
    </form>
  );
}
