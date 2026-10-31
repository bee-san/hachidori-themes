// Summarise hover-popup.mjs runs for Bee's stock CSS and the FFXIV Aetheryte CSS,
// with the same distributions and metrics as Hachidori's theme-popup-report.mjs.
// usage: node summarise-bench.mjs <batch-dir> [<batch-dir> ...]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const runs = process.argv.slice(2);
const distribution = values => {
  const sorted = values.toSorted((a, b) => a - b);
  const round = value => Math.round(value * 1000) / 1000;
  return { n: sorted.length, median: round((sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2),
    p95: round(sorted[Math.ceil(sorted.length * .95) - 1]) };
};
const metricDelta = (row, name) => ((row.metricsAfter.find(item => item.name === name)?.value ?? 0)
  - (row.metricsBefore.find(item => item.name === name)?.value ?? 0)) * 1000;
const summary = {};
for (const theme of ["bee", "aetheryte"]) {
  const rows = runs.flatMap(run => JSON.parse(readFileSync(resolve(run, theme, "raw.json"))));
  const warm = rows.filter(row => /^(root-|deep-nesting)/u.test(row.label));
  const cold = rows.filter(row => row.label === "cold");
  summary[theme] = {
    profiles: cold.length,
    coldFirstMs: distribution(cold.map(row => row.firstMs)),
    coldCompleteMs: distribution(cold.map(row => row.completeMs)),
    warmFirstMs: distribution(warm.map(row => row.firstMs)),
    warmCompleteMs: distribution(warm.map(row => row.completeMs)),
    renderMs: distribution(warm.flatMap(row => row.renderer.samples.filter(sample => sample.method === "renderResults").map(sample => sample.ms))),
    scriptMs: distribution(warm.map(row => metricDelta(row, "ScriptDuration"))),
    styleMs: distribution(warm.map(row => metricDelta(row, "RecalcStyleDuration"))),
    layoutMs: distribution(warm.map(row => metricDelta(row, "LayoutDuration"))),
    nodes: distribution(warm.map(row => row.states.at(-1).levels[0].nodes)),
  };
}
console.log(JSON.stringify(summary, null, 2));
