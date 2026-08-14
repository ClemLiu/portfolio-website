import { useEffect, useRef } from "react";

export type LogoCursorReactiveProps = {
  className?: string;
  /** Figma "Frequency" (horizontal) — center of the range the cursor maps across */
  frequencyX?: number;
  /** Figma "Frequency" (vertical) — center of the range the cursor maps across */
  frequencyY?: number;
  /** Figma "Wiggle" — how far the line distorts (static) */
  wiggle?: number;
  /** Figma "Smoothen" — blur applied to the noise before displacing */
  smoothen?: number;
  /** Noise quality/naturalness — higher costs more to render */
  octaves?: number;
  /** Character of the noise pattern + bob-drift phase offset */
  seed?: number;
  /** How far the cursor can push the frequency from center, as a fraction (0.5 = ±50%) */
  wander?: number;
  /** Lerp factor per frame toward the cursor-derived target — lower = smoother/laggier follow */
  ease?: number;
  /** Idle bob — max vertical drift in pixels */
  bobAmount?: number;
  /** Idle bob — max rotation in degrees, each direction */
  rotateAmount?: number;
  /** How fast the idle bob moves through the noise field */
  noiseSpeed?: number;
  /** Gradient spin speed, degrees/sec, while idle (cursor not over the logo) */
  idleSpinSpeed?: number;
  /** Gradient spin speed, degrees/sec, while the cursor is over the logo */
  hoverSpinSpeed?: number;
  /** Lerp factor per frame toward the target spin speed — lower = smoother speed-up/down */
  spinEase?: number;
};

// Deterministic hash → [0, 1) and 1D value noise — same idle drift mechanism
// as Logo.tsx (see that file for the fuller explanation).
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

