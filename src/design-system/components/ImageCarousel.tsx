import { useState } from "react";
import { ExpandableImage } from "./ExpandableImage";

const ArrowIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);

export type CarouselImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type ImageCarouselProps = {
  images: CarouselImage[];
  className?: string;
};

// Arrow-button carousel. Each slide is rendered via ExpandableImage, so
// clicking it opens the same lightbox as every other case-study image —
// no separate expand behavior to build or keep in sync. `key={src}` forces
// ExpandableImage to remount on slide change, so its own open/close state
// can't leak between different images.
export const ImageCarousel = ({ images, className }: ImageCarouselProps) => {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);
  const current = images[index];

  return (
    <div className={`relative ${className ?? ""}`}>
      <ExpandableImage
        key={current.src}
        src={current.src}
        alt={current.alt}
        width={current.width}
        height={current.height}
        className="w-full rounded-xl"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            className="absolute left-0 top-0 flex h-full w-16 items-center justify-start pl-3 text-paper transition-colors hover:text-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-dark/70 backdrop-blur-sm">
              <ArrowIcon direction="left" />
            </span>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            className="absolute right-0 top-0 flex h-full w-16 items-center justify-end pr-3 text-paper transition-colors hover:text-accent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-dark/70 backdrop-blur-sm">
              <ArrowIcon direction="right" />
            </span>
          </button>
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-paper-dark/70 px-3 py-1 font-mono text-xs text-paper backdrop-blur-sm">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
};
