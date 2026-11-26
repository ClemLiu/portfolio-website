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

// In plain words, the model's Momentum rules (see "Cautions and Momentum" in the data repo's README).
const LEGEND = [
  {
    title: "Cold: buy low",
    levels: [
      { momentum: "Cold", text: "Scoring less than his play and history suggest he should. Could be a good time to get him." },
      { momentum: "Very cold", text: "A much bigger gap, with no cautions. The clearest buys." },
      { momentum: "Frozen", text: "A much bigger gap, but with at least one caution: part of the slump may be real." },
    ],
  },
  {
    title: "Hot: sell high",
    levels: [
      { momentum: "Hot", text: "Scoring more than his play and history suggest he should. Could be a good time to trade him." },
      { momentum: "Very hot", text: "A much bigger gap, with no cautions. The clearest sells." },
      { momentum: "On fire", text: "A much bigger gap, but with at least one caution: part of the hot streak may be real." },
    ],
  },
];

export const MomentumLegend = () => (
  <section className="bl-legend" aria-label="Hot and cold legend">
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
  </section>
);
