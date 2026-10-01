'use client';

import type { ReactNode } from 'react';

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
