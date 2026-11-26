import { useEffect, useState, type ReactNode } from "react";

/** how long it takes to open or close; keep in step with --bl-acc-time in buylow.css */
const ACC_MS = 250;

// Content that opens and closes in height: the "Accordion expand" recipe from transitions.dev (see .bl-acc in
// buylow.css). It's only built while it's open or on its way closed, so a long table isn't full of hidden rows.
export const Accordion = ({ open, children }: { open: boolean; children: ReactNode }) => {
  const [state, setState] = useState({ open, moving: false });
  // adjusted while rendering, so closing content stays put and opening content never shows a frame late
  if (open !== state.open) setState({ open, moving: true });

  useEffect(() => {
    if (!state.moving) return;
    const timer = window.setTimeout(() => setState((s) => ({ ...s, moving: false })), ACC_MS);
    return () => window.clearTimeout(timer);
  }, [state.moving, state.open]);

  if (!open && !state.moving) return null;
  return (
    // "moving" gives opening content a closed starting point; content that was already open just appears
    <div className={state.moving ? "bl-acc bl-acc--moving" : "bl-acc"} data-open={open} inert={!open}>
      <div className="bl-acc-inner">{children}</div>
    </div>
  );
};
