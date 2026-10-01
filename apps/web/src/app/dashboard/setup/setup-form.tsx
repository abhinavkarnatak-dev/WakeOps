'use client';

import { useActionState, useEffect, type ReactNode } from 'react';
import { useActionToast } from '@/components/toast-provider';
import { saveSetup, type SetupState } from './actions';
import { DeleteRecord } from './delete-record';

export function SetupForm({
  kind,
  children,
  disabled = false,
  operation = 'create',
  recordId,
  compact = false,
  onSuccess,
  onCancel,
}: {
  kind: string;
  children: ReactNode;
  disabled?: boolean;
  operation?: 'create' | 'update' | 'delete';
  recordId?: string;
  compact?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(saveSetup, {} as SetupState);
  useActionToast(state);
  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [onSuccess, state.success]);
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
      <div className={operation === 'update' ? 'flex justify-end gap-3 pt-1' : ''}>
        {operation === 'update' && onCancel && (
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || pending}
          className={
            compact
              ? 'rounded-md px-2 py-1 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50'
              : 'rounded-xl bg-lime-300 px-4 py-2 font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-50'
          }
        >
          {pending ? 'Working...' : operation === 'update' ? 'Save changes' : 'Save'}
        </button>
      </div>
    </form>
  );
}
