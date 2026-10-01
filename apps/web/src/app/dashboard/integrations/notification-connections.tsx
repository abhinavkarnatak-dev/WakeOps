'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useActionToast, useToast } from '@/components/toast-provider';

import {
  disconnectSlack,
  saveSlackDestination,
  testEmail,
  testSlack,
} from './notification-actions';

type SlackChannel = { id: string; name: string };

export function EmailConnection({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(testEmail, {});
  useActionToast(state);
  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-300">Email</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Engineer email alerts</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Incident details are sent to the on-call engineer without waiting for the phone call.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${configured ? 'border-lime-400/20 bg-lime-400/8 text-lime-300' : 'border-amber-400/20 bg-amber-400/8 text-amber-300'}`}
        >
          {configured ? 'Configured' : 'Needs setup'}
        </span>
      </div>
      <form action={action} className="mt-5">
        <button
          disabled={pending || !configured}
          className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Sending...' : 'Send test email'}
        </button>
      </form>
    </section>
  );
}

export function SlackConnection({
  connected,
  teamName,
  destination,
  channels,
  notice,
}: {
  connected: boolean;
  teamName: string | null;
  destination: string | null;
  channels: SlackChannel[];
  notice: string | null;
}) {
  const [saveState, saveAction, saving] = useActionState(saveSlackDestination, {});
  const [testState, testAction, testing] = useActionState(testSlack, {});
  const [disconnectState, disconnectAction, disconnecting] = useActionState(disconnectSlack, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const { showToast } = useToast();
  const router = useRouter();
  useActionToast(saveState);
  useActionToast(testState);
  useActionToast(disconnectState);

  useEffect(() => {
    if (!notice) return;
    showToast(notice, notice.startsWith('Slack connected') ? 'success' : 'error');
    router.replace('/dashboard/integrations', { scroll: false });
  }, [notice, router, showToast]);

  useEffect(() => {
    if (disconnectState.success) dialog.current?.close();
  }, [disconnectState.success]);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-300">Slack</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Workspace notifications</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Connect a Slack workspace and choose one channel for incident alerts.
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${connected ? 'border-lime-400/20 bg-lime-400/8 text-lime-300' : 'border-white/10 bg-white/[0.025] text-zinc-400'}`}
        >
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {!connected ? (
        <a
          href="/api/integrations/slack/connect"
          className="mt-5 inline-flex rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200"
        >
          Connect Slack
        </a>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-white/8 bg-black/20 p-4 text-sm">
            <p className="text-zinc-500">Connected workspace</p>
            <p className="mt-1 font-medium text-white">{teamName}</p>
            <p className="mt-3 text-zinc-500">Current destination</p>
            <p className="mt-1 font-medium text-white">
              {destination ? `#${destination}` : 'Not selected'}
            </p>
          </div>
          <form action={saveAction} className="flex flex-col gap-3 sm:flex-row">
            <select
              name="channelId"
              defaultValue=""
              required
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#101111] px-3 py-2.5 text-sm text-white outline-none focus:border-lime-300"
            >
              <option value="" disabled>
                Choose a Slack channel
              </option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            <button
              disabled={saving}
              className="rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save channel'}
            </button>
          </form>
          <div className="flex flex-wrap gap-3">
            <form action={testAction}>
              <button
                disabled={testing || !destination}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 disabled:opacity-40"
              >
                {testing ? 'Sending...' : 'Send test message'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => dialog.current?.showModal()}
              className="rounded-xl border border-rose-400/20 px-4 py-2.5 text-sm font-semibold text-rose-300"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-[#101111] p-6 text-white shadow-2xl backdrop:bg-black/75"
      >
        <h2 id={headingId} className="text-xl font-semibold">
          Disconnect Slack?
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          WakeOps will remove the stored encrypted token and stop sending Slack notifications.
        </p>
        <form action={disconnectAction} className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            disabled={disconnecting}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </form>
      </dialog>
    </section>
  );
}
