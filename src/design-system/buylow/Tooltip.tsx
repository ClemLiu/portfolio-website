import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** what to say, and the point to hang under: the middle of the trigger's bottom edge, in window coordinates */
export type Tip = { title: string; text: string; x: number; y: number };

/** the gap under the trigger, which holds the arrow, and the least space to the window's sides */
const GAP = 8;

// One bubble shared by every trigger: the "Tooltip open/close" recipe from transitions.dev (see .bl-tooltip in
// buylow.css for the timing). While it's showing it travels to the next trigger; while it's hidden it jumps
// there and only appears. It lives on <body> so that nothing in the table can clip it.
export const Tooltip = ({ tip }: { tip: Tip | null }) => {
  // the latest words stay in place while the bubble fades away
  const [last, setLast] = useState<Tip | null>(null);
  if (tip && tip !== last) setLast(tip);

  const bubble = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const showing = useRef(false);

  // the position and "showing" are set here rather than while rendering, because their order matters
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!el || !box.current || !content.current) return;
    if (!tip) {
      el.dataset.show = "false";
      showing.current = false;
      return;
    }
    const { offsetWidth: width, offsetHeight: height } = content.current;
    const x = Math.max(GAP, Math.min(tip.x - width / 2, document.documentElement.clientWidth - width - GAP));
    const jump = !showing.current;
    if (jump) el.classList.add("bl-tooltip--snap");
    el.style.translate = `${x}px ${tip.y + GAP}px`;
    el.style.setProperty("--bl-tt-arrow", `${tip.x - x}px`);
    box.current.style.width = `${width}px`;
    box.current.style.height = `${height}px`;
    if (jump) {
      // applied now, so that only the appearing is animated
      void el.offsetWidth;
      el.classList.remove("bl-tooltip--snap");
    }
    el.dataset.show = "true";
    showing.current = true;
  }, [tip]);

  return createPortal(
    <div ref={bubble} className="bl-tokens bl-tooltip" role="tooltip" aria-hidden={tip === null}>
      <div ref={box} className="bl-tooltip-box">
        <div ref={content} className="bl-tooltip-content">
          <strong>{last?.title}</strong>
          <span>{last?.text}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};
