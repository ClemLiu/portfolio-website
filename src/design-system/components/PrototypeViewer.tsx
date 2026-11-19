import { useState } from "react";

export type Prototype = {
  title: string;
  /** embeddable Figma URL, shown in the iframe */
  embedUrl: string;
  /** regular Figma prototype URL, for the "Open in Figma" link */
  figmaUrl: string;
};

export type PrototypeViewerProps = {
  prototypes: Prototype[];
};

const pageButton =
  "flex h-9 min-w-9 items-center justify-center rounded-full border border-ink-300/20 px-3 font-mono text-sm transition-colors";

// One embedded Figma prototype at a time, with pagination underneath.
export const PrototypeViewer = ({ prototypes }: PrototypeViewerProps) => {
  const [index, setIndex] = useState(0);

  if (prototypes.length === 0) return null;

  const current = prototypes[index];
  const last = prototypes.length - 1;

  return (
    <div>
      {prototypes.length > 1 && (
        <nav aria-label="Prototype pages" className="mb-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous prototype"
            className={`${pageButton} text-paper hover:text-accent disabled:pointer-events-none disabled:opacity-40`}
          >
            ‹
          </button>
          {prototypes.map((p, i) => (
            <button
              key={p.embedUrl}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Prototype ${i + 1}: ${p.title}`}
              aria-current={i === index ? "page" : undefined}
              className={`${pageButton} ${
                i === index ? "border-paper bg-paper text-paper-dark" : "text-paper hover:text-accent"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(last, i + 1))}
            disabled={index === last}
            aria-label="Next prototype"
            className={`${pageButton} text-paper hover:text-accent disabled:pointer-events-none disabled:opacity-40`}
          >
            ›
          </button>
        </nav>
      )}

      <figure>
        <div className="soft-image-shadow overflow-hidden rounded-xl border border-ink-300/20">
          {/* key forces a fresh iframe per page so one prototype's state can't leak into the next */}
          <iframe
            key={current.embedUrl}
            src={current.embedUrl}
            title={current.title}
            className="h-[75vh] min-h-[480px] w-full"
            allowFullScreen
          />
        </div>
        <figcaption className="mt-2 text-sm text-ink-300">
          {current.title} —{" "}
          <a
            href={current.figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            Open in Figma
          </a>
        </figcaption>
      </figure>
    </div>
  );
};
