import { ImageResponse } from 'next/og';

export const socialImageSize = { width: 1200, height: 630 };

const VOID = '#050606';
const SIGNAL = '#bef264';
const ALARM = '#fb7185';

type Dot = { x: number; y: number; size: number; color: string; opacity: number };

/**
 * The hero's signal field, flattened: a perspective grid of dots with an alert ring (rose)
 * and its answer (lime) travelling out from the same point.
 */
function signalField(): Dot[] {
  const dots: Dot[] = [];
  const focal = 520;
  const height = 7;
  const horizon = 210;
  const origin = { x: 14, depth: 30 };

  for (let depth = 7; depth <= 70; depth += depth < 20 ? 1.3 : 2) {
    for (let x = -80; x <= 80; x += 2.6) {
      const sx = 600 + (x * focal) / depth;
      const distance = Math.hypot(x - origin.x, depth - origin.depth);
      const alarm = Math.exp(-((distance - 8) ** 2) / 1.6);
      const answer = Math.exp(-((distance - 15) ** 2) / 2.2);
      const energy = Math.max(alarm, answer);
      const lift = (energy * 2.2 * focal) / depth;
      const sy = horizon + (height * focal) / depth - lift;
      if (sx < -10 || sx > 1210 || sy > 640) continue;
      const base = Math.max(1.8, Math.min(5, 38 / depth));
      dots.push({
        x: sx,
        y: sy,
        size: base * (1 + energy * 1.3),
        color: alarm > answer && alarm > 0.25 ? ALARM : answer > 0.25 ? SIGNAL : '#b4bcb2',
        opacity: Math.min(1, (0.5 + energy) * Math.min(1, 34 / depth)),
      });
    }
  }
  return dots;
}

async function loadFont(family: string, axes: string, text: string) {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const source = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!source) return null;
    const response = await fetch(source);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function createSocialImage() {
  const headline = ['SOMEONE', 'HAS TO', 'WAKE UP.'];
  const display = await loadFont('Archivo', 'wdth,wght@125,800', `${headline.join('')}WakeOps`);
  const body = await loadFont(
    'Space+Grotesk',
    'wght@500',
    'Phone calls, retries and escalation for Grafana alerts.WakeOpscheckout-api is failing in productionIncoming callCriticalAcknowledgeDecline',
  );

  const fonts = [
    ...(display
      ? [{ name: 'Archivo', data: display, weight: 800 as const, style: 'normal' as const }]
      : []),
    ...(body
      ? [{ name: 'Space Grotesk', data: body, weight: 500 as const, style: 'normal' as const }]
      : []),
  ];

  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        background: VOID,
        color: '#ffffff',
        fontFamily: 'Space Grotesk',
        overflow: 'hidden',
      }}
    >
      {signalField().map((dot, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            borderRadius: 999,
            background: dot.color,
            opacity: dot.opacity,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          background:
            'linear-gradient(90deg, rgba(5,6,6,0.95) 0%, rgba(5,6,6,0.7) 40%, rgba(5,6,6,0) 68%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          background: 'linear-gradient(180deg, rgba(5,6,6,1) 0%, rgba(5,6,6,0) 38%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="46" height="46" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="18" fill={SIGNAL} />
            <path
              fill={VOID}
              d="M12 18h9l4.2 25L30 18h8l4.8 25L47 18h9l-8 32H38l-4-21-4 21H20l-8-32Z"
            />
          </svg>
          <span style={{ fontFamily: 'Archivo', fontSize: 30, letterSpacing: -0.6 }}>WakeOps</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {headline.map((line, index) => (
              <span
                key={line}
                style={{
                  fontFamily: 'Archivo',
                  fontSize: 104,
                  lineHeight: 0.88,
                  letterSpacing: -4.5,
                  color: index === headline.length - 1 ? SIGNAL : '#ffffff',
                }}
              >
                {line}
              </span>
            ))}
            <span style={{ marginTop: 30, fontSize: 26, color: '#a1a1aa' }}>
              Phone calls, retries and escalation for Grafana alerts.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 300,
              padding: 22,
              borderRadius: 28,
              border: '1px solid rgba(190,242,100,0.28)',
              background: 'rgba(11,13,12,0.88)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
              transform: 'rotate(-3deg)',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14,
                color: '#71717a',
              }}
            >
              <span>Incoming call</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: ALARM }} />
                Critical
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: 99,
                  background: ALARM,
                  color: VOID,
                  fontFamily: 'Archivo',
                  fontSize: 22,
                  boxShadow: '0 0 0 8px rgba(251,113,133,0.15), 0 0 0 16px rgba(251,113,133,0.07)',
                }}
              >
                W
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 20 }}>WakeOps</span>
                <span style={{ fontSize: 14, color: '#a1a1aa' }}>
                  checkout-api is failing in production
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <span
                style={{
                  display: 'flex',
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 0',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.07)',
                  fontSize: 15,
                  color: '#d4d4d8',
                }}
              >
                Decline
              </span>
              <span
                style={{
                  display: 'flex',
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 0',
                  borderRadius: 99,
                  background: SIGNAL,
                  fontSize: 15,
                  color: VOID,
                }}
              >
                Acknowledge
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    { ...socialImageSize, fonts: fonts.length ? fonts : undefined },
  );
}
