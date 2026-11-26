import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type Option<T> = { value: T; label: string; disabled?: boolean; title?: string };

// A row of choices where one is picked. The highlight slides to it: the "Tabs sliding" recipe from
// transitions.dev, with the look kept from the design (see .bl-segmented in buylow.css).
export const Segmented = <T extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: {
  /** what it chooses, for screen readers */
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) => {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // puts the highlight behind the picked button, sliding there or jumping straight to it
  const place = useCallback((slide: boolean) => {
    const highlight = pill.current;
    const picked = bar.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!highlight || !picked) return;
    if (!slide) highlight.style.transition = "none";
    highlight.style.width = `${picked.offsetWidth}px`;
    highlight.style.transform = `translateX(${picked.offsetLeft}px)`;
    if (!slide) {
      // applied now, so that turning the transition back on doesn't animate this move
      void highlight.offsetWidth;
      highlight.style.transition = "";
    }
  }, []);

  // it starts in place; only a change of choice slides
  useLayoutEffect(() => {
    place(placed.current);
    placed.current = true;
  }, [value, place]);

  // when the row changes width (window resized), keep up without sliding
  useEffect(() => {
    let width = bar.current?.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (bar.current?.offsetWidth === width) return;
      width = bar.current?.offsetWidth;
      place(false);
    });
    if (bar.current) observer.observe(bar.current);
    return () => observer.disconnect();
  }, [place]);

  return (
    <div ref={bar} className="bl-segmented" role="group" aria-label={label}>
      <span ref={pill} className="bl-segmented-pill" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};
