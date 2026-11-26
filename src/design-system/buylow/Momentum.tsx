import { useState } from "react";
import { Accordion } from "./Accordion";
import { Icon, type IconName } from "./icons";

// The hot / cold indicator beside each player, and the legend that explains it.

const MOMENTUM_ICON: Record<string, { icon: IconName; className: string }> = {
  Frozen: { icon: "severe-cold", className: "bl-momentum--buy bl-momentum--solid bl-momentum--severe" },
  "Very cold": { icon: "snowflake", className: "bl-momentum--buy bl-momentum--solid" },
  Cold: { icon: "snowflake", className: "bl-momentum--buy" },
  Hot: { icon: "mode-heat", className: "bl-momentum--sell" },
  "Very hot": { icon: "mode-heat", className: "bl-momentum--sell bl-momentum--solid" },
  "On fire": { icon: "emergency-heat", className: "bl-momentum--sell bl-momentum--solid bl-momentum--severe" },
};

/** `label` is read out and shown on hover; without one the icon is decoration beside text that already says it */
export const MomentumIcon = ({ momentum, label }: { momentum: string; label?: string }) => {
  const style = MOMENTUM_ICON[momentum];
  return (
    <span
      className={`bl-momentum ${style?.className ?? ""}`}
      title={label}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon name={style?.icon ?? "dot"} />
    </span>
  );
};

// What each level means, as worded in the design.
const LEGEND = [
  {
    title: "Buy low",
    levels: [
      { momentum: "Frozen", text: "Well below, with a caution" },
      { momentum: "Very cold", text: "Well below expected" },
      { momentum: "Cold", text: "Below expected" },
    ],
  },
  {
    title: "Sell high",
    levels: [
      { momentum: "Hot", text: "Above expected" },
      { momentum: "Very hot", text: "Well above expected" },
      { momentum: "On fire", text: "Well above, with a caution" },
    ],
  },
];

/** whether this visitor last left the legend open; deliberately not part of the page URL */
const LEGEND_KEY = "buylow-legend-open";

// storage can be unavailable (private windows, blocked site data); the legend then just starts closed
const wasOpen = () => {
  try {
    return window.localStorage.getItem(LEGEND_KEY) === "1";
  } catch {
    return false;
  }
};

/** a bar that opens to show the six levels */
export const MomentumLegend = () => {
  const [open, setOpen] = useState(wasOpen);
  const toggle = () => {
    setOpen(!open);
    try {
      window.localStorage.setItem(LEGEND_KEY, open ? "0" : "1");
    } catch {
      // not remembered, which is fine
    }
  };
  return (
    <section className="bl-legend" aria-label="Momentum legend">
      <button type="button" className="bl-legend-bar" aria-expanded={open} onClick={toggle}>
        <Icon name="chevron-right" />
        <span className="bl-legend-name">Legend for Momentum Icon</span>
        <span className="bl-legend-note">Determined by FP/GP vs Expected and vs 3Y avg</span>
      </button>
      <Accordion open={open}>
        <div className="bl-legend-groups">
          {LEGEND.map((group) => (
            <div key={group.title}>
              <h2 className="bl-legend-title">{group.title}</h2>
              <dl className="bl-legend-items">
                {group.levels.map(({ momentum, text }) => (
                  <div className="bl-legend-item" key={momentum}>
                    <MomentumIcon momentum={momentum} />
                    <div>
                      <dt>{momentum}</dt>
                      <dd>{text}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Accordion>
    </section>
  );
};
