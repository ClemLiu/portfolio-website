/**
 * rescore.js: the buy-low / sell-high model's scoring maths, for the browser.
 *
 * public/players.json holds base values only (season totals, expected goals/assists/PPP, 3-year
 * totals weighted 5:4:3 toward recent seasons, ice time, trends, scoring-independent cautions) and the model's league-relative rules.
 * This module applies a set of fantasy-point values (Yahoo's by default, or the visitor's from
 * FP Settings) and returns everything the table needs: FP/GP, expected FP/GP, FP/GP vs exp and vs 3Y,
 * buy/sell scores, who is listed, verdict, Momentum, cautions and the four row highlights.
 *
 * It mirrors build_targets.py exactly; tests/test_rescore.mjs checks the two agree (run daily by the GitHub Action).
 *
 * Usage:
 *   import { rescore } from './rescore.js';
 *   const data = await (await fetch('players.json')).json();
 *   const { rows, cutoffs } = rescore(data);                  // Yahoo default
 *   const custom = rescore(data, { g: 3, a: 2, ppp: 1, sog: 0.5, hit: 0.5, blk: 0.5, pim: 0 });
 *
 * rows = every listed player (buys and sells), sorted from strongest buy to strongest sell.
 * Third argument options:
 *   { days: 14 }   the last 14 days instead of the season (any `days` in data.ranges: 14, 30).
 *                  Same model on each player's games in that range; players with fewer than the
 *                  range's minGp games in it are left out.
 *   { all: true }  also return every skater with their computed values.
 */

const STAT_KEYS = ['g', 'a', 'pim', 'ppp', 'sog', 'hit', 'blk'];   // same order as the Python sums (bit-identical floats)
const LUCK = ['g', 'a', 'ppp'];                 // replaced by expected values in Exp FP/GP

