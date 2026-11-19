// Column layout, header descriptions and row data for the buy-low / sell-high
// table (TargetsTable.tsx). The rows themselves are generated from the model's
// buy_sell.csv by scripts/build-targets-data.mjs; layout and wording are from
// the Figma prototype ("Prototypes" file, frame "Buy-low targets") and the
// README of the Hockey-BuyLowSellHigh project.
import { heat, rows as rawRows } from "./targetsData.generated";

export type Column = {
  label: string;
  /** width in px, from the design (SIDE is the one column added to it, and VERDICT is 8px wider) */
  width: number;
  align: "left" | "right";
  /** numeric columns can be sorted by clicking their header */
  sortable: boolean;
  /** shown in a tooltip on the header; only columns the project docs describe have one */
  description?: string;
};

export type TableRow = {
  /** "Buy" or "Sell": which list the player is from */
  side: "Buy" | "Sell";
  cells: string[];
  /** heat level per cell index (0 = none; positive = blue, negative = red; magnitude 10–100) */
  heat: Record<number, number>;
};

/** index of the SIDE column */
export const SIDE_COL = 5;
/** index of the SCORE column, which the table starts sorted by */
export const SCORE_COL = 11;

/** columns that carry a heat-map background, in the order of each row's heat array */
const heatColumns = [9, 11, 13, 14, 15];

/** a vertical dashed divider is drawn on the right edge of these columns */
export const dividerAfter = [6, 11];

export const columns: Column[] = [
  { label: "PLAYER", width: 140, align: "left", sortable: false },
  { label: "TEAM", width: 52, align: "left", sortable: false },
  { label: "POS", width: 44, align: "left", sortable: false },
  {
    label: "AGE",
    width: 40,
    align: "right",
    sortable: true,
    description:
      "Player age, taken from the Yahoo 2026-27 fantasy projections file. Some ages run a year behind, and T.J. Hughes has no age.",
  },
  { label: "GP", width: 40, align: "right", sortable: true },
  {
    label: "SIDE",
    width: 52,
    align: "left",
    sortable: false,
    description: "Which list he's from: Buy (a buy-low target) or Sell (a sell-high candidate).",
  },
  {
    label: "VERDICT",
    // the design's 148px was sized for the buy wording ("Caution: role reduced" leaves ~17px before the divider);
    // "Caution: role increased" is 9px wider, so +8px keeps about the same room
    width: 156,
    align: "left",
    sortable: false,
    description:
      "Buys: Strong buy (luck gap of 0.6+, role intact), Buy (0.3+), Caution: role reduced, Buy: limited history. Sells: Strong sell (over/GP of 0.6+, role steady), Sell (0.3+), Caution: role increased, Sell: limited history, Above his norm (mostly above his own baseline, not luck).",
  },
  {
    label: "FP/GP",
    width: 56,
    align: "right",
    sortable: true,
    description:
      "Actual fantasy points per game this season. League scoring: G 3 · A 2.5 · PPP 0.5 · BLK 0.5 · SOG 0.25 · HIT 0.25 · PIM 0.25.",
  },
  {
    label: "EXP FP/GP",
    width: 72,
    align: "right",
    sortable: true,
    description:
      "Fantasy points per game his underlying play suggests. Shots, hits, blocks and PIM are kept as they are (role-driven, stable). Goals, assists and power-play points (luck-driven) are replaced with expected values built from his shot quality, on-ice chances and power-play minutes, using his 3-year rates.",
  },
  {
    label: "DIFF/GP",
    width: 72,
    align: "right",
    sortable: true,
    description:
      "FP/GP minus expected FP/GP. Negative means he's scoring below what his play supports (a buy); positive means above it (a sell).",
  },
  {
    label: "3YR ADJ",
    width: 64,
    align: "right",
    sortable: true,
    description:
      "His 3-year FP/GP baseline, with goals, assists, power-play points and shots carried forward to his current age on an aging curve. Hits, blocks and PIM aren't age-adjusted. Needs 60+ games of history, otherwise it shows —.",
  },
  {
    label: "SCORE",
    width: 76,
    align: "right",
    sortable: true,
    description:
      "The target score for buys or the sell score for sells. Target score: luck gap + 0.5 × (3-year age-adjusted FP/GP − FP/GP, if positive), the second part only when his role is intact. Sell score: over/GP + 0.5 × (FP/GP − 3-year age-adjusted FP/GP, if positive), the second part only when his role is steady. Both need 0.35 or more to make the list.",
  },
  {
    label: "DRIVER",
    width: 88,
    align: "left",
    sortable: false,
    description:
      "The main shortfall for buys, or the main surplus for sells. For sells that's whichever of goals, assists or power-play points is furthest above expected, in fantasy points.",
  },
  {
    label: "TOI CHG",
    width: 64,
    align: "right",
    sortable: true,
    description:
      "Change in ice time per game versus his 3-year average, in minutes. For buys, down 1.5 or more triggers the “Less TOI” role flag. For sells, up 1.5 or more triggers “More TOI”: a bigger role can make a hot start partly real.",
  },
  {
    label: "PP TOI CHG",
    width: 76,
    align: "right",
    sortable: true,
    description:
      "Change in power-play time per game versus his 3-year average, in minutes. For buys, down 0.75 or more triggers the “Less PP” role flag. For sells, up 0.75 or more triggers “More PP”.",
  },
  {
    label: "HIT/BLK CHG",
    width: 84,
    align: "right",
    sortable: true,
    description:
      "Change in fantasy points per game from hits and blocks versus his 3-year average. A warning flag only, it isn't part of the score. Hits and blocks are stable year to year, so a drop is treated as real, not luck.",
  },
  {
    label: "FLAGS",
    width: 244,
    align: "left",
    sortable: false,
    description:
      "Warnings about his role. Buys: “Less TOI” (ice time down 1.5+ minutes versus his 3-year average), “Less PP” (power-play time down 0.75+ minutes) and a hits/blocks drop. Sells: “More TOI” and “More PP” (up by the same amounts).",
  },
];

export const rows: TableRow[] = rawRows.map((line, i) => {
  const cells = line.split("|");
  return {
    side: cells[SIDE_COL] === "Buy" ? "Buy" : "Sell",
    cells,
    heat: Object.fromEntries(heatColumns.map((col, j) => [col, heat[i][j]])),
  };
});

export const TOTAL_WIDTH = columns.reduce((sum, c) => sum + c.width, 0);
