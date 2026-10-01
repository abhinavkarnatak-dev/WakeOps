'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };
type ToastContextValue = { showToast(message: string, tone?: ToastTone): void };
type ActionState = { error?: string; success?: string };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const toastLayer = useRef<HTMLDivElement>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast],
  );

  useEffect(() => {
    const layer = toastLayer.current;
    if (!layer) return;

    if (layer.matches(':popover-open')) layer.hidePopover();
    if (toasts.length > 0) layer.showPopover();
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        ref={toastLayer}
        popover="manual"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-auto top-4 right-4 z-[2147483647] m-0 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 overflow-visible border-0 bg-transparent p-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
              toast.tone === 'success'
                ? 'border-lime-300/20 bg-[#11170d]/95 text-lime-100'
                : toast.tone === 'error'
                  ? 'border-rose-400/25 bg-[#1b0d10]/95 text-rose-100'
                  : 'border-lime-300/20 bg-[#11170d]/95 text-lime-100'
            }`}
          >
            <span
              className={`mt-1 size-2 shrink-0 rounded-full ${
                toast.tone === 'success'
                  ? 'bg-lime-300'
                  : toast.tone === 'error'
                    ? 'bg-rose-400'
                    : 'bg-lime-300'
              }`}
            />
            <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 transition hover:text-white"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider.');
  return value;
}

export function useActionToast(state: ActionState) {
  const { showToast } = useToast();
  const previous = useRef<ActionState | null>(null);

  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;
    if (state.error) showToast(state.error, 'error');
    else if (state.success) showToast(state.success, 'success');
  }, [showToast, state]);
}
