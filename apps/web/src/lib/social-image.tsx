import { ImageResponse } from 'next/og';

export const socialImageSize = { width: 1200, height: 630 };

export function createSocialImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#050606',
        color: '#f4f4f5',
        display: 'flex',
        fontFamily: 'sans-serif',
        height: '100%',
        padding: '80px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '20px' }}>
          <div
            style={{
              alignItems: 'center',
              background: '#bef264',
              borderRadius: '22px',
              color: '#050606',
              display: 'flex',
              fontSize: '48px',
              fontWeight: 900,
              height: '92px',
              justifyContent: 'center',
              width: '92px',
            }}
          >
            W
          </div>
          <span style={{ fontSize: '48px', fontWeight: 800 }}>WakeOps</span>
        </div>
        <div style={{ fontSize: '68px', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.05 }}>
          Alert the right engineer when an incident starts.
        </div>
        <div style={{ color: '#a1a1aa', fontSize: '30px' }}>
          Grafana alerts, phone calls, retries, escalation, and incident tracking.
        </div>
      </div>
    </div>,
    socialImageSize,
  );
}
