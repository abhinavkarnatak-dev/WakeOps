import { database } from '@wakeops/database';
import { maskPhoneNumber } from '@wakeops/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  CallStatus,
  formatDate,
  IncidentStatus,
  Panel,
  Severity,
  shortIncidentId,
} from '@/components/incident-ui';
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
    return { id: event.id, occurredAt: event.occurredAt, title, description };
  });
  if (incident.acknowledgedAt) {
    const completedCall = incident.callAttempts.findLast(
      (attempt) => attempt.status === 'COMPLETED' && attempt.answeredAt,
    );
    timeline.push({
      id: 'acknowledgement',
      occurredAt: incident.acknowledgedAt,
      title: 'Incident acknowledged',
      description: `${completedCall?.engineer.name ?? 'Assigned engineer'} completed the call.`,
    });
  }
  timeline.sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

  const labels = Object.entries(details(incident.labels)).slice(0, 12);
  const annotations = Object.entries(details(incident.annotations)).slice(0, 8);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/dashboard/incidents"
        className="text-xs font-semibold text-zinc-500 transition hover:text-lime-300"
      >
        &lt;- All incidents
      </Link>

      <header className="mt-6 flex flex-col gap-5 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Severity severity={incident.severity} />
            <span className="font-mono text-[11px] text-zinc-600">
              {shortIncidentId(incident.id)}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            {incident.alertName}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {incident.application.name} / {incident.environment.name} /{' '}
            {incident.resource.externalIdentifier}
          </p>
        </div>
        <IncidentStatus status={incident.status} />
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Application', incident.application.name],
          ['Environment', incident.environment.name],
          ['Resource', incident.resource.externalIdentifier],
          ['Reported value', incident.value ?? 'Not provided'],
        ].map(([label, value]) => (
          <Panel key={label} className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              {label}
            </p>
            <p className="mt-3 truncate text-sm font-medium text-zinc-200">{value}</p>
          </Panel>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="border-b border-white/8 px-5 py-4">
              <h2 className="font-semibold text-white">Call attempts</h2>
              <p className="mt-1 text-xs text-zinc-600">On-call retries and senior escalation</p>
            </div>
            {incident.callAttempts.length ? (
              <div className="divide-y divide-white/6">
                {incident.callAttempts.map((attempt) => {
                  const role =
                    attemptRoles.get(attempt.id)?.toLowerCase() ??
                    (mapping?.assignment?.primaryEngineerId === attempt.engineerId
                      ? 'on-call'
                      : mapping?.assignment?.secondaryEngineerId === attempt.engineerId
                        ? 'senior'
                        : 'engineer');
                  return (
                    <div
                      key={attempt.id}
                      className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-xs font-bold text-zinc-400">
                          {attempt.attemptNumber}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-white">
                              {attempt.engineer.name}
                            </p>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-600">
                            {maskPhoneNumber(attempt.engineer.phoneNumber)} / requested{' '}
                            {formatDate(attempt.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <CallStatus status={attempt.status} />
                        <p className="mt-1 text-[10px] text-zinc-600">
                          {attempt.completedAt
                            ? `Ended ${formatDate(attempt.completedAt)}`
                            : 'Awaiting completion'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-zinc-600">No calls requested.</p>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-white/8 px-5 py-4">
              <h2 className="font-semibold text-white">Notifications</h2>
              <p className="mt-1 text-xs text-zinc-600">Email and Slack delivery attempts</p>
            </div>
            {incident.notificationAttempts.length ? (
              <div className="divide-y divide-white/6">
                {incident.notificationAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{attempt.channel}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {attempt.destination} / {attempt.attemptCount} delivery attempt
                        {attempt.attemptCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${attempt.status === 'SENT' ? 'border-lime-400/20 bg-lime-400/8 text-lime-300' : attempt.status === 'FAILED' ? 'border-rose-400/20 bg-rose-400/8 text-rose-300' : 'border-amber-400/20 bg-amber-400/8 text-amber-300'}`}
                      >
                        {attempt.status}
                      </span>
                      {attempt.failureMessage && (
                        <p className="mt-2 max-w-xs text-xs text-rose-300">
                          {attempt.failureMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-zinc-600">
                No notification attempts recorded.
              </p>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-white">Alert context</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Labels
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {labels.map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5 font-mono text-[10px] text-zinc-400"
                    >
                      {key}={String(value)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Annotations
                </p>
                <dl className="mt-3 space-y-3">
                  {annotations.length ? (
                    annotations.map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[10px] text-zinc-600">{key}</dt>
                        <dd className="mt-1 text-xs leading-5 text-zinc-400">{String(value)}</dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600">No annotations provided.</p>
                  )}
                </dl>
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="h-fit p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Incident timeline</h2>
              <p className="mt-1 text-xs text-zinc-600">Complete durable activity</p>
            </div>
            <span className="text-[10px] text-zinc-600">{timeline.length} events</span>
          </div>
          <ol className="mt-6">
            {timeline.map((event, index) => (
              <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
                {index < timeline.length - 1 && (
                  <span className="absolute top-3 bottom-0 left-[5px] w-px bg-white/8" />
                )}
                <span className="relative mt-1 size-[11px] shrink-0 rounded-full border-2 border-[#0b0c0c] bg-lime-300 shadow-[0_0_0_1px_rgba(190,242,100,0.25)]" />
                <div>
                  <p className="text-sm font-medium capitalize text-zinc-200">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">{event.description}</p>
                  <p className="mt-1.5 text-[10px] text-zinc-700">{formatDate(event.occurredAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
