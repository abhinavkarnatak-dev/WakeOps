'use client';

import { useEffect, useRef, useState } from 'react';

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function OdometerNumber({ value, className = '' }: { value: number; className?: string }) {
  const [displayedValue, setDisplayedValue] = useState(value);
  const [rolling, setRolling] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    let valueFrame = 0;
    let rollFrame = 0;

    if (reducedMotion()) {
      setDisplayedValue(value);
      setRolling(true);
      return;
    }

    if (!mounted.current) {
      mounted.current = true;
      rollFrame = requestAnimationFrame(() => setRolling(true));
      return () => cancelAnimationFrame(rollFrame);
    }

    if (value === displayedValue) return;

    setRolling(false);
    valueFrame = requestAnimationFrame(() => {
      setDisplayedValue(value);
      rollFrame = requestAnimationFrame(() => setRolling(true));
    });

    return () => {
      cancelAnimationFrame(valueFrame);
      cancelAnimationFrame(rollFrame);
    };
  }, [displayedValue, value]);

  return (
    <span className={`inline-flex font-mono leading-none tabular-nums ${className}`}>
      <span className="sr-only">{displayedValue}</span>
      <span aria-hidden="true" className="inline-flex">
        {String(displayedValue)
          .split('')
          .map((character, index) => {
            const digit = Number(character);
            return (
              <span key={`${displayedValue}-${index}`} className="h-[1em] overflow-hidden">
                <span
                  className="flex flex-col transition-transform duration-700 ease-out will-change-transform"
                  style={{
                    transform: rolling ? `translateY(-${digit}em)` : 'translateY(0)',
                    transitionDelay: `${index * 75}ms`,
                  }}
                >
                  {Array.from({ length: digit + 1 }, (_, step) => (
                    <span key={step} className="h-[1em]">
                      {step}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
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
