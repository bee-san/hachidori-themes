#!/usr/bin/env node
// Summarise Bee vs FFXIV Dark hover runs with theme-popup-report.mjs's rules
// (median of the two middle values, p95 = ceil(0.95 n)th value).
// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [destination, ...runs] = process.argv.slice(2);
const distribution = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return { n: sorted.length, median: (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1] };
};
const metricDelta = (row, name) => ((row.metricsAfter.find(item => item.name === name)?.value ?? 0)
  - (row.metricsBefore.find(item => item.name === name)?.value ?? 0)) * 1000;
const summary = {};
for (const theme of ["bee", "ffxiv-dark"]) {
  const rows = runs.flatMap(run => JSON.parse(readFileSync(resolve(run, theme, "raw.json"), "utf8")));
  const manifests = runs.map(run => JSON.parse(readFileSync(resolve(run, theme, "manifest.json"), "utf8")));
  const warm = rows.filter(row => /^(root-|deep-nesting)/u.test(row.label));
  const cold = rows.filter(row => row.label === "cold");
  const renderers = new Set(warm.flatMap(row => row.renderer.samples.map(sample => sample.renderer)));
  summary[theme] = {
    renderers: [...renderers], revision: manifests[0].revision, extensionSha256: manifests.map(item => item.extensionSha256),
    load: manifests.map(item => item.load), profiles: cold.length,
    coldFirstMs: distribution(cold.map(row => row.firstMs)), coldCompleteMs: distribution(cold.map(row => row.completeMs)),
    warmFirstMs: distribution(warm.map(row => row.firstMs)), warmCompleteMs: distribution(warm.map(row => row.completeMs)),
    renderMs: distribution(warm.flatMap(row => row.renderer.samples.filter(sample => sample.method === "renderResults").map(sample => sample.ms))),
    nodes: distribution(warm.map(row => row.states.at(-1).levels[0].nodes)),
    scriptMs: distribution(warm.map(row => metricDelta(row, "ScriptDuration"))),
    styleMs: distribution(warm.map(row => metricDelta(row, "RecalcStyleDuration"))),
    layoutMs: distribution(warm.map(row => metricDelta(row, "LayoutDuration"))),
  };
}
writeFileSync(resolve(destination), JSON.stringify(summary, null, 2));
const fmt = value => (Math.round(value * 100) / 100).toFixed(2);
const rowsOut = [["Cold first correct frame", "coldFirstMs"], ["Cold complete stable result", "coldCompleteMs"],
  ["Warm first correct frame", "warmFirstMs"], ["Warm complete stable result", "warmCompleteMs"],
  ["Synchronous renderer", "renderMs"], ["Script during sample", "scriptMs"], ["Style recalculation during sample", "styleMs"],
  ["Layout during sample", "layoutMs"]];
console.log(`| Measurement | Bee median / p95 | FFXIV Dark median / p95 |\n| --- | ---: | ---: |`);
for (const [label, key] of rowsOut) {
  console.log(`| ${label} (n=${summary.bee[key].n}/${summary["ffxiv-dark"][key].n}) | ${fmt(summary.bee[key].median)} / ${fmt(summary.bee[key].p95)} ms | ${fmt(summary["ffxiv-dark"][key].median)} / ${fmt(summary["ffxiv-dark"][key].p95)} ms |`);
}
console.log(`| Popup element count | ${summary.bee.nodes.median} / ${summary.bee.nodes.p95} | ${summary["ffxiv-dark"].nodes.median} / ${summary["ffxiv-dark"].nodes.p95} |`);
console.log("renderers seen:", JSON.stringify({ bee: summary.bee.renderers, ffxiv: summary["ffxiv-dark"].renderers }), "profiles", summary.bee.profiles, summary["ffxiv-dark"].profiles);
