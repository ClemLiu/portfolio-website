import { useEffect, useId, useRef } from "react";

export type WigglyFrameProps = {
  className?: string;
  /** Corner radius, in px — match the framed element's own border-radius */
  radius?: number;
  /** Matches the logo's stroke thickness */
  strokeWidth?: number;
  /** Base turbulence frequency the wiggle drifts around */
  frequencyX?: number;
  frequencyY?: number;
  /** How far the stroke distorts */
  wiggle?: number;
  /** Blur applied to the noise before displacing, smooths the wiggle */
  smoothen?: number;
  octaves?: number;
  /** How far idle drift can push frequency from center, as a fraction */
  wander?: number;
  /** How fast the wiggle drifts through the noise field */
  wiggleSpeed?: number;
  /** Gradient spin speed, degrees/sec */
  spinSpeed?: number;
  /** Phase offset so multiple instances don't wiggle in lockstep */
  seed?: number;
};

// Same deterministic hash → [0, 1) and 1D value noise as LogoCursorReactive
// — see that component for the fuller explanation.
function hash(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
function noise1D(t: number) {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash(i);
  const b = hash(i + 1);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

// A rounded-rect version of the logo's wiggling-stroke + rotating-gradient
// treatment, for framing arbitrary elements (e.g. homepage card images).
// Unlike LogoCursorReactive, this isn't cursor-reactive — the wiggle drifts
// on its own continuous noise (like the logo's idle bob) so the frequency
// actually changes over time instead of sitting static, and the gradient
// spins at a constant idle speed with no hover speed-up.
export const WigglyFrame = ({
  className,
  radius = 12,
  strokeWidth = 8,
  frequencyX = 0.035,
  frequencyY = 0.09,
  wiggle = 3.5,
  smoothen = 1.2,
  octaves = 3,
  wander = 0.4,
  wiggleSpeed = 0.25,
  spinSpeed = 20,
  seed = 0,
}: WigglyFrameProps) => {
  const id = useId();
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);

  useEffect(() => {
    const seedOffset = seed * 17.37;
    let rafId: number;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = (now - start) / 1000;

      const t = elapsed * wiggleSpeed + seedOffset;
      const fx = frequencyX * (1 + (noise1D(t) - 0.5) * 2 * wander);
      const fy = frequencyY * (1 + (noise1D(t + 55.1) - 0.5) * 2 * wander);
      turbulenceRef.current?.setAttribute("baseFrequency", `${fx.toFixed(4)} ${fy.toFixed(4)}`);

      // pivot is (0.5, 0.5) not (50, 50) — gradientUnits="objectBoundingBox"
      // below means this gradient's own coordinate space is normalized 0–1,
      // not real pixel/user-space units like the logo's gradient uses.
      const angle = (elapsed * spinSpeed) % 360;
      gradientRef.current?.setAttribute("gradientTransform", `rotate(${angle.toFixed(2)} 0.5 0.5)`);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [frequencyX, frequencyY, wander, wiggleSpeed, spinSpeed, seed]);

  return (
    <svg
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          ref={gradientRef}
          id={`${id}-gradient`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="#4B66FF" />
          <stop offset="1" stopColor="#E6A53C" />
        </linearGradient>
        <filter id={`${id}-wiggle`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency={`${frequencyX} ${frequencyY}`}
            numOctaves={octaves}
            seed={seed}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={smoothen} result="smoothNoise" />
          <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale={wiggle} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={radius}
        ry={radius}
        fill="none"
        stroke={`url(#${id}-gradient)`}
        strokeWidth={strokeWidth}
        filter={`url(#${id}-wiggle)`}
      />
    </svg>
  );
};
