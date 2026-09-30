'use client';

import { useActionState } from 'react';

import { createOrganization, type CreateOrganizationState } from './actions';

const initialState: CreateOrganizationState = {};

export function OrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Organization name</span>
        <input
          autoComplete="organization"
          className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-300"
          maxLength={80}
          minLength={2}
          name="name"
          placeholder="Acme Engineering"
          required
        />
      </label>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button
        className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Creating…' : 'Create organization'}
      </button>
    </form>
  );
}
