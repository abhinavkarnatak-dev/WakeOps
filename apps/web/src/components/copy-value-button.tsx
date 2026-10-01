'use client';

import { useToast } from '@/components/toast-provider';

export function CopyValueButton({
  value,
  label = 'Copy value',
  successMessage = 'Copied to clipboard.',
  className = '',
}: {
  value: string;
  label?: string;
  successMessage?: string;
  className?: string;
}) {
  const { showToast } = useToast();

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage, 'success');
    } catch {
      showToast('Could not copy. Select and copy it manually.', 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-md border border-lime-300/20 bg-black/40 text-lime-200 transition hover:bg-lime-300/12 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-4"
      >
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
      </svg>
    </button>
  );
}
