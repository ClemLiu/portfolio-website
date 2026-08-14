import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ExpandIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const TRANSITION_MS = 300;

export type ExpandableImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

// Wraps an already-optimized image (resolved server-side via astro:assets'
// getImage(), since <Image> itself is an Astro-only component and can't be
// nested inside a React island) with a click-to-expand lightbox.
//
// The expand/collapse uses the FLIP technique: measure the trigger
// thumbnail's on-page rect right before opening, let the lightbox's image
// lay out at its natural (final) size, then compute the transform that
// would make it exactly overlap the thumbnail and apply that instantly
// (before paint, via useLayoutEffect) as the starting point. Flipping to
// the identity transform one frame later — a CSS transition, not a JS
// animation — is what makes it visibly grow from where it was instead of
// just snapping into place. Closing reverses the same transform.
export const ExpandableImage = ({ src, alt, width, height, className }: ExpandableImageProps) => {
  const [open, setOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [flipTransform, setFlipTransform] = useState("none");
  const triggerImgRef = useRef<HTMLImageElement>(null);
  const overlayImgRef = useRef<HTMLImageElement>(null);
  const startRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const closeTimeoutRef = useRef<number>();

  const handleOpen = () => {
    const el = triggerImgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    startRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    window.clearTimeout(closeTimeoutRef.current);
    setAnimateIn(false);
    // reset to untransformed before the overlay remounts — otherwise a
    // second+ open reuses the previous close's leftover transform as the
    // overlay's initial style, and measuring its box in the layout effect
    // below returns the already-shrunk post-transform size instead of the
    // image's true natural size, compounding a wrong scale on top of the
    // old one each time.
    setFlipTransform("none");
    setOpen(true);
  };

  const handleClose = () => {
    setAnimateIn(false);
    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => setOpen(false), TRANSITION_MS);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const overlay = overlayImgRef.current;
    const start = startRectRef.current;
    if (!overlay || !start) return;

    const measureAndAnimate = () => {
      const end = overlay.getBoundingClientRect();
      const scaleX = start.width / end.width;
      const scaleY = start.height / end.height;
      const translateX = start.left + start.width / 2 - (end.left + end.width / 2);
      const translateY = start.top + start.height / 2 - (end.top + end.height / 2);
      setFlipTransform(`translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`);
      // a single rAF can fire before the browser has actually painted the
      // starting transform (it may run in the same pre-paint batch as this
      // effect's own commit), so the flip to the final state ends up
      // happening within one frame — no visible transition, just a snap.
      // Nesting two rAFs guarantees a real painted frame in between.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    };

    // until the image has actually decoded, it has no intrinsic size, so
    // object-contain/max-w-full/max-h-full resolve its box to something
    // other than its real final size — measuring too early computed a
    // FLIP delta close to zero (start ≈ wrong end), which is why this
    // looked like it wasn't animating at all even though the transition
    // itself was wired up correctly.
    if (overlay.complete && overlay.naturalWidth > 0) {
      measureAndAnimate();
    } else {
      overlay.addEventListener("load", measureAndAnimate, { once: true });
      return () => overlay.removeEventListener("load", measureAndAnimate);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimeoutRef.current), []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
        aria-label={`Expand image: ${alt}`}
      >
        <img
          ref={triggerImgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={open ? { visibility: "hidden" } : undefined}
        />
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-paper-dark/70 text-paper backdrop-blur-sm transition-colors group-hover:text-accent">
          <ExpandIcon />
        </span>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-paper-dark/90 p-6 backdrop-blur-sm"
            style={{ opacity: animateIn ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease-out` }}
            onClick={handleClose}
          >
            <img
              ref={overlayImgRef}
              src={src}
              alt={alt}
              className="max-h-full max-w-full rounded-xl object-contain"
              style={{
                transform: animateIn ? "none" : flipTransform,
                transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.2, 0, 0.2, 1)`,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-paper-dark/70 text-paper transition-colors hover:text-accent"
              style={{ opacity: animateIn ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease-out` }}
            >
              <CloseIcon />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};
