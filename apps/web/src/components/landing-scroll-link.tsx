'use client';

import type { ReactNode } from 'react';

type LenisLike = {
  scrollTo: (target: Element, options?: { offset?: number; duration?: number }) => void;
};

export function LandingScrollLink({
  target,
  className,
  children,
}: {
  target: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${target}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        const section = document.getElementById(target);
        if (!section) return;
        const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
        if (lenis) {
          lenis.scrollTo(section, { duration: 1.6 });
          return;
        }
        window.scrollTo({
          top: section.getBoundingClientRect().top + window.scrollY,
          behavior: 'smooth',
        });
      }}
    >
      {children}
    </a>
  );
}
