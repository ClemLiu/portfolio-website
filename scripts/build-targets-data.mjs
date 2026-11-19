// Builds src/design-system/data/targetsData.generated.ts from the Hockey
// buy-low / sell-high model's CSV output.
//
//   npm run data:targets                      # reads the default folder below
//   node scripts/build-targets-data.mjs <dir> # or point it at another output folder
//
// <dir> needs buy_sell.csv (every buy and sell in one table, sorted by Diff/GP) and
// all_skaters.csv (more precise role numbers) — both written by build_targets.py.
//
// Everything shown in the table comes straight from buy_sell.csv, plus two things
// it doesn't contain, derived with fixed rules (they reproduce the Figma design's
// FLAGS column and heat-map exactly for the buy side). Each rule is applied per
// Side, so a Buy and a Sell are shaded against their own side's strongest values:
//   - FLAGS: buys get "Less TOI" (TOI/GP down 1.5+ min vs 3-yr average), "Less PP"
//     (PP TOI/GP down 0.75+) and "Hits/blocks down" (HIT/BLK chg of -0.15 or worse).
//     For sells the role flags flip: "More TOI" (up 1.5+) and "More PP" (up 0.75+).
//   - heat: Diff/GP only shades the 10 lowest values (blue, the strongest buys) and the 10
//     highest (red, the strongest sells), each scaled to the largest of its group in steps of
//     10 (10–100). Score gets blue intensity = value / its side's largest. TOI/PP/hits-blocks
//     get red on role changes that weaken the signal (the same thresholds as the flags),
//     scaled to the side's largest such change; hits/blocks only for buys.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// defaults to ~/Hockey-BuyLowSellHigh/output, or pass the folder as the first argument
const DIR = process.argv[2] ?? path.join(os.homedir(), "Hockey-BuyLowSellHigh", "output");
const OUT = fileURLToPath(new URL("../src/design-system/data/targetsData.generated.ts", import.meta.url));

// MoneyPuck drops accented letters, so a few names arrive mangled
const NAME_FIXES = {
  "Juraj Slafkovsk": "Juraj Slafkovský",
  "Alexis Lafrenire": "Alexis Lafrenière",
  "Tim Sttzle": "Tim Stützle",
  "Charle-Edouard D'Astous": "Charle-Édouard D'Astous",
  "Martin Pospisil": "Martin Pospíšil",
  "Martin Necas": "Martin Nečas",
};

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

function readCsv(file) {
  const [header, ...rest] = parseCsv(fs.readFileSync(path.join(DIR, file), "utf8"));
  return rest.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i]])));
}

const DASH = "—";
const num = (s) => (s === "" || s === undefined ? null : Number(s));

// Rounds like Python's format(): exact ties (0.25 -> 0.2) go to even, everything else follows the
// exact binary value (0.45 is really 0.4500000000000000111, so it rounds to 0.5).
function toFixedPy(n, d) {
  const abs = Math.abs(n), exact = abs.toFixed(30), dot = exact.indexOf("."), tail = exact.slice(dot + 1 + d);
  let out;
  if (tail[0] === "5" && /^0*$/.test(tail.slice(1))) {
    const head = exact.slice(0, dot + 1 + d).replace(/\.$/, "");
    out = Number(head.replace(".", "").slice(-1)) % 2 === 0 ? head : (Number(head) + 10 ** -d).toFixed(d);
  } else out = abs.toFixed(d);
  return (n < 0 ? "-" : "") + out;
}
const fixed = (n, d) => (n === null ? DASH : toFixedPy(n, d).replace(/^-(0\.0+)$/, "$1"));
// plusOnRoundedOnly: the one-decimal TOI column shows "0.0", not "+0.0", for tiny positive values
const signed = (n, d, plusOnRoundedOnly) => {
  if (n === null) return DASH;
  const s = toFixedPy(n, d).replace(/^-(0\.0+)$/, "$1");
  return (plusOnRoundedOnly ? Number(s) > 0 : n > 0) ? "+" + s : s;
};

