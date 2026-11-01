// node ornament-preview.mjs <hachidori checkout> <theme.css> <out.png>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const [hachidori, cssPath, out] = process.argv.slice(2);
const require = createRequire(resolve(hachidori, "test/tooling/package.json"));
const puppeteer = require("puppeteer-core");
const css = readFileSync(cssPath, "utf8");
const uri = name => css.match(new RegExp(`/\\* svg:${name} \\*/ (url\\("data:image/svg\\+xml,[^"]*"\\))`))[1];
const html = `<!doctype html><style>body{margin:0;background:#0e1829;display:grid;gap:16px;padding:16px;grid-template-columns:auto auto}
.crest{width:880px;height:192px;background:${uri("crest")} center/contain no-repeat;border-top:8px solid #b8913f;box-sizing:border-box;grid-column:1/3}
.c{width:180px;height:180px;background:${uri("corner-tl")} center/contain no-repeat}
.p{width:400px;height:100px;border-style:solid;border-width:16px 52px 16px 28px;border-image:${uri("plaque")} 4 13 4 7 fill/16px 52px 16px 28px stretch}
.g{width:52px;height:64px;background:${uri("gem")} center/contain no-repeat}
.d{width:120px;height:120px;background:${uri("diamond")} center/contain no-repeat}</style>
<div class="crest"></div><div style="display:flex;gap:16px"><div class="c"></div><div class="d"></div><div class="g"></div></div><div class="p"></div>`;
const browser = await puppeteer.launch({ executablePath: resolve(hachidori, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
  headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 940, height: 460 });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
