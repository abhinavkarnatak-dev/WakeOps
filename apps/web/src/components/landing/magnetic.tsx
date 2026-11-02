'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';

/** Pulls its child toward the pointer while hovered. Disabled for touch and reduced motion. */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const xTo = gsap.quickTo(node, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(node, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });

    function move(event: PointerEvent) {
      const rect = node!.getBoundingClientRect();
      xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
    }
    function leave() {
      xTo(0);
      yTo(0);
    }
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    };
  }, [strength]);

  return (
    <span ref={element} className="inline-block will-change-transform">
      {children}
    </span>
  );
}
