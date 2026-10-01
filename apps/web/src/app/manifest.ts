import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WakeOps',
    short_name: 'WakeOps',
    description: 'Incident alerting, engineer calling, retry, and escalation.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050606',
    theme_color: '#bef264',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
