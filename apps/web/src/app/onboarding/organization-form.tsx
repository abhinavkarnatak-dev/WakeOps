'use client';

import { useActionState } from 'react';
import { useActionToast } from '@/components/toast-provider';

import { createOrganization, type CreateOrganizationState } from './actions';

const initialState: CreateOrganizationState = {};

export function OrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);
  useActionToast(state);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Organization name</span>
        <input
          autoComplete="organization"
          className="w-full rounded-xl border border-white/10 bg-[#101111] px-4 py-3 outline-none transition focus:border-lime-300"
          maxLength={80}
          minLength={2}
          name="name"
          placeholder="Acme Engineering"
          required
        />
      </label>
      <button
        className="rounded-xl bg-lime-300 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Creating...' : 'Create organization'}
      </button>
    </form>
  );
}
