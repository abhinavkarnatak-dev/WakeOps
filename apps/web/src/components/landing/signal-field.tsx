'use client';

import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';

const MAX_PULSES = 6;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform vec4 uPulses[${MAX_PULSES}];
  uniform vec3 uPulseColors[${MAX_PULSES}];
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uAlpha;
  uniform float uMaxSize;

  varying vec3 vColor;
  varying float vAlpha;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 p = position;

    // Slow swell, like breathing at night
    float swell = sin(p.x * 0.18 + uTime * 0.35) * 0.35 + cos(p.z * 0.22 - uTime * 0.28) * 0.3;
    p.y += swell;

    vec3 base = vec3(0.62, 0.68, 0.6);
    vec3 color = base * (0.55 + hash(position.xz) * 0.45);
    float energy = 0.0;

    for (int i = 0; i < ${MAX_PULSES}; i++) {
      vec4 pulse = uPulses[i];
      float age = uTime - pulse.z;
      if (pulse.w <= 0.0 || age < 0.0 || age > 7.0) continue;
      float d = distance(p.xz, pulse.xy);
      float radius = age * 6.5;
      float band = exp(-pow((d - radius) * 0.7, 2.0));
      float fade = (1.0 - age / 7.0) * pulse.w;
      float wave = band * fade;
      p.y += wave * 2.2;
      energy += wave;
      color = mix(color, uPulseColors[i], clamp(wave * 1.4, 0.0, 1.0));
    }

    // Pointer lifts the field a little
    float pd = distance(p.xz, uPointer);
    float lift = exp(-pd * pd * 0.045) * uPointerStrength;
    p.y += lift * 1.4;
    color = mix(color, vec3(0.75, 0.95, 0.4), clamp(lift * 0.55, 0.0, 1.0));
    energy += lift * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = min(uSize * uPixelRatio * (1.0 + energy * 1.6) * (30.0 / depth), uMaxSize * uPixelRatio);

    vColor = color;
    vAlpha = smoothstep(75.0, 16.0, depth) * (0.7 + energy * 1.4) * uAlpha;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.18, d);
    gl_FragColor = vec4(vColor, soft * vAlpha);
  }
`;

const ALARM = new Color('#fb7185');
const SIGNAL = new Color('#bef264');
const RING = new Color('#fcd34d');

/**
 * A field of points laid out like terrain at night. Alerts fire as pulses that travel outward:
 * a rose ring when something breaks, a lime ring a moment later when someone answers.
 */
export function SignalField({
  className = '',
  density = 1,
  autoPulse = true,
  mode = 'incident',
}: {
  className?: string;
  density?: number;
  autoPulse?: boolean;
  /** incident: alarm ring followed by an answer. quiet: an occasional calm signal ring. */
  mode?: 'incident' | 'quiet';
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(0, 7, 24);
    camera.lookAt(0, 0, -2);

    const narrow = element.clientWidth < 700;
    const columns = Math.round((narrow ? 90 : 170) * density);
    const rows = Math.round((narrow ? 70 : 90) * density);
    const width = 90;
    const depth = 70;
    const positions = new Float32Array(columns * rows * 3);
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const jitter = (Math.random() - 0.5) * 0.18;
        positions[index++] = (column / (columns - 1) - 0.5) * width + jitter;
        positions[index++] = 0;
        positions[index++] = (row / (rows - 1) - 0.5) * depth - 12 + jitter;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    const pulses = Array.from({ length: MAX_PULSES }, () => new Vector4(0, 0, -100, 0));
    const pulseColors = Array.from({ length: MAX_PULSES }, () => new Vector3(1, 1, 1));
    let nextPulse = 0;

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new Vector2(999, 999) },
        uPointerStrength: { value: 0 },
        uPulses: { value: pulses },
        uPulseColors: { value: pulseColors },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: narrow ? 2.6 : 5 },
        uAlpha: { value: narrow ? 0.6 : 1 },
        uMaxSize: { value: narrow ? 4 : 9 },
      },
    });

    const points = new Points(geometry, material);
    scene.add(points);

    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    function firePulse(kind: 'alarm' | 'signal' | 'ring' = 'alarm', x?: number, z?: number) {
      const slot = nextPulse % MAX_PULSES;
      nextPulse += 1;
      const color = kind === 'alarm' ? ALARM : kind === 'ring' ? RING : SIGNAL;
      pulses[slot].set(
        x ?? (Math.random() - 0.5) * 50,
        z ?? -Math.random() * 30,
        now(),
        kind === 'signal' ? 0.9 : 1,
      );
      pulseColors[slot].set(color.r, color.g, color.b);
      return pulses[slot];
    }

    // An alert fires, then someone answers from the same place
    function incident() {
      const origin = firePulse('alarm');
      const x = origin.x;
      const z = origin.y;
      window.setTimeout(() => firePulse('signal', x, z), 1700);
    }

    let interval: number | undefined;
    let firstPulse: number | undefined;
    if (autoPulse && !reduceMotion) {
      const beat = mode === 'quiet' ? () => firePulse('signal') : incident;
      firstPulse = window.setTimeout(beat, 900);
      interval = window.setInterval(beat, mode === 'quiet' ? 6500 : 5200);
    }

    // Pointer projected onto the ground plane
    const target = new Vector2(999, 999);
    let strength = 0;
    let strengthTarget = 0;
    const ndc = new Vector3();
    const direction = new Vector3();
    function onPointerMove(event: PointerEvent) {
      const rect = element!.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom) {
        strengthTarget = 0;
        return;
      }
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
        0.5,
      );
      ndc.unproject(camera);
      direction.copy(ndc).sub(camera.position).normalize();
      if (direction.y >= -0.01) {
        strengthTarget = 0;
        return;
      }
      const distance = -camera.position.y / direction.y;
      target.set(
        camera.position.x + direction.x * distance,
        camera.position.z + direction.z * distance,
      );
      strengthTarget = 1;
    }
    function onPointerLeave() {
      strengthTarget = 0;
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);

    function resize() {
      const w = element!.clientWidth;
      const h = element!.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 700 ? 58 : 42;
      camera.updateProjectionMatrix();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(element);

    let frame = 0;
    const pointer = material.uniforms.uPointer.value as Vector2;
    function render() {
      frame = requestAnimationFrame(render);
      if (!visible) return;
      const t = now();
      material.uniforms.uTime.value = reduceMotion ? 0 : t;
      strength += (strengthTarget - strength) * 0.06;
      pointer.lerp(target, 0.08);
      material.uniforms.uPointerStrength.value = strength;
      camera.position.x += ((pointer.x === 999 ? 0 : pointer.x * 0.04) - camera.position.x) * 0.02;
      camera.lookAt(0, 0, -2);
      renderer.render(scene, camera);
    }
    render();

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.clearTimeout(firstPulse);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      observer.disconnect();
      visibility.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [autoPulse, density, mode]);

  return <div ref={host} aria-hidden="true" className={className} />;
}
