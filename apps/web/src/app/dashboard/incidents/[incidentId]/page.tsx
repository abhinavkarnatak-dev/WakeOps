import { database } from '@wakeops/database';
import { maskPhoneNumber } from '@wakeops/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatDuration } from '@/components/dashboard-ui';
import {
  CallStatus,
  formatDate,
  IncidentStatus,
  Panel,
  Severity,
  shortIncidentId,
} from '@/components/incident-ui';

function eventTone(type: string) {
  if (type === 'ALERT_RECEIVED' || type === 'INCIDENT_CREATED') return 'bg-alarm';
  if (type.startsWith('CALL')) return 'bg-ring';
  if (type.startsWith('NOTIFICATION')) return 'bg-sky-300';
  if (type === 'ACKNOWLEDGED' || type === 'INCIDENT_RESOLVED') return 'bg-signal';
  return 'bg-zinc-500';
}
import { requireOrganization } from '@/lib/organization';

type DetailValue = Record<string, unknown>;

function details(value: unknown): DetailValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as DetailValue) : {};
}

function timelineCopy(type: string, value: DetailValue, engineer: string | null) {
  const status = typeof value.status === 'string' ? value.status.replaceAll('_', ' ') : null;
  const role = typeof value.role === 'string' ? value.role.toLowerCase() : null;
  if (type === 'ALERT_RECEIVED') return ['Alert received', 'Grafana sent the firing event.'];
  if (type === 'INCIDENT_CREATED')
    return ['Incident created', 'WakeOps opened a durable incident.'];
  if (type === 'ALERT_DEDUPLICATED')
    return ['Repeated alert attached', 'No duplicate call workflow was started.'];
  if (type === 'CALL_REQUESTED')
    return [
      'Call requested',
      `${engineer ?? 'Assigned engineer'} was contacted${role ? ` as ${role}` : ''}.`,
    ];
  if (type === 'CALL_STATUS_UPDATED')
    return [
      'Call status updated',
      status ? `Twilio reported ${status.toLowerCase()}.` : 'Twilio sent an update.',
    ];
  if (type === 'NOTIFICATION_REQUESTED')
    return ['Notifications queued', 'Email and Slack delivery started independently.'];
  if (type === 'NOTIFICATION_STATUS_UPDATED')
    return [
      'Notification status updated',
      `${typeof value.channel === 'string' ? value.channel : 'Notification'} ${status?.toLowerCase() ?? 'updated'}.`,
    ];
  if (type === 'INCIDENT_RESOLVED') return ['Alert recovered', 'Grafana reported recovery.'];
  return [type.replaceAll('_', ' ').toLowerCase(), 'Incident activity recorded.'];
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const membership = await requireOrganization();
  const { incidentId } = await params;
  const incident = await database.incident.findFirst({
    where: { id: incidentId, organizationId: membership.organizationId },
    include: {
      application: true,
      environment: true,
      resource: true,
      alertEvents: { orderBy: { receivedAt: 'asc' } },
      auditEvents: { orderBy: { occurredAt: 'asc' } },
      callAttempts: {
        orderBy: { createdAt: 'asc' },
        include: { engineer: true },
      },
      notificationAttempts: { orderBy: [{ channel: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  if (!incident) notFound();

  const mapping = await database.resourceMapping.findFirst({
    where: {
      organizationId: membership.organizationId,
      applicationId: incident.applicationId,
      environmentId: incident.environmentId,
      resourceId: incident.resourceId,
    },
    include: { assignment: true },
  });

  const attempts = new Map(incident.callAttempts.map((attempt) => [attempt.id, attempt]));
  const attemptRoles = new Map<string, string>();
  const timeline = incident.auditEvents.map((event) => {
    const value = details(event.details);
    const attemptId = typeof value.callAttemptId === 'string' ? value.callAttemptId : null;
    if (attemptId && event.type === 'CALL_REQUESTED' && typeof value.role === 'string') {
      attemptRoles.set(attemptId, value.role);
    }
    const attempt = attemptId ? attempts.get(attemptId) : null;
    const [title, description] = timelineCopy(event.type, value, attempt?.engineer.name ?? null);
    return { id: event.id, type: event.type, occurredAt: event.occurredAt, title, description };
  });
  if (incident.acknowledgedAt) {
    const completedCall = incident.callAttempts.findLast(
      (attempt) => attempt.status === 'COMPLETED' && attempt.answeredAt,
    );
    timeline.push({
      id: 'acknowledgement',
      type: 'ACKNOWLEDGED',
      occurredAt: incident.acknowledgedAt,
      title: 'Incident acknowledged',
      description: `${completedCall?.engineer.name ?? 'Assigned engineer'} completed the call.`,
    });
  }
  timeline.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  const labels = Object.entries(details(incident.labels)).slice(0, 12);
  const annotations = Object.entries(details(incident.annotations)).slice(0, 8);

  const alerting = incident.status === 'OPEN' || incident.status === 'NOTIFYING';
  const startedAt = incident.startedAt;
  const response = [
    {
      label: 'Time to acknowledge',
      value: incident.acknowledgedAt
        ? formatDuration(incident.acknowledgedAt.getTime() - startedAt.getTime())
        : alerting
          ? 'Waiting'
          : 'Not acknowledged',
    },
    { label: 'Calls placed', value: String(incident.callAttempts.length) },
    {
      label: 'Messages sent',
      value: `${incident.notificationAttempts.filter((attempt) => attempt.status === 'SENT').length} of ${incident.notificationAttempts.length}`,
    },
    { label: 'Reported value', value: incident.value ?? 'Not provided' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/dashboard/incidents"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-signal"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M13 8H3m4-4L3 8l4 4" />
        </svg>
        All incidents
      </Link>

      <header
        className={`relative mt-6 overflow-hidden rounded-[28px] border p-6 sm:p-9 ${
          alerting ? 'border-alarm/25 bg-alarm/[0.04]' : 'border-white/[0.07] bg-white/[0.015]'
        }`}
      >
        <div
          className={`pointer-events-none absolute -top-32 -right-24 size-80 rounded-full blur-3xl ${
            alerting
              ? 'bg-alarm/15'
              : incident.status === 'ACKNOWLEDGED'
                ? 'bg-signal/10'
                : 'bg-white/5'
          }`}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Severity severity={incident.severity} />
              <span className="font-mono text-xs text-zinc-500">
                {shortIncidentId(incident.id)}
              </span>
              <span className="text-xs text-zinc-500">Started {formatDate(startedAt)}</span>
            </div>
            <h1 className="font-display mt-4 text-[2rem] leading-[0.92] font-extrabold tracking-[-0.045em] break-words text-white uppercase sm:text-[3.2rem]">
              {incident.alertName}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {[incident.application.name, incident.environment.name].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 px-3 py-1 text-zinc-300"
                >
                  {item}
                </span>
              ))}
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs leading-5 text-zinc-400">
                {incident.resource.externalIdentifier}
              </span>
            </div>
          </div>
          <IncidentStatus status={incident.status} />
        </div>

        <dl className="relative mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
          {response.map((item) => (
            <div key={item.label} className="bg-[#070908] px-5 py-4">
              <dt className="text-xs text-zinc-500">{item.label}</dt>
              <dd className="mt-2 truncate font-display text-xl font-bold tracking-[-0.02em] text-white">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="flex items-end justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Calls</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  On-call retries, then senior escalation
                </p>
              </div>
            </div>
            {incident.callAttempts.length ? (
              <ol className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {incident.callAttempts.map((attempt) => {
                  const role =
                    attemptRoles.get(attempt.id)?.toLowerCase() ??
                    (mapping?.assignment?.primaryEngineerId === attempt.engineerId
                      ? 'on-call'
                      : mapping?.assignment?.secondaryEngineerId === attempt.engineerId
                        ? 'senior'
                        : 'engineer');
                  return (
                    <li
                      key={attempt.id}
                      className="grid gap-4 px-6 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                    >
                      <span className="font-display text-3xl font-extrabold tracking-[-0.04em] text-zinc-700">
                        {String(attempt.attemptNumber).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{attempt.engineer.name}</p>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {maskPhoneNumber(attempt.engineer.phoneNumber)}, requested{' '}
                          {formatDate(attempt.createdAt)}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <CallStatus status={attempt.status} />
                        <p className="mt-1 text-xs text-zinc-600">
                          {attempt.completedAt
                            ? `Ended ${formatDate(attempt.completedAt)}`
                            : 'Still in progress'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="border-t border-white/[0.06] px-6 py-12 text-center text-sm text-zinc-500">
                No calls were requested for this incident.
              </p>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-white">Messages</h2>
              <p className="mt-1 text-sm text-zinc-500">Email and Slack, delivered independently</p>
            </div>
            {incident.notificationAttempts.length ? (
              <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {incident.notificationAttempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {attempt.channel.charAt(0) + attempt.channel.slice(1).toLowerCase()}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {attempt.destination}, {attempt.attemptCount} delivery attempt
                        {attempt.attemptCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${attempt.status === 'SENT' ? 'border-signal/25 bg-signal/10 text-signal' : attempt.status === 'FAILED' ? 'border-alarm/25 bg-alarm/10 text-alarm' : 'border-ring/25 bg-ring/10 text-ring'}`}
                      >
                        {attempt.status.charAt(0) + attempt.status.slice(1).toLowerCase()}
                      </span>
                      {attempt.failureMessage && (
                        <p className="mt-2 max-w-xs text-xs text-alarm">{attempt.failureMessage}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-white/[0.06] px-6 py-12 text-center text-sm text-zinc-500">
                No messages were sent for this incident.
              </p>
            )}
          </Panel>

          <Panel className="p-6">
            <h2 className="text-lg font-semibold text-white">Alert context</h2>
            <p className="mt-1 text-sm text-zinc-500">Exactly what Grafana sent</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-zinc-400">Labels</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {labels.map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-lg border border-white/[0.07] bg-black/30 px-2.5 py-1.5 font-mono text-[11px]"
                    >
                      <span className="text-signal">{key}</span>
                      <span className="text-zinc-600">=</span>
                      <span className="text-zinc-300">{String(value)}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Annotations</p>
                <dl className="mt-3 space-y-3">
                  {annotations.length ? (
                    annotations.map(([key, value]) => (
                      <div key={key}>
                        <dt className="font-mono text-[11px] text-zinc-500">{key}</dt>
                        <dd className="mt-1 text-sm leading-6 text-zinc-300">{String(value)}</dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No annotations provided.</p>
                  )}
                </dl>
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="h-fit p-6 xl:sticky xl:top-24">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-white">Timeline</h2>
            <span className="text-xs text-zinc-500">{timeline.length} events</span>
          </div>
          <ol className="mt-7">
            {timeline.map((event, index) => (
              <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
                {index < timeline.length - 1 && (
                  <span className="absolute top-4 bottom-0 left-[5px] w-px bg-gradient-to-b from-white/15 to-white/[0.04]" />
                )}
                <span
                  className={`relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-[#080a09] ${eventTone(event.type)}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 first-letter:uppercase">
                    {event.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{event.description}</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-600">
                    {formatDate(event.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
