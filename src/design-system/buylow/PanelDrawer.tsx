import { useEffect, useState, type ReactNode } from "react";

/** how long a panel takes to open or close; keep in step with --bl-drawer-time in buylow.css */
const DRAWER_MS = 320;

// The space the side panels sit in. It opens towards the right and closes back towards the left (see "side panel
// drawer" in buylow.css), so a closing panel has to stay on screen until it has gone.
//
// Both panels sit on top of each other like two pages, and CSS moves between them: the "Page side-by-side" recipe
// from transitions.dev.
export const PanelDrawer = <T extends string>({
  open,
  pages,
  children,
}: {
  open: T | null;
  /** the panels, in the order of their buttons: the first leaves to the left, the second to the right */
  pages: readonly [T, T];
  children: (panel: T) => ReactNode;
}) => {
  const [state, setState] = useState({
    open,
    /** the panel on screen: the open one, or one still on its way out */
    shown: open,
    /** nothing moves on page load, only once a panel has been opened or closed */
    moves: false,
  });
  // adjusted while rendering, so a newly picked panel never shows a frame late
  if (open !== state.open) {
    setState({ open, shown: open ?? state.shown, moves: true });
  }
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setState((s) => ({ ...s, shown: null })), DRAWER_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!state.shown) return null;
  return (
    // inert: a panel on its way out can't be clicked or tabbed into
    <div className={state.moves ? "bl-drawer bl-drawer--moves" : "bl-drawer"} data-open={open !== null} inert={open === null}>
      <div className="bl-drawer-body">
        <div className="bl-pages" data-page={pages.indexOf(state.shown) + 1}>
          {pages.map((id, i) => (
            // the hidden page is inert too, so the keyboard can't reach controls nobody can see
            <div key={id} className="bl-page" data-page-id={i + 1} inert={id !== state.shown}>
              {children(id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
