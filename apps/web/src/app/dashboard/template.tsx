import type { ReactNode } from 'react';

/** Re-mounts on every dashboard navigation so each page eases in. */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="rise">{children}</div>;
}
