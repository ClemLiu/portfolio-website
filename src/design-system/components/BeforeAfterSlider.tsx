import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const HandleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6-6 6 6 6" />
    <path d="m15 6 6 6-6 6" />
  </svg>
);

export type BeforeAfterSliderProps = {
  srcBefore: string;
  srcAfter: string;
  altBefore: string;
  altAfter: string;
  labelBefore?: string;
  labelAfter?: string;
  width?: number;
  height?: number;
  className?: string;
};

// Classic drag-the-divider before/after comparison. "After" is layered on
// top of "before" and clipped to the left `position`% of the container, so
// dragging right reveals more of "after", left reveals more of "before".
// Whole container is draggable/clickable (via Pointer Events, unifying
// mouse/touch/pen), not just the visible handle — matches how these
// sliders are normally expected to behave.
export const BeforeAfterSlider = ({
  srcBefore,
  srcAfter,
  altBefore,
  altAfter,
  labelBefore,
  labelAfter,
  width,
  height,
  className,
}: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const stopDragging = () => {
    draggingRef.current = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setPosition((p) => Math.max(0, p - 5));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPosition((p) => Math.min(100, p + 5));
      e.preventDefault();
    } else if (e.key === "Home") {
      setPosition(0);
      e.preventDefault();
    } else if (e.key === "End") {
      setPosition(100);
      e.preventDefault();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`soft-image-shadow relative select-none overflow-hidden rounded-xl ${className ?? ""}`}
      style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined, touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <img src={srcBefore} alt={altBefore} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 h-full w-full" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={srcAfter} alt={altAfter} className="h-full w-full object-cover" draggable={false} />
      </div>

      {labelBefore && (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-paper-dark/70 px-3 py-1 font-mono text-xs uppercase tracking-wide text-paper backdrop-blur-sm">
          {labelBefore}
        </span>
      )}
      {labelAfter && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-paper-dark/70 px-3 py-1 font-mono text-xs uppercase tracking-wide text-paper backdrop-blur-sm">
          {labelAfter}
        </span>
      )}

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparison slider"
          aria-valuenow={Math.round(position)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={handleKeyDown}
          className="pointer-events-auto absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-paper text-paper-dark shadow-lg"
        >
          <HandleIcon />
        </div>
      </div>
    </div>
  );
};
