// SPDX-License-Identifier: GPL-3.0-or-later
// Writes the extra sample archives used for theme renders (all synthetic fixture data from hachidori's test/make-fixture.mjs).
import { writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
const root = process.argv[2], out = process.argv[3];
const fx = await import(resolve(root, "test/make-fixture.mjs"));
const deep = fx.structuredContentDeepFixture();
writeFileSync(resolve(out, `${deep.title}.zip`), deep.archive());
const tabs = fx.dictionaryTabsFixture();
for (const { title, archive } of tabs.dictionaries) writeFileSync(resolve(out, `${title}.zip`), archive);
const avg = fx.frequencyAverageFixture();
writeFileSync(resolve(out, "average-terms.zip"), avg.terms);
for (const { title, archive } of avg.dictionaries) writeFileSync(resolve(out, `${title.replaceAll(" ", "-")}.zip`), archive);
const furi = fx.kanjiReadingFuriganaFixture();
writeFileSync(resolve(out, `${furi.title}.zip`), furi.archive);
copyFileSync(resolve(root, "test/fixtures/hachidori-fixture.zip"), resolve(out, "hachidori-fixture.zip"));
console.log(JSON.stringify({ deep: deep.query, tabs: tabs.query, avg: avg.query, furi: [furi.query, furi.compound] }));
