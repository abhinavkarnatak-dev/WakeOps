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

export function GrafanaTestStatus({ initialReceipt }: { initialReceipt: GrafanaReceipt | null }) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const receiptId = useRef(initialReceipt?.id);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch('/api/integrations/grafana/status', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { receipt: GrafanaReceipt | null };
      const changed = Boolean(data.receipt?.id && data.receipt.id !== receiptId.current);
      receiptId.current = data.receipt?.id;
      setReceipt(data.receipt);
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
