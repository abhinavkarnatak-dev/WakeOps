'use client';

import { useActionState } from 'react';
import { useActionToast } from '@/components/toast-provider';

import { createOrganization, type CreateOrganizationState } from './actions';

const initialState: CreateOrganizationState = {};

export function OrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="mt-10 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-400">Organization name</span>
        <input
          autoComplete="organization"
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-lg text-white outline-none transition placeholder:text-zinc-600 focus:border-signal focus:bg-signal/[0.04] focus:shadow-[0_0_0_4px_rgba(190,242,100,0.08)]"
          maxLength={80}
          minLength={2}
          name="name"
          placeholder="Acme Engineering"
          required
        />
      </label>
      <button
        className="h-14 w-full rounded-full bg-signal font-semibold text-black transition hover:bg-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Creating...' : 'Create organization'}
      </button>
    </form>
  );
}
