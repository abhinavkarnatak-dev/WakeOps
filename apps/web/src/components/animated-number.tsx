'use client';

import { useEffect, useRef, useState } from 'react';

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type OdometerMotion = {
  from: number;
  to: number;
  direction: 1 | -1;
  rolling: boolean;
};

export function OdometerNumber({ value, className = '' }: { value: number; className?: string }) {
  const [motion, setMotion] = useState<OdometerMotion>({
    from: 0,
    to: value,
    direction: 1,
    rolling: false,
  });
  const currentValue = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    let resetFrame = 0;
    let rollFrame = 0;

    if (reducedMotion()) {
      currentValue.current = value;
      resetFrame = requestAnimationFrame(() => {
        setMotion({ from: value, to: value, direction: 1, rolling: true });
      });
      return () => cancelAnimationFrame(resetFrame);
    }

    let nextMotion: OdometerMotion | null = null;
    if (!mounted.current) {
      mounted.current = true;
    } else {
      const from = currentValue.current;
      if (from === value) return;

      currentValue.current = value;
      nextMotion = {
        from,
        to: value,
        direction: value >= from ? 1 : -1,
        rolling: false,
      };
    }

    resetFrame = requestAnimationFrame(() => {
      if (nextMotion) setMotion(nextMotion);
      rollFrame = requestAnimationFrame(() => {
        setMotion((current) =>
          current.to === value ? { ...current, rolling: true } : current,
        );
      });
    });

    return () => {
      cancelAnimationFrame(resetFrame);
      cancelAnimationFrame(rollFrame);
    };
  }, [value]);

  const fromText = String(motion.from);
  const toText = String(motion.to);
  const sizingText = fromText.length > toText.length ? fromText : toText;
  const fromTransform = motion.rolling
    ? motion.direction === 1
      ? 'translateY(-100%)'
      : 'translateY(100%)'
    : 'translateY(0)';
  const toTransform = motion.rolling
    ? 'translateY(0)'
    : motion.direction === 1
      ? 'translateY(100%)'
      : 'translateY(-100%)';
  const transition = motion.rolling
    ? 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)'
    : 'none';

  return (
    <span className={`inline-flex font-mono leading-none tabular-nums ${className}`}>
      <span className="sr-only">{motion.to}</span>
      <span aria-hidden="true" className="relative inline-grid h-[1em] overflow-hidden text-right">
        <span className="invisible col-start-1 row-start-1">{sizingText}</span>
        <span
          className="absolute inset-0 flex items-center justify-end will-change-transform"
          style={{ transform: fromTransform, transition }}
        >
          {fromText}
        </span>
        <span
          className="absolute inset-0 flex items-center justify-end will-change-transform"
          style={{ transform: toTransform, transition }}
        >
          {toText}
        </span>
      </span>
    </span>
  );
}

export function CountUpNumber({ value, className = '' }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reducedMotion()) {
      const frame = requestAnimationFrame(() => {
        current.current = value;
        setDisplayed(value);
      });
      return () => cancelAnimationFrame(frame);
    }

    const from = current.current;
    const difference = value - from;
    const duration = 380;
    const startedAt = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + difference * eased);
      current.current = next;
      setDisplayed(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={`font-mono tabular-nums ${className}`}>{displayed}</span>;
}
