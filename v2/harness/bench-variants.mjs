#!/usr/bin/env node
// Summarise hover-popup runs for any set of variants with theme-popup-report.mjs's
// rules (median of the two middle values, p95 = ceil(0.95 n)th value).
// Usage: bench-variants.mjs OUT.json VARIANT,... BATCH_DIR...
// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [destination, variantList, ...runs] = process.argv.slice(2);
const variants = variantList.split(",");
const distribution = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return { n: sorted.length, median: (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1] };
};
const metricDelta = (row, name) => ((row.metricsAfter.find(item => item.name === name)?.value ?? 0)
  - (row.metricsBefore.find(item => item.name === name)?.value ?? 0)) * 1000;
const summary = {};
for (const variant of variants) {
  const rows = runs.flatMap(run => JSON.parse(readFileSync(resolve(run, variant, "raw.json"), "utf8")));
  const manifests = runs.map(run => JSON.parse(readFileSync(resolve(run, variant, "manifest.json"), "utf8")));
  const warm = rows.filter(row => /^(root-|deep-nesting)/u.test(row.label));
  const cold = rows.filter(row => row.label === "cold");
  summary[variant] = {
    renderers: [...new Set(warm.flatMap(row => row.renderer.samples.map(sample => sample.renderer)))],
    revision: manifests[0].revision, theme: manifests[0].settings.popupTheme, load: manifests.map(item => item.load),
    profiles: cold.length,
    coldFirstMs: distribution(cold.map(row => row.firstMs)), coldCompleteMs: distribution(cold.map(row => row.completeMs)),
    warmFirstMs: distribution(warm.map(row => row.firstMs)), warmCompleteMs: distribution(warm.map(row => row.completeMs)),
    renderMs: distribution(warm.flatMap(row => row.renderer.samples.filter(sample => sample.method === "renderResults").map(sample => sample.ms))),
    styleMs: distribution(warm.map(row => metricDelta(row, "RecalcStyleDuration"))),
    layoutMs: distribution(warm.map(row => metricDelta(row, "LayoutDuration"))),
    coldValues: cold.map(row => Math.round(row.firstMs * 10) / 10),
  };
}
writeFileSync(resolve(destination), JSON.stringify(summary, null, 2));
const fmt = value => (Math.round(value * 100) / 100).toFixed(2);
const metrics = [["Cold first correct frame", "coldFirstMs"], ["Cold complete stable result", "coldCompleteMs"],
  ["Warm first correct frame", "warmFirstMs"], ["Warm complete stable result", "warmCompleteMs"],
  ["Synchronous renderer", "renderMs"], ["Style recalculation during sample", "styleMs"], ["Layout during sample", "layoutMs"]];
console.log(`| Measurement | ${variants.join(" | ")} |`);
console.log(`| --- |${variants.map(() => " ---: |").join("")}`);
for (const [label, key] of metrics) {
  console.log(`| ${label} (n=${summary[variants[0]][key].n}) | ${variants.map(variant => `${fmt(summary[variant][key].median)} / ${fmt(summary[variant][key].p95)}`).join(" | ")} |`);
}
for (const variant of variants) console.log(variant, summary[variant].theme, summary[variant].renderers, "cold", summary[variant].coldValues.join(" "));
