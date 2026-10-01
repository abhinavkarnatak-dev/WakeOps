import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';
import { ToastProvider } from '@/components/toast-provider';

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(webUrl),
  applicationName: 'WakeOps',
  title: {
    default: 'WakeOps - Incident alerting and engineer escalation',
    template: '%s | WakeOps',
  },
  description:
    'WakeOps receives Grafana alerts, creates incidents, calls on-call engineers, retries unanswered calls, and escalates to senior contacts.',
  keywords: [
    'incident alerting',
    'Grafana alerts',
    'on-call engineer',
    'incident escalation',
    'voice notifications',
    'infrastructure monitoring',
  ],
  creator: 'WakeOps',
  publisher: 'WakeOps',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'WakeOps',
    title: 'WakeOps - Incident alerting and engineer escalation',
    description:
      'Turn Grafana alerts into tracked incidents, engineer phone calls, retries, and escalation.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WakeOps - Incident alerting and engineer escalation',
    description:
      'Turn Grafana alerts into tracked incidents, engineer phone calls, retries, and escalation.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
