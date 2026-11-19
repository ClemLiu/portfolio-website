import { useState } from "react";
import { TargetsTable } from "./TargetsTable";

export type Prototype =
  | {
      title: string;
      /** embeddable Figma URL, shown in the iframe */
      embedUrl: string;
      /** regular Figma prototype URL, for the "Open in Figma" link */
      figmaUrl: string;
    }
  | {
      title: string;
      /** a prototype rebuilt natively on the page instead of embedded from Figma */
      native: "targetsTable";
    };

export type PrototypeViewerProps = {
  prototypes: Prototype[];
};

const ExpandIcon = () => (
  <svg
    width="14"
    height="14"
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
              key={p.title}
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

      {"native" in current ? (
        <figure>
          <p className="mb-2 text-sm text-ink-300">
            Table interactions prototype for hand off
          </p>
          <div className="soft-image-shadow overflow-hidden rounded-xl border border-ink-300/20">
            {/* key remounts per page so sort state can't leak between prototypes */}
            <TargetsTable key={current.title} />
          </div>
        </figure>
      ) : (
        <figure>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-ink-300">
            <span>
              {current.title} —{" "}
              <a
                href={current.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                Open in Figma
              </a>
            </span>
            {/* Figma's own embed UI has the full-screen control in its top-right corner */}
            <span className="flex items-center gap-1.5">
              <ExpandIcon />
              Use the expand icon in the corner for full screen
            </span>
          </div>
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
        </figure>
      )}
    </div>
  );
};
