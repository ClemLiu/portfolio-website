// A safety check before new Hot & Cold data is published: the data file must be readable and the scoring module
// must produce a list from it, for the season and for every time range. Exits with an error otherwise.
import { readFileSync } from "node:fs";
import { rescore } from "../src/design-system/buylow/rescore.js";

const fail = (message) => {
  console.error(`Data check failed: ${message}`);
  process.exit(1);
};

const data = JSON.parse(readFileSync(new URL("../public/data/players.json", import.meta.url), "utf8"));
if (!data.generatedAt || !data.seasonLabel) fail("the update date or season is missing");
if (!Array.isArray(data.players) || data.players.length < 300) fail(`only ${data.players?.length ?? 0} players`);

// the page reads data.ranges: a file in another shape would leave its Time range filter empty
if (!Array.isArray(data.ranges)) fail("the list of date ranges is missing");

for (const days of [null, ...data.ranges.map((r) => r.days)]) {
  const { rows } = rescore(data, data.defaultScoring.weights, { days });
  const name = days ? `Last ${days} days` : "Season";
  if (rows.length === 0) fail(`${name} lists nobody`);
  if (rows.some((r) => !Number.isFinite(r.fpVsExp) || !Number.isFinite(r.sogGp))) fail(`${name} has players with missing numbers`);
  console.log(`${name}: ${rows.length} players listed`);
}
console.log(`OK: ${data.seasonLabel}, updated ${data.generatedAt}, games through ${data.gamesThrough ?? "unknown"}`);