function build() {
  const rows = readCsv("buy_sell.csv");
  const precise = new Map(readCsv("all_skaters.csv").map((r) => [r.playerId, r]));

  const items = rows.map((r) => {
    const buy = r.Side === "Buy";
    const p = precise.get(r.playerId) ?? {};
    // shown values and heat magnitudes use the CSV's own 2-decimal columns; the more precise
    // all_skaters values only decide which side of a role threshold a player is on
    const toi = num(r["TOI chg"]), pp = num(r["PP TOI chg"]), hb = num(r["HIT/BLK FP/GP chg"]);
    const toiP = num(p["TOI chg"]), ppP = num(p["PP TOI chg"]);
    const flags = [];
    if (buy) {
      if (toiP !== null && toiP <= -1.5) flags.push("Less TOI");
      if (ppP !== null && ppP <= -0.75) flags.push("Less PP");
      if (hb !== null && hb <= -0.15) flags.push("Hits/blocks down");
    } else {
      if (toiP !== null && toiP >= 1.5) flags.push("More TOI");
      if (ppP !== null && ppP >= 0.75) flags.push("More PP");
    }
    const diff = num(r["Diff/GP"]), score = num(r.Score);
    const cells = [
      NAME_FIXES[r.Player] ?? r.Player, r.Team, r.Pos,
      r.Age === "" ? DASH : String(Math.round(Number(r.Age))), r.GP, r.Side, r.Verdict,
      fixed(num(r["FP/GP"]), 2), fixed(num(r["Exp FP/GP"]), 2), signed(diff, 2, false),
      fixed(num(r["3yr adj FP/GP"]), 2), fixed(score, 2), r.Driver,
      signed(toi, 1, true), signed(pp, 2, false), signed(hb, 2, false), flags.length ? flags.join(" · ") : DASH,
    ];
    return { buy, cells, diff, score, toi, pp, hb, toiP, ppP };
  });

  const level = (v, max) => Math.round((v / max) * 10) * 10;
  const toiHit = (i) => i.toiP !== null && (i.buy ? i.toiP <= -1.5 : i.toiP >= 1.5);
  const ppHit = (i) => i.ppP !== null && (i.buy ? i.ppP <= -0.75 : i.ppP >= 0.75);
  const hbHit = (i) => i.buy && i.hb !== null && i.hb <= -0.1;

  // the largest value on each side, which the shading is scaled against
  const scale = {};
  for (const buy of [true, false]) {
    const side = items.filter((i) => i.buy === buy);
    const top = (key, hit = () => true) => Math.max(...side.filter(hit).map((i) => Math.abs(i[key])).filter((v) => !Number.isNaN(v)));
    scale[buy ? "Buy" : "Sell"] = {
      score: top("score"),
      toi: top("toi", toiHit), pp: top("pp", ppHit), hb: buy ? top("hb", hbHit) : 1,
    };
  }

  // Diff/GP is only shaded for the extremes: the 10 lowest rows (blue) and the 10 highest (red)
  const EXTREMES = 10;
  const byDiff = items.map((i, idx) => ({ idx, diff: i.diff })).filter((r) => r.diff !== null).sort((a, b) => a.diff - b.diff);
  const lowest = byDiff.slice(0, EXTREMES), highest = byDiff.slice(-EXTREMES);
  const lowestMax = Math.max(...lowest.map((r) => Math.abs(r.diff))), highestMax = Math.max(...highest.map((r) => Math.abs(r.diff)));
  const diffHeat = new Map([
    ...lowest.map((r) => [r.idx, level(Math.abs(r.diff), lowestMax)]),
    ...highest.map((r) => [r.idx, -level(Math.abs(r.diff), highestMax)]),
  ]);

  // per row: [Diff/GP, Score, TOI chg, PP TOI chg, HIT/BLK chg]; positive = blue, negative = red, 0 = none
  const heat = items.map((i, idx) => {
    const m = scale[i.buy ? "Buy" : "Sell"];
    return [
      diffHeat.get(idx) ?? 0,
      i.score > 0 ? level(i.score, m.score) : 0,
      toiHit(i) ? -level(Math.abs(i.toi), m.toi) : 0,
      ppHit(i) ? -level(Math.abs(i.pp), m.pp) : 0,
      hbHit(i) ? -level(Math.abs(i.hb), m.hb) : 0,
    ];
  });
  return { rows: items.map((i) => i.cells.join("|")), heat };
}

const lines = [
  "// GENERATED by scripts/build-targets-data.mjs from the Hockey-BuyLowSellHigh CSVs. Don't edit by hand;",
  "// run `npm run data:targets` after the model's output changes.",
  "",
];
const { rows, heat } = build();
lines.push("export const rows = [", ...rows.map((r) => `  ${JSON.stringify(r)},`), "];", "");
lines.push("export const heat: number[][] = [", ...heat.map((h) => `  [${h.join(", ")}],`), "];", "");
console.log(`${rows.length} rows`);
fs.writeFileSync(OUT, lines.join("\n"));
console.log("wrote", path.relative(process.cwd(), OUT));
