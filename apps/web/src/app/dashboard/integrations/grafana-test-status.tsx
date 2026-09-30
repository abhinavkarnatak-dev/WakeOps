'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type GrafanaPayloadPreview = {
  receiver: string | null;
  status: string;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  alerts: Array<{
    status: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string | null;
    endsAt: string | null;
  }>;
};

export type GrafanaReceipt = {
  id: string;
  receiver: string | null;
  status: string;
  alertCount: number;
  alertName: string | null;
  payloadPreview: GrafanaPayloadPreview | null;
  receivedAt: string;
};

export type GrafanaProcessingResult = {
  id: string;
  processingStatus: 'PROCESSED' | 'DEDUPLICATED' | 'MAPPING_FAILED' | 'UNMATCHED_RESOLUTION';
  mappingError: string | null;
  alertName: string | null;
  resourceIdentifier: string | null;
  service: string | null;
  environment: string | null;
  severity: string | null;
  receivedAt: string;
  incident: {
    id: string;
    status: string;
    metadata: unknown;
    application: { name: string };
    environment: { name: string };
    resource: { name: string; externalIdentifier: string };
  } | null;
};

function Values({ title, values }: { title: string; values: Record<string, string> }) {
  const entries = Object.entries(values);
  return (
    <div>
      <p className="text-sm font-medium text-slate-200">{title}</p>
      {!entries.length ? (
        <p className="mt-1 text-xs text-slate-500">None</p>
      ) : (
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="rounded-md bg-slate-950 p-2">
              <dt className="text-cyan-300">{key}</dt>
              <dd className="mt-1 break-words text-slate-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function incidentReference(id: string) {
  return `INC-${id.slice(-8).toUpperCase()}`;
}

function ProcessingResult({ result }: { result: GrafanaProcessingResult }) {
  const failed =
    result.processingStatus === 'MAPPING_FAILED' ||
    result.processingStatus === 'UNMATCHED_RESOLUTION';
  const metadata =
    result.incident?.metadata && typeof result.incident.metadata === 'object'
      ? (result.incident.metadata as Record<string, unknown>)
      : {};

  return (
    <div
      className={`rounded-lg border p-4 ${
        failed ? 'border-amber-700 bg-amber-950/30' : 'border-emerald-700 bg-emerald-950/30'
      }`}
    >
      <p className={`font-semibold ${failed ? 'text-amber-200' : 'text-emerald-300'}`}>
        {failed ? 'Alert mapping needs attention' : 'Alert mapped successfully'}
      </p>
      {failed ? (
        <p className="mt-2 text-sm text-slate-300">{result.mappingError}</p>
      ) : (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Incident</dt>
            <dd>{result.incident ? incidentReference(result.incident.id) : 'Existing incident'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>{result.incident?.status ?? result.processingStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Host</dt>
            <dd>
              {result.incident
                ? `${result.incident.resource.name} (${result.incident.resource.externalIdentifier})`
                : result.resourceIdentifier}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Service and environment</dt>
            <dd>
              {result.incident?.application.name ?? result.service} -{' '}
              {result.incident?.environment.name ?? result.environment}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Primary engineer</dt>
            <dd>{String(metadata.primaryEngineerName ?? 'Assigned')}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Processing</dt>
            <dd>{result.processingStatus}</dd>
          </div>
        </dl>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Processed {new Date(result.receivedAt).toLocaleString()}
      </p>
    </div>
  );
}

export function GrafanaTestStatus({
  initialReceipt,
  initialProcessing,
}: {
  initialReceipt: GrafanaReceipt | null;
  initialProcessing: GrafanaProcessingResult | null;
}) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [processing, setProcessing] = useState(initialProcessing);
  const receiptId = useRef(initialReceipt?.id);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch('/api/integrations/grafana/status', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as {
        receipt: GrafanaReceipt | null;
        processing: GrafanaProcessingResult | null;
      };
      const changed = Boolean(data.receipt?.id && data.receipt.id !== receiptId.current);
      receiptId.current = data.receipt?.id;
      setReceipt(data.receipt);
      setProcessing(data.processing);
      if (changed) router.refresh();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [router]);

  if (!receipt) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-amber-200">
        Waiting for the first Grafana test notification...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-4">
        <p className="font-semibold text-emerald-300">Grafana webhook received</p>
        <p className="mt-2 text-sm text-slate-300">
          {receipt.alertName ?? 'Grafana alert'} - {receipt.status} - {receipt.alertCount} alert
          {receipt.alertCount === 1 ? '' : 's'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Received {new Date(receipt.receivedAt).toLocaleString()}
        </p>
      </div>
      {processing && <ProcessingResult result={processing} />}
      {receipt.payloadPreview && (
        <details open className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
          <summary className="cursor-pointer font-semibold">Inspect received payload</summary>
          <div className="mt-4 space-y-5">
            <Values title="Common labels" values={receipt.payloadPreview.commonLabels} />
            <Values title="Common annotations" values={receipt.payloadPreview.commonAnnotations} />
            {receipt.payloadPreview.alerts.map((alert, index) => (
              <div key={index} className="space-y-4 border-t border-slate-800 pt-4">
                <p className="text-sm font-semibold">Alert {index + 1}</p>
                <Values title="Labels" values={alert.labels} />
                <Values title="Annotations" values={alert.annotations} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