/** Weights from FP Settings → complete weights object (missing stats score 0). */
export function normaliseWeights(weights) {
  const w = {};
  for (const k of STAT_KEYS) w[k] = Number(weights?.[k]) || 0;
  return w;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n === 0 ? NaN : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const sampleSd = (xs) => {                       // n - 1, like pandas .std()
  const n = xs.length; if (n < 2) return NaN;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
};
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
// Like Python's f'{x:.{d}f}': exact halves round to the even digit (4.625 -> "4.62"); toFixed would round up.
// toFixed already rounds the exact binary value correctly; only true ties (exactly ...5000…) differ.
const fixed = (x, d) => {
  if (!isNum(x)) return 'nan';
  const exact = Math.abs(x).toFixed(Math.min(100, d + 60));          // exact decimal expansion
  const rest = exact.slice(exact.indexOf('.') + 1 + d);
  if (!/^50*$/.test(rest)) return x.toFixed(d);
  const kept = exact.slice(0, exact.indexOf('.') + 1 + d).replace(/\.$/, '');
  const lastDigit = Number(kept.replace('.', '').slice(-1));
  const down = Number(kept);                                         // truncated value, d decimals
  const r = lastDigit % 2 === 0 ? down : down + 10 ** -d;
  return (x < 0 ? -r : r).toFixed(d);
};
const signed = (x, d = 1) => (isNum(x) ? (x < 0 || Object.is(x, -0) ? '-' : '+') + fixed(Math.abs(x), d) : '');

/** Per-player values that depend on the scoring. */
function score(p, w, model) {
  const s = p.season, gp = p.gp, ty = p.threeYear;
  const fp = STAT_KEYS.reduce((t, k) => t + w[k] * s[k], 0) / gp;
  const expFp = STAT_KEYS.reduce((t, k) => t + w[k] * (LUCK.includes(k) ? p.exp[k] : s[k]), 0) / gp;
  const luck = expFp - fp;                                   // + = scoring below his play (buy)
  const small = !ty;                                         // under minHistGp games of history
  const fp3 = small ? null : STAT_KEYS.reduce((t, k) => t + w[k] * ty[k], 0) / ty.gp;
  const vs3y = small ? null : fp - fp3;
  const { toi, ppToi } = model.role;
  const role = small ? 'New (<60 GP history)' : p.toiChg <= -toi ? 'Less TOI' : p.ppToiChg <= -ppToi ? 'Less PP' : 'Intact';
  const roleUp = small ? 'New (<60 GP history)' : p.toiChg >= toi ? 'More TOI' : p.ppToiChg >= ppToi ? 'More PP' : 'Steady';
  const targetScore = luck + (role === 'Intact' ? 0.5 * Math.max(0, fp3 - fp) : 0);
  const sellScore = -luck + (roleUp === 'Steady' ? 0.5 * Math.max(0, fp - fp3) : 0);
  const hitBlkChg = small ? null
    : (s.hit / gp - ty.hit / ty.gp) * w.hit + (s.blk / gp - ty.blk / ty.gp) * w.blk;
  return { fp, expFp, luck, fp3, vs3y, role, roleUp, targetScore, sellScore, hitBlkChg };
}

/** League-relative cutoffs for this scoring (model.relative × league median / luck-gap spread). */
function cutoffsFor(players, scored, model) {
  const R = model.relative;
  const pool = players.map((p, i) => [p, scored[i]]).filter(([p]) => p.gp >= model.minGp);
  const med = median(pool.map(([, v]) => v.fp));
  const floor = R.floor * med;
  const spread = sampleSd(pool.filter(([, v]) => v.expFp >= floor).map(([, v]) => v.luck));
  return { median: med, spread, floor, cold: R.cold * spread, very: R.very * spread,
           big: R.big * spread, small: R.small * spread, hitblk: R.hitblk * med };
}

function cautions(p, v, side, model, cut) {
  const order = side === 'Buy' ? model.buyFlags : model.sellFlags;
  return order.filter((k) => {
    if (k === 'Hits/blocks down') return isNum(v.hitBlkChg) && v.hitBlkChg <= -cut.hitblk;
    if (k === 'Hits/blocks up') return isNum(v.hitBlkChg) && v.hitBlkChg >= cut.hitblk;
    return p.flags.includes(k);
  });
}

const CATS = [['Goals', 'g'], ['Assists', 'a'], ['PP points', 'ppp']];
function driver(p, w, side) {                     // biggest shortfall (buy) or surplus (sell), in FP
  let best = null, bestV = -Infinity;
  for (const [name, k] of CATS) {
    const gap = (side === 'Buy' ? p.exp[k] - p.season[k] : p.season[k] - p.exp[k]) * w[k];
    if (gap > bestV) { bestV = gap; best = name; }  // first max wins, like pandas idxmax
  }
  return best;
}

function highlights(p, v, w, side, cautionList) {
  const sign = side === 'Sell' ? 1 : -1;
  const cats = [['Goals', p.season.g, p.exp.g, w.g], ['Assists', p.season.a, p.exp.a, w.a],
                ['PPP', p.season.ppp, p.exp.ppp, w.ppp]];
  cats.sort((x, y) => sign * (y[1] - y[2]) * y[3] - sign * (x[1] - x[2]) * x[3]);   // stable, descending
  const hl = cats.slice(0, 2).map(([n, a, e]) => ({
    label: n, value: fixed(a, 0), delta: signed(a - e), caption: `exp ${fixed(e, 1)}`,
    refLabel: `Exp ${n === 'PPP' ? n : n.toLowerCase()}`, refValue: fixed(e, 1) }));
  hl.push(v.fp3 === null
    ? { label: 'FP/GP', value: fixed(v.fp, 2), delta: '', caption: 'no 3-year history', refLabel: '3Y FP/GP', refValue: '—' }
    : { label: 'FP/GP', value: fixed(v.fp, 2), delta: signed(v.vs3y, 2), caption: `3Y ${fixed(v.fp3, 2)}`,
        refLabel: '3Y FP/GP', refValue: fixed(v.fp3, 2) });
  const first = cautionList[0] || '';
  const shPct3 = p.shPct3y, sog3 = p.sog60_3y;
  let h;
  if (first === 'Less TOI' || first === 'More TOI') {
    h = { label: 'TOI / GP', value: fixed(p.toi, 1), delta: signed(p.toiChg), caption: 'min vs 3Y avg',
          refLabel: '3Y TOI / GP', refValue: fixed(p.toi - p.toiChg, 1) };
  } else if (first === 'Less PP' || first === 'More PP') {
    h = { label: 'PP TOI / GP', value: fixed(p.ppToi, 2), delta: signed(p.ppToiChg, 2), caption: 'min vs 3Y avg',
          refLabel: '3Y PP TOI / GP', refValue: fixed(p.ppToi - p.ppToiChg, 2) };
  } else if (first.startsWith('Hits/blocks')) {
    const hb = (p.season.hit / p.gp) * w.hit + (p.season.blk / p.gp) * w.blk;
    h = { label: 'Hits + blocks FP/GP', value: fixed(hb, 2), delta: signed(v.hitBlkChg, 2), caption: 'FP/GP vs 3Y avg',
          refLabel: '3Y avg', refValue: fixed(hb - v.hitBlkChg, 2) };
  } else if (first.startsWith('Age')) {
    h = { label: 'Age', value: fixed(p.age, 0), delta: '', caption: side === 'Buy' ? 'past his peak' : 'still improving',
          refLabel: 'Age curve', refValue: side === 'Buy' ? 'Declining' : 'Improving' };
  } else if (first.startsWith('Finishing')) {
    const tr = p.gxgTrend.split(' → ');
    h = { label: 'G/xG last season', value: tr[tr.length - 1], delta: '', caption: `${p.gxgTrend} (3 seasons)`,
          refLabel: 'G/xG 3 seasons ago', refValue: tr[0] };
  } else if (first.startsWith('Assist share')) {
    const tr = p.assistShareTrend.split(' → ');
    h = { label: 'Assist share last season', value: tr[tr.length - 1], delta: '', caption: `${p.assistShareTrend} (3 seasons)`,
          refLabel: 'Assist share 3 seasons ago', refValue: tr[0] };
  } else if (first === 'Fewer shots' || first === 'More shots') {
    h = { label: 'Shots / 60', value: fixed(p.sog60, 1), delta: signed(p.sog60 - sog3), caption: `3Y ${fixed(sog3, 1)}`,
          refLabel: '3Y shots / 60', refValue: fixed(sog3, 1) };
  } else {
    h = { label: 'Shooting %', value: `${fixed(p.shPct, 1)}%`, delta: isNum(shPct3) ? signed(p.shPct - shPct3) : '',
          caption: isNum(shPct3) ? `3Y ${fixed(shPct3, 1)}%` : 'no 3-year history',
          refLabel: '3Y shooting %', refValue: isNum(shPct3) ? `${fixed(shPct3, 1)}%` : '—' };
  }
  hl.push(h);
  for (const x of hl) x.trend = x.delta.startsWith('+') ? 'Up' : x.delta.startsWith('-') ? 'Down' : 'Neutral';
  return hl;
}

/**
 * Score every skater under `weights` and build the combined buy/sell list.
 * @returns {{ weights, cutoffs, rows, players? }}
 */
export function rescore(data, weights = data.defaultScoring.weights, { all = false, days = null } = {}) {
  const w = normaliseWeights(weights);
  let model = data.model;
  let players = data.players;
  if (days) {                                      // date range: the last `days` days, same model
    const range = (data.ranges || []).find((r) => r.days === days);
    if (!range) throw new Error(`No ${days}-day range in this data (has: ${(data.ranges || []).map((r) => r.days)})`);
    players = players.filter((p) => p.ranges?.[days]).map((p) => ({ ...p, ...p.ranges[days] }));
    model = { ...model, minGp: range.minGp };
  }
  const scored = players.map((p) => score(p, w, model));
  const cut = cutoffsFor(players, scored, model);

  const rows = [];
  players.forEach((p, i) => {
    const v = scored[i];
    if (p.gp < model.minGp) return;
    const listings = [];
    if (v.expFp >= cut.floor && v.targetScore >= cut.cold) listings.push(['Buy', v.targetScore]);
    if (v.fp >= cut.floor && v.sellScore >= cut.cold) listings.push(['Sell', v.sellScore]);
    for (const [side, sc] of listings) {
      const caut = cautions(p, v, side, model, cut);
      const gap = side === 'Buy' ? v.luck : -v.luck;
      const r = side === 'Buy' ? v.role : v.roleUp;
      const reduced = side === 'Buy' ? ['Less TOI', 'Less PP'] : ['More TOI', 'More PP'];
      const verdict = reduced.includes(r) ? `Caution: role ${side === 'Buy' ? 'reduced' : 'increased'}`
        : r.startsWith('New') ? `${side}: limited history`
        : gap >= cut.big ? `Strong ${side.toLowerCase()}`
        : gap >= cut.small ? side
        : side === 'Buy' ? 'Below his norm' : 'Above his norm';
      const momentum = sc >= cut.very ? (caut.length ? (side === 'Buy' ? 'Frozen' : 'On fire') : (side === 'Buy' ? 'Very cold' : 'Very hot'))
        : sc >= cut.cold ? (side === 'Buy' ? 'Cold' : 'Hot') : 'Neutral';
      rows.push({
        id: p.id, name: p.name, team: p.team, pos: p.pos, age: p.age, gp: p.gp, side, verdict, momentum,
        cautions: caut, driver: driver(p, w, side), score: sc,
        fpGp: v.fp, expFpGp: v.expFp, fpVsExp: v.fp - v.expFp, fpVs3y: v.vs3y, fp3y: v.fp3,
        toiVs3y: p.toiChg, ppToiVs3y: p.ppToiChg,
        highlights: highlights(p, v, w, side, caut),
      });
    }
  });
  rows.sort((a, b) => a.fpVsExp - b.fpVsExp);   // strongest buy first, strongest sell last

  const out = { weights: w, cutoffs: cut, rows };
  if (all) out.players = players.map((p, i) => ({ ...p, ...scored[i] }));
  return out;
}

export const YAHOO_DEFAULT = Object.freeze({ g: 6, a: 4, ppp: 2, sog: 0.9, hit: 0, blk: 1, pim: 0 });