// Two independent behaviors running concurrently: cursor position drives
// `baseFrequency` (the ripple's character/direction) via target-and-lerp,
// while continuous noise drives a gentle position/rotation bob on a wrapping
// <g> (the idle "life" — no shape distortion, just drifting in place). They
// don't conflict since they touch different attributes, so there's no
// explicit idle/active mode-switch — cursor tracking just holds still at the
// last position when the mouse stops, while the bob keeps going regardless.
export const LogoCursorReactive = ({
  className,
  frequencyX = 0.035,
  frequencyY = 0.09,
  wiggle = 3.5,
  smoothen = 1.2,
  octaves = 3,
  seed = 5,
  wander = 0.6,
  ease = 0.08,
  bobAmount = 4,
  rotateAmount = 1.5,
  noiseSpeed = 0.25,
  idleSpinSpeed = 20,
  hoverSpinSpeed = 90,
  spinEase = 0.03,
}: LogoCursorReactiveProps) => {
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const current = useRef({ x: frequencyX, y: frequencyY });
  const target = useRef({ x: frequencyX, y: frequencyY });
  const isHovering = useRef(false);
  const gradientAngle = useRef(0);
  const currentSpinSpeed = useRef(idleSpinSpeed);

  useEffect(() => {
    const lo = 1 - wander;
    const hi = 1 + wander;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
      const ny = Math.min(1, Math.max(0, e.clientY / window.innerHeight));
      target.current = {
        x: frequencyX * (lo + nx * (hi - lo)),
        y: frequencyY * (lo + ny * (hi - lo)),
      };
    };
    window.addEventListener("pointermove", handlePointerMove);

    const seedOffset = seed * 17.37;
    let rafId: number;
    let start: number | null = null;
    let lastTime: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      if (lastTime === null) lastTime = now;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const cur = current.current;
      const tgt = target.current;
      cur.x += (tgt.x - cur.x) * ease;
      cur.y += (tgt.y - cur.y) * ease;
      turbulenceRef.current?.setAttribute("baseFrequency", `${cur.x.toFixed(4)} ${cur.y.toFixed(4)}`);

      const t = ((now - start) / 1000) * noiseSpeed + seedOffset;
      const y = (noise1D(t) - 0.5) * 2 * bobAmount;
      const r = (noise1D(t + 91.3) - 0.5) * 2 * rotateAmount;
      if (groupRef.current) {
        groupRef.current.style.transform = `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
      }

      // gradient spins continuously (idle state), easing toward a faster
      // speed while hovered rather than starting/stopping outright
      const targetSpinSpeed = isHovering.current ? hoverSpinSpeed : idleSpinSpeed;
      currentSpinSpeed.current += (targetSpinSpeed - currentSpinSpeed.current) * spinEase;
      gradientAngle.current = (gradientAngle.current + currentSpinSpeed.current * dt) % 360;
      gradientRef.current?.setAttribute("gradientTransform", `rotate(${gradientAngle.current.toFixed(2)} 91 53)`);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [frequencyX, frequencyY, wander, ease, seed, bobAmount, rotateAmount, noiseSpeed, idleSpinSpeed, hoverSpinSpeed, spinEase]);

  return (
    <svg
      width="182"
      height="106"
      viewBox="0 0 182 106"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible" }}
      onPointerEnter={() => {
        isHovering.current = true;
      }}
      onPointerLeave={() => {
        isHovering.current = false;
      }}
    >
      <defs>
        <linearGradient
          ref={gradientRef}
          id="clemLogoCursorGradient"
          x1="94.2749"
          y1="12.6165"
          x2="87.7359"
          y2="93.3844"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4B66FF" />
          <stop offset="1" stopColor="#E6A53C" />
        </linearGradient>
        <filter id="clemLogoCursorStroke" x="-15%" y="-15%" width="130%" height="130%">
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
      <g ref={groupRef} style={{ transformOrigin: "center", transformBox: "fill-box" }}>
        <path
          filter="url(#clemLogoCursorStroke)"
          d="M13.2737 67.7705C8.79928 56.6675 3.81148 32.7532 24.7198 14.9938C45.8851 -2.9839 68.9289 22.1532 95.9158 20.7578C122.903 19.3625 143.726 11.0644 163.119 31.5689C179.62 49.0159 172.262 73.4817 162.353 85.2102C143.355 107.696 127.498 83.0846 79.6119 89.2522C29.1922 95.7462 17.748 78.8734 13.2737 67.7705Z"
          stroke="url(#clemLogoCursorGradient)"
          strokeWidth="8"
        />
        <path
          d="M68.2635 57.4853C68.5973 58.4459 68.534 59.3558 68.0736 60.2151C67.616 61.0426 66.9408 61.7868 66.048 62.4479C65.1552 63.1089 64.1432 63.6632 63.012 64.1108C61.9128 64.5611 60.8752 64.8563 59.8994 64.9961C58.8279 65.1277 57.7038 65.1262 56.527 64.9916C55.3793 64.8917 54.2283 64.6469 53.0737 64.2573C51.9483 63.9023 50.85 63.4213 49.7787 62.814C48.742 62.1777 47.7948 61.4368 46.937 60.5912C45.9019 59.5696 45.1211 58.3934 44.5947 57.0627C44.103 55.7029 43.7777 54.2773 43.6186 52.7859C43.4596 51.2945 43.4281 49.8142 43.5241 48.345C43.6548 46.8467 43.8249 45.4482 44.0346 44.1495C44.2331 42.9783 44.5792 41.7717 45.0729 40.5299C45.5667 39.288 46.2011 38.0906 46.9763 36.9374C47.786 35.7552 48.715 34.6797 49.7631 33.711C50.8431 32.745 52.0686 31.9524 53.4396 31.3329C54.4779 30.8452 55.6111 30.5584 56.8392 30.4726C58.102 30.3577 59.3495 30.4181 60.5816 30.6539C61.8485 30.8605 63.0203 31.2356 64.0972 31.7791C65.2087 32.2934 66.131 32.9519 66.864 33.7545C67.3352 34.2452 67.8069 34.9127 68.2794 35.7568C68.7837 36.6037 69.1273 37.4527 69.31 38.3038C69.4928 39.1549 69.4246 39.9359 69.1057 40.6469C68.8213 41.3288 68.142 41.7515 67.0678 41.9149C66.6104 42.0036 66.2091 42.0008 65.864 41.9065C65.5216 41.7803 65.2154 41.6091 64.9451 41.3928C64.6777 41.1447 64.4289 40.8661 64.1989 40.557C63.9689 40.2478 63.7548 39.9401 63.5567 39.6338C62.8722 38.6427 62.0338 37.9433 61.0415 37.5357C60.0519 37.0962 59.0387 36.9277 58.0019 37.0301C56.9997 37.1035 56.0232 37.436 55.0721 38.0278C54.1558 38.5904 53.414 39.361 52.8469 40.3395C52.2423 41.379 51.7236 42.5383 51.2908 43.8176C50.8927 45.0678 50.6193 46.361 50.4707 47.6971C50.3248 49.0014 50.3252 50.2862 50.4718 51.5517C50.6503 52.82 51.0325 53.9614 51.6186 54.9761C52.0619 55.7856 52.6294 56.4614 53.3209 57.0034C54.0443 57.5482 54.828 57.9537 55.6721 58.2199C56.5162 58.4861 57.3741 58.593 58.246 58.5404C59.1497 58.4906 60.0355 58.2786 60.9033 57.9045C61.1694 57.7992 61.4557 57.6474 61.7621 57.4493C62.1031 57.222 62.4442 56.9947 62.7852 56.7674C63.1262 56.5402 63.4659 56.3288 63.8041 56.1334C64.1743 55.9408 64.5548 55.8133 64.9457 55.751C65.5362 55.6097 66.1564 55.6798 66.8064 55.9612C67.4883 56.2454 67.974 56.7535 68.2635 57.4853ZM79.7197 62.7228C79.6739 62.8794 79.6281 63.036 79.5823 63.1926C79.5712 63.3201 79.5587 63.4636 79.5448 63.623L79.1703 64.6022C79.0954 64.7242 79.0407 64.7997 79.006 64.8288L78.8375 65.1032C78.6476 65.44 78.3356 65.7019 77.9017 65.889C77.1033 66.2049 76.282 66.2298 75.4379 65.9636C74.9015 65.8526 74.4851 65.6558 74.1885 65.373C73.8892 65.1221 73.6897 64.8317 73.5899 64.5018C73.4902 64.1719 73.4224 63.8448 73.3864 63.5204C73.3186 63.1933 73.2958 62.9022 73.318 62.6472L75.6534 35.8689C75.6729 35.6457 75.6896 35.4544 75.7035 35.295C75.752 35.1065 75.7992 34.934 75.845 34.7774C75.8963 34.557 75.9449 34.3685 75.9907 34.2119C76.0683 34.058 76.1474 33.8882 76.2278 33.7025C76.3512 33.392 76.5488 33.1523 76.8205 32.9832C77.2281 32.7296 77.6086 32.6021 77.9621 32.6008C78.1908 32.5565 78.4008 32.5426 78.5921 32.5593C78.7861 32.5441 79.0107 32.5475 79.2657 32.5697C79.712 32.6086 80.211 32.7805 80.7626 33.0855C81.1866 33.3794 81.4748 33.7578 81.6272 34.2208C81.8904 34.8861 81.9983 35.4898 81.9511 36.0317C81.9552 36.3533 81.9294 36.8329 81.8738 37.4704C81.8501 38.1108 81.8243 38.5904 81.7965 38.9092L81.7798 39.1004C81.7546 40.1261 81.7003 41.1171 81.6169 42.0735C81.5363 42.998 81.4314 44.0167 81.3022 45.1297C81.2077 46.2136 81.1 47.2642 80.9791 48.2816C80.8929 49.2698 80.8067 50.2581 80.7206 51.2463L79.8448 61.2882C79.8337 61.4157 79.8226 61.5432 79.8114 61.6708C79.835 61.7692 79.8412 61.8821 79.8301 62.0097C79.8023 62.3284 79.7655 62.5662 79.7197 62.7228ZM101.712 61.8912C102.102 61.8289 102.491 61.7984 102.876 61.7999C103.293 61.8041 103.656 61.8838 103.963 62.0391C104.303 62.1971 104.57 62.4453 104.766 62.7835C104.964 63.0898 105.039 63.514 104.992 64.0559C104.959 64.4384 104.831 64.7967 104.609 65.1307C104.387 65.4648 104.12 65.7627 103.808 66.0247C103.496 66.2866 103.155 66.5139 102.785 66.7065C102.418 66.8672 102.069 66.9975 101.739 67.0972C100.779 67.4312 99.683 67.657 98.4521 67.7747C97.2531 67.8951 96.0188 67.8679 94.7492 67.6932C93.0333 67.4795 91.4047 67.0004 89.8636 66.256C88.3571 65.4824 87.2201 64.3394 86.4526 62.8272C85.746 61.3523 85.3881 59.7472 85.3789 58.0119C85.3696 56.2765 85.5911 54.6577 86.0433 53.1552C86.5553 51.3368 87.2757 49.8898 88.2047 48.8143C89.1683 47.7098 90.2704 46.8581 91.5111 46.2595C93.018 45.5556 94.6654 45.2654 96.4535 45.3889C98.2415 45.5125 99.9164 46.0116 101.478 46.8864C102.521 47.459 103.436 48.1972 104.224 49.101C105.016 49.9729 105.584 51.0021 105.931 52.1886C106.033 52.4866 106.098 52.8456 106.126 53.2656C106.185 53.6883 106.21 54.1402 106.2 54.6211C106.193 55.0702 106.154 55.5165 106.083 55.9601C106.013 56.4036 105.898 56.7951 105.74 57.1347C105.499 57.6919 105.221 58.1174 104.906 58.4112C104.591 58.705 104.204 58.9122 103.744 59.0327C103.283 59.1532 102.732 59.2176 102.089 59.2259C101.48 59.205 100.744 59.173 99.8806 59.13C99.1127 59.0952 98.394 59.0487 97.7245 58.9904C97.0551 58.9321 96.3697 58.8725 95.6683 58.8114C94.9698 58.7185 94.2379 58.6387 93.4728 58.5721C92.7424 58.4763 91.9163 58.3723 90.9946 58.2599C90.8433 58.8892 90.8744 59.454 91.0877 59.9544C91.3357 60.4257 91.6849 60.8415 92.1353 61.202C92.5884 61.5305 93.1109 61.8008 93.7027 62.013C94.2945 62.2251 94.876 62.3721 95.447 62.4539C96.5254 62.6121 97.5684 62.6226 98.5761 62.4855C99.5866 62.3165 100.632 62.1184 101.712 61.8912ZM100.464 52.4354C99.9199 51.6813 99.3268 51.1157 98.6851 50.7387C98.1945 50.4711 97.6609 50.3283 97.0843 50.3102C96.5423 50.263 96.0094 50.2969 95.4854 50.4119C94.5414 50.5545 93.7187 50.9647 93.0171 51.6424C92.9478 51.7006 92.8223 51.8503 92.6407 52.0915C92.4618 52.3007 92.2816 52.526 92.1 52.7671C91.9502 53.011 91.8337 53.2418 91.7505 53.4594C91.6673 53.677 91.6894 53.7914 91.8169 53.8025L101.189 54.6185C101.197 54.1694 101.149 53.7959 101.046 53.4979C100.947 53.168 100.753 52.8138 100.464 52.4354ZM137.016 60.3396C136.991 61.3653 136.938 62.3404 136.857 63.2649C136.779 64.1575 136.664 65.1111 136.511 66.1257C136.478 66.5082 136.441 66.9386 136.399 67.4168C136.357 67.895 136.285 68.3544 136.182 68.7952C136.08 69.2359 135.932 69.6407 135.739 70.0093C135.546 70.378 135.281 70.66 134.943 70.8554C134.538 71.0772 134.092 71.215 133.606 71.269C133.122 71.2911 132.678 71.2204 132.275 71.0568C131.872 70.8932 131.526 70.6222 131.238 70.2438C130.981 69.8681 130.865 69.3601 130.889 68.7198C130.921 67.245 131.001 65.7744 131.129 64.308C131.193 63.5747 131.238 62.872 131.265 62.1998C131.323 61.5303 131.421 60.5913 131.559 59.3827C131.611 58.777 131.623 58.0874 131.594 57.314C131.568 56.5087 131.378 55.93 131.023 55.5779C130.758 55.2979 130.452 55.1266 130.104 55.0642C129.759 54.9699 129.406 54.9713 129.044 55.0683C128.714 55.168 128.406 55.3821 128.121 55.7106C127.838 56.0072 127.626 56.4064 127.486 56.9081C127.45 57.3225 127.397 57.7515 127.326 58.195C127.29 58.6095 127.271 59.0093 127.269 59.3947C127.212 60.4176 127.143 61.3913 127.063 62.3157C126.985 63.2084 126.886 64.1633 126.765 65.1807C126.697 65.5923 126.642 66.0373 126.6 66.5154C126.59 66.9964 126.549 67.4746 126.475 67.95C126.404 68.3935 126.272 68.7996 126.08 69.1683C125.919 69.5397 125.653 69.8218 125.283 70.0144C124.878 70.2361 124.45 70.3594 123.998 70.3843C123.581 70.3801 123.188 70.2817 122.819 70.089C122.485 69.8672 122.192 69.5525 121.938 69.145C121.716 68.7402 121.617 68.2177 121.641 67.5773C121.641 66.8385 121.652 66.1649 121.673 65.5564C121.728 64.9189 121.787 64.2494 121.848 63.5481C121.912 62.8148 121.993 62.0671 122.092 61.3048C122.193 60.5106 122.244 59.7441 122.244 59.0053C122.264 58.7822 122.27 58.5257 122.263 58.236C122.291 57.9173 122.303 57.5971 122.299 57.2755C122.326 56.9567 122.321 56.6511 122.282 56.3586C122.278 56.0371 122.237 55.7765 122.158 55.5769C121.942 55.1084 121.504 54.7812 120.846 54.5954C120.219 54.4124 119.673 54.413 119.208 54.5973C118.742 54.7816 118.382 55.0394 118.128 55.3706C117.875 55.7018 117.682 56.0705 117.55 56.4766C117.418 56.8827 117.332 57.3249 117.29 57.803C117.251 58.2493 117.213 58.6797 117.177 59.0941C116.997 61.1663 116.839 62.9674 116.706 64.4976C116.607 65.9987 116.342 67.1962 115.911 68.0902C115.71 68.5545 115.343 68.892 114.811 69.1026C114.31 69.316 113.773 69.3977 113.199 69.3477C112.657 69.3006 112.158 69.1286 111.702 68.832C111.247 68.5353 110.962 68.1091 110.85 67.5532C110.785 67.1942 110.733 66.6918 110.693 66.0459C110.687 65.3709 110.703 64.6335 110.741 63.8337C110.779 63.034 110.832 62.2356 110.902 61.4387C110.974 60.6098 111.039 59.8606 111.098 59.1912L111.698 52.3053C111.73 51.5693 111.784 50.771 111.859 49.9102C111.934 49.0495 112.13 48.2796 112.446 47.6004C112.722 47.0142 113.106 46.6621 113.598 46.5444C114.093 46.3947 114.594 46.3581 115.101 46.4344C115.675 46.4843 116.108 46.6826 116.398 47.0291C116.724 47.3466 116.947 47.7354 117.068 48.1956C117.191 48.6239 117.245 49.1104 117.229 49.6551C117.217 50.1679 117.206 50.6648 117.196 51.1458C117.616 50.3794 118.087 49.7619 118.61 49.2935C119.167 48.796 119.915 48.5077 120.854 48.4288C123.252 48.1879 125.08 48.9574 126.338 50.7372C127.031 50.1552 127.89 49.6999 128.914 49.3716C129.704 49.1513 130.497 49.0918 131.291 49.193C132.088 49.2624 132.824 49.4711 133.501 49.8191C134.209 50.1698 134.826 50.6412 135.353 51.2331C135.911 51.8277 136.333 52.5229 136.617 53.3185C137.006 54.3803 137.178 55.5356 137.133 56.7844C137.089 58.0333 137.05 59.2183 137.016 60.3396Z"
          fill="white"
        />
      </g>
    </svg>
  );
};
