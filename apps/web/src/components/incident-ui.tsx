import type { ReactNode } from 'react';

const incidentTone: Record<string, string> = {
  OPEN: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  NOTIFYING: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  ACKNOWLEDGED: 'border-lime-300/25 bg-lime-300/10 text-lime-200',
  RESOLVED: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
};

const severityTone: Record<string, string> = {
  CRITICAL: 'text-rose-300',
  WARNING: 'text-amber-300',
  INFO: 'text-lime-300',
};

const callTone: Record<string, string> = {
  COMPLETED: 'text-lime-300',
  IN_PROGRESS: 'text-lime-300',
  RINGING: 'text-lime-300',
  QUEUED: 'text-amber-300',
  NO_ANSWER: 'text-rose-300',
  FAILED: 'text-rose-300',
  BUSY: 'text-rose-300',
  CANCELED: 'text-zinc-400',
  CREATED: 'text-zinc-400',
};

export function IncidentStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] ${incidentTone[status] ?? incidentTone.OPEN}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Severity({ severity }: { severity: string }) {
  return (
    <span className={`text-[10px] font-bold tracking-[0.14em] ${severityTone[severity] ?? ''}`}>
      {severity}
    </span>
  );
}

export function CallStatus({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold ${callTone[status] ?? 'text-zinc-400'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-[#0b0c0c] ${className}`}>{children}</div>
  );
}

export function formatDate(value: Date | null) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(value);
}

export function shortIncidentId(id: string) {
  return `INC-${id.slice(-8).toUpperCase()}`;
}
