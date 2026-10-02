'use client';

import { useEffect, useRef, useState } from 'react';

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function digitTrack(from: number, to: number, direction: 1 | -1) {
  if (from === to) return [to];

  const digits = [from];
  let current = from;
  while (current !== to) {
    current = (current + direction + 10) % 10;
    digits.push(current);
  }
  return digits;
}

export function OdometerNumber({ value, className = '' }: { value: number; className?: string }) {
  const [previousValue, setPreviousValue] = useState(0);
  const [displayedValue, setDisplayedValue] = useState(value);
  const [direction, setDirection] = useState<1 | -1>(1);
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
      setPreviousValue(displayedValue);
      setDirection(value >= displayedValue ? 1 : -1);
      setDisplayedValue(value);
      rollFrame = requestAnimationFrame(() => setRolling(true));
    });

    return () => {
      cancelAnimationFrame(valueFrame);
      cancelAnimationFrame(rollFrame);
    };
  }, [displayedValue, value]);

  const width = Math.max(String(previousValue).length, String(displayedValue).length);
  const previousDigits = String(previousValue).padStart(width, '0');
  const displayedDigits = String(displayedValue).padStart(width, '0');

  return (
    <span className={`inline-flex font-mono leading-none tabular-nums ${className}`}>
      <span className="sr-only">{displayedValue}</span>
      <span aria-hidden="true" className="inline-flex">
        {displayedDigits
          .split('')
          .map((character, index) => {
            const track = digitTrack(Number(previousDigits[index]), Number(character), direction);
            return (
              <span key={`${displayedValue}-${index}`} className="h-[1em] overflow-hidden">
                <span
                  className="flex flex-col transition-transform duration-700 ease-out will-change-transform"
                  style={{
                    transform: rolling ? `translateY(-${track.length - 1}em)` : 'translateY(0)',
                    transitionDelay: `${index * 75}ms`,
                  }}
                >
                  {track.map((digit, step) => (
                    <span key={`${digit}-${step}`} className="h-[1em]">
                      {digit}
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
