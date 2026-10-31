// Render Hachidori's real popup (Bee's renderer) with a candidate stylesheet on
// light and dark pages, save popup screenshots, the popup DOM and contrast numbers.
// usage: node render.mjs <theme.css> <label> <outdir> [width] [height]
// SPDX-License-Identifier: GPL-3.0-or-later
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const W = process.env.TFB_WORK; // hachidori/ (with test tooling and Chrome), fixtures/, fonts/
const H = resolve(W, "hachidori");
const require = createRequire(resolve(H, "test/tooling/package.json"));
const { answerAnkiConnect } = await import(pathToFileURL(resolve(H, "test/anki-connect-fake.mjs")));
const puppeteer = require("puppeteer-core");
const [css, label, outdir, width = "560", height = "420"] = process.argv.slice(2);
const out = resolve(outdir);
mkdirSync(out, { recursive: true });
const ext = mkdtempSync(resolve(tmpdir(), "tfb-ext-"));
cpSync(resolve(H, "extension"), ext, { recursive: true });
const REPO = process.env.TFB_REPO; // a hachidori-themes checkout
const SLUG = process.env.TFB_SLUG || "bee";
if (process.env.TFB_SLUG) {
  // Register the theme under its own slug, as the Hachidori bundling follow-up would.
  cpSync(resolve(REPO, "themes", SLUG), resolve(ext, "vendor/themes", SLUG), { recursive: true });
  writeFileSync(resolve(ext, "vendor/themes", SLUG, "theme.css"), readFileSync(resolve(css)));
  const patch = (file, from, to) => {
    const text = readFileSync(resolve(ext, file), "utf8");
    if (!text.includes(from)) throw new Error(`${file}: ${from} not found`);
    writeFileSync(resolve(ext, file), text.replace(from, to));
  };
  patch("reader-options.js", 'const POPUP_RENDERER_IDS = ["nazeka", "plain", "jl", "bee"];', `const POPUP_RENDERER_IDS = ["nazeka", "plain", "jl", "bee", "${SLUG}"];`);
  patch("theme-host.js", 'name === "default" || name === "bee"', `name === "default" || name === "bee" || name === "${SLUG}"`);
} else writeFileSync(resolve(ext, "vendor/themes/bee/theme.css"), readFileSync(resolve(css)));
if (process.env.TFB_OLD_JL) cpSync(resolve(REPO, "themes/jl/theme.js"), resolve(ext, "vendor/themes/jl/theme.js"));
const profile = mkdtempSync(resolve(tmpdir(), "tfb-profile-"));
const FIXTURES = process.env.TFB_FIXTURES || resolve(W, "fixtures");
const fixtures = readdirSync(FIXTURES).filter(name => name.endsWith(".zip")).sort().map(name => resolve(FIXTURES, name));
const PAGES = { light: { bg: "#ffffff", fg: "#1a1a1a" }, dark: { bg: "#1e1e1e", fg: "#e6e6e6" } };
const WORDS = (process.env.TFB_WORDS || "taberu,kanji,bouken,no,kesshou").split(",");
const HEADWORDS = { taberu: "食べる", kanji: "漢字", bouken: "冒険者", no: "の", kesshou: "結晶" };
const filler = "エオルゼアの空は今日も高く、遠くの山には雪が残っている。旅人たちは街道を進み、夜になると焚き火を囲んで昔の話をした。";
const page = ({ bg, fg }) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:36px 56px;background:${bg};color:${fg};font:26px/1.9 "Noto Sans CJK JP",sans-serif}
p{margin:0 0 12px}</style>
<p>朝ごはんを<span id="taberu">食べたかった</span>。<span id="kanji">漢字</span>を書く<span id="no">の</span>が好きな<span id="bouken">冒険者</span>の<span id="kesshou">結晶</span>。</p>
<p>${filler.repeat(6)}</p>`;
const server = createServer(async (request, response) => {
  if (request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const reply = await answerAnkiConnect(JSON.parse(body), (action, params) => {
      if (action === "version") return 6;
      if (action === "deckNames") return ["Default"];
      if (action === "modelNames") return ["Basic"];
      if (action === "modelNamesAndIds") return { Basic: 1 };
      if (action === "modelFieldNames") return ["Front", "Back"];
      if (["findNotes", "findCards", "notesInfo"].includes(action)) return [];
      if (action === "canAddNotesWithErrorDetail") return params.notes.map(() => ({ canAdd: true, error: null }));
      throw new Error(`Unexpected Anki action: ${action}`);
    });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(reply));
    return;
  }
  const name = new URL(request.url, "http://x").pathname.slice(1) || "light";
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(page(PAGES[name] ?? PAGES.light));
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const port = server.address().port;
let browser;
const results = { label, css: resolve(css), pages: {} };
try {
  browser = await puppeteer.launch({
    executablePath: resolve(H, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
    headless: true, enableExtensions: true, userDataDir: profile,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--disable-gpu", "--disable-dev-shm-usage",
      "--no-sandbox", "--force-device-scale-factor=1", "--font-render-hinting=none"],
    env: { ...process.env, FONTCONFIG_FILE: resolve(W, "fonts/fonts.conf") },
  });
  const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const settings = await browser.newPage();
  settings.setDefaultTimeout(120000);
  const errors = [];
  settings.on("pageerror", error => errors.push(`settings: ${error.message}`));
  await settings.setViewport({ width: 1400, height: 1000 });
  await settings.goto(`${origin}/settings.html#add-dictionaries`);
  await settings.bringToFront();
  await settings.waitForFunction(async () => {
    const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
    return status.ok && status.ready && !status.loading;
  }, { polling: 100 });
  await (await settings.$("#import-file")).uploadFile(...fixtures);
  await settings.waitForFunction(count => document.getElementById("import-state").textContent.includes(`${count} imported, 0 failed`),
    { polling: 200 }, fixtures.length);
  await settings.evaluate(async (width, height, ankiUrl, slug, extra) => {
    const { dictionaryState } = await chrome.storage.local.get("dictionaryState");
    const id = title => dictionaryState.dictionaries.find(dictionary => dictionary.title === title).id;
    const groups = [
      { id: "tfb-definitions", name: "Definitions", dictionaryIds: ["hachidori-fixture", "theme-bench-senses", "Theme preview"].map(id) },
      { id: "tfb-examples", name: "Examples", dictionaryIds: ["structured-content-deep-fixture", "Theme preview"].map(id) },
    ];
    const grouped = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_state_cas",
      baseRevision: dictionaryState.revision, dictionaries: dictionaryState.dictionaries, groups });
    if (!grouped.ok) throw new Error(grouped.error);
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write",
      baseRevision: options.revision, options: { ...extra, hoverEnabled: true, lookupMode: "hover", popupTheme: slug,
        popupWidthPx: width, popupHeightPx: height, showLookupCounts: false,
        anki: { ...HDReaderOptions.DEFAULT_OPTIONS.anki, url: ankiUrl, model: "Basic",
          fieldTemplates: { Front: { value: "{expression}", overwriteMode: "overwrite" },
            Back: { value: "{glossary}", overwriteMode: "overwrite" } } } } });
    if (!reply.ok) throw new Error(reply.error);
  }, Number(width), Number(height), `http://127.0.0.1:${port}`, SLUG, JSON.parse(process.env.TFB_OPTIONS || "{}"));
  const tab = await browser.newPage();
  tab.setDefaultTimeout(30000);
  tab.on("pageerror", error => errors.push(`tab: ${error.message}`));
  await tab.setViewport({ width: 1280, height: 900 });
  for (const [name] of Object.entries(PAGES)) {
    await tab.goto(`http://127.0.0.1:${port}/${name}`);
    await tab.evaluate(() => document.fonts.ready);
    results.pages[name] = {};
    for (const word of WORDS) {
      await tab.bringToFront();
      await tab.mouse.move(1270, 890);
      await new Promise(done => setTimeout(done, 150));
      const point = await tab.$eval(`#${word}`, node => {
        const range = document.createRange(); range.setStart(node.firstChild, 0); range.setEnd(node.firstChild, 1);
        const box = range.getBoundingClientRect(); return { x: box.x + box.width * .3, y: box.y + box.height / 2 };
      });
      await tab.mouse.move(point.x, point.y);
      await tab.waitForFunction(headword => {
        const popup = document.querySelector("hachidori-host")?.shadowRoot?.querySelector(".gsm-hoshidicts-popup");
        return popup && !popup.hidden && popup.querySelector(".jl-spelling")?.textContent === headword
          && popup.querySelector(".bee-rich-content > *");
      }, { polling: 100 }, HEADWORDS[word]);
      await tab.waitForFunction(() => {
        const buttons = [...document.querySelector("hachidori-host").shadowRoot.querySelectorAll(".gsm-hoshidicts-mine-button")];
        return buttons.length > 0 && buttons.every(button => button.dataset.state === "ready");
      }, { polling: 100, timeout: 10000 }).catch(() => errors.push("anki not ready"));
      await tab.evaluate(async () => {
        await document.fonts.ready;
        const shadow = document.querySelector("hachidori-host").shadowRoot;
        await Promise.all([...shadow.querySelectorAll("img")].map(image => image.complete ? null
          : new Promise(done => { image.onload = image.onerror = done; setTimeout(done, 2000); })));
        await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      });
      await new Promise(done => setTimeout(done, 250));
      const rect = await tab.evaluate(() => {
        const { left, top, width, height } = document.querySelector("hachidori-host").shadowRoot
          .querySelector(".gsm-hoshidicts-popup").getBoundingClientRect();
        return { left, top, width, height };
      });
      const margin = 18;
      const clip = { x: Math.max(0, rect.left - margin), y: Math.max(0, rect.top - margin) };
      clip.width = Math.min(1280, rect.left + rect.width + margin) - clip.x;
      clip.height = Math.min(900, rect.top + rect.height + margin) - clip.y;
      await tab.screenshot({ path: resolve(out, `${label}-${name}-${word}.png`), clip });
      if (process.env.TFB_SHOT === `${name}:${word}`) {
        await tab.screenshot({ path: resolve(out, `${label}-screenshot.png`), clip: { x: rect.left, y: rect.top, width: rect.width, height: rect.height } });
      }
      results.renderer = await tab.evaluate(() => document.querySelector("hachidori-host").dataset.hoshidictsRenderer);
      (results.layout ??= {})[`${name}/${word}`] = await tab.evaluate(() => {
        const popup = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup");
        const scroll = popup.querySelector(".jl-scroll");
        const entries = [...popup.querySelectorAll(".jl-entry:not([hidden])")];
        const header = popup.querySelector(".jl-header").getBoundingClientRect().height;
        const tops = entries.map(entry => entry.querySelector(".jl-top").getBoundingClientRect().height);
        const first = entries[0]?.getBoundingClientRect(), last = entries.at(-1)?.getBoundingClientRect();
        return { contentHeight: Math.round((header + (last ? last.bottom - first.top : 0)) * 10) / 10, entries: entries.length,
          scrollHeight: scroll.scrollHeight,
          headerRowHeight: Math.round(header * 10) / 10, entryHeaderHeights: tops.map(value => Math.round(value * 10) / 10) };
      });
      if (name === "light" && word === WORDS[0]) {
        writeFileSync(resolve(out, `${label}-dom.html`), await tab.evaluate(() =>
          document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup").outerHTML));
      }
      if (process.env.TFB_PIXEL) {
        const boxes = await tab.evaluate(() => {
          const shadow = document.querySelector("hachidori-host").shadowRoot;
          const popup = shadow.querySelector(".gsm-hoshidicts-popup");
          const found = [];
          for (const node of popup.querySelectorAll("*")) {
            const own = [...node.childNodes].filter(child => child.nodeType === 3 && child.textContent.trim());
            if (!own.length || !node.getClientRects().length) continue;
            const style = getComputedStyle(node);
            if (style.visibility === "hidden" || parseFloat(style.opacity) === 0 || style.fontSize === "0px") continue;
            const clip = (node.closest(".jl-scroll") || popup).getBoundingClientRect();
            for (const text of own) {
              const range = document.createRange(); range.selectNodeContents(text);
              for (const full of range.getClientRects()) {
                const left = Math.max(full.left, clip.left), top = Math.max(full.top, clip.top);
                const rect = { left, top, width: Math.min(full.right, clip.right) - left, height: Math.min(full.bottom, clip.bottom) - top };
                if (rect.width > 2 && rect.height > 2) found.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height,
                  color: style.color, key: `${node.tagName.toLowerCase()}.${String(node.className || "").trim().split(/\s+/).join(".")}` });
              }
            }
          }
          const hide = document.createElement("style"); hide.id = "tfb-hide";
          hide.textContent = "*, *::before, *::after, ::marker { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; border-color: transparent !important; outline-color: transparent !important; }";
          shadow.append(hide);
          return found;
        });
        await tab.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const png = await tab.screenshot({ encoding: "base64" });
        if (process.env.TFB_SAVE_HIDDEN) {
          writeFileSync(resolve(out, `${label}-${name}-${word}-hidden.png`), Buffer.from(png, "base64"));
          writeFileSync(resolve(out, `${label}-${name}-${word}-boxes.json`), JSON.stringify(boxes));
        }
        await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.getElementById("tfb-hide")?.remove());
        const pixelRows = await tab.evaluate(async ({ png, boxes }) => {
          const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(bitmap, 0, 0);
          const probe = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
          const rgb = value => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = value; probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3); };
          const lum = color => color.reduce((sum, value, index) => {
            const channel = value / 255;
            return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
          }, 0);
          const worst = new Map();
          for (const box of boxes) {
            const text = lum(rgb(box.color));
            // The glyph band: the font's content box less 15% above and below.
            const inset = box.h * .15;
            const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y + inset));
            const w = Math.min(bitmap.width - x0, Math.ceil(box.w)), h = Math.min(bitmap.height - y0, Math.ceil(box.h - 2 * inset));
            if (w <= 0 || h <= 0) continue;
            const data = context.getImageData(x0, y0, w, h).data;
            const ratios = [];
            for (let index = 0; index < data.length; index += 4) {
              const back = lum([data[index], data[index + 1], data[index + 2]]);
              const [low, high] = [text, back].sort((a, b) => a - b);
              ratios.push((high + .05) / (low + .05));
            }
            ratios.sort((a, b) => a - b);
            const p5 = ratios[Math.floor(ratios.length * .05)];
            const previous = worst.get(box.key);
            if (!previous || p5 < previous.p5) worst.set(box.key, { p5: Math.round(p5 * 100) / 100, min: Math.round(ratios[0] * 100) / 100 });
          }
          return [...worst.entries()].map(([key, value]) => ({ key, ...value })).sort((a, b) => a.p5 - b.p5);
        }, { png, boxes });
        results.pixel ??= {};
        (results.pixel[name] ??= {})[word] = { lowest: pixelRows.slice(0, 6), below: pixelRows.filter(row => row.p5 < 4.5) };
      }
      results.pages[name][word] = await tab.evaluate(pageBackground => {
        const popup = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup");
        const canvas = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
        const rgba = value => {
          canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1);
          return [...canvas.getImageData(0, 0, 1, 1).data];
        };
        const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] / 255 + back[index] * (1 - front[3] / 255));
        const luminance = color => color.reduce((sum, value, index) => {
          const channel = value / 255;
          return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
        }, 0);
        const ratio = (front, back) => {
          const values = [luminance(front), luminance(back)].sort((a, b) => a - b);
          return (values[1] + .05) / (values[0] + .05);
        };
        const background = (node, page) => {
          const ancestors = [];
          for (let current = node; current; current = current.parentElement) ancestors.unshift(current);
          return ancestors.reduce((color, ancestor) => blend(rgba(getComputedStyle(ancestor).backgroundColor), color), page);
        };
        const pages = [rgba(pageBackground).slice(0, 3), [255, 255, 255], [0, 0, 0]];
        const worst = new Map();
        const record = (key, value, minimum) => {
          const previous = worst.get(key);
          if (!previous || value < previous.ratio) worst.set(key, { ratio: Math.round(value * 100) / 100, minimum });
        };
        const describe = node => `${node.tagName.toLowerCase()}${node.className && typeof node.className === "string" ? `.${node.className.trim().split(/\s+/).join(".")}` : ""}`;
        for (const node of popup.querySelectorAll("*")) {
          if (!node.getClientRects().length || getComputedStyle(node).visibility === "hidden") continue;
          const ownText = [...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim());
          if (!ownText) continue;
          const style = getComputedStyle(node);
          if (parseFloat(style.opacity) === 0 || style.fontSize === "0px") continue;
          const color = rgba(style.color);
          const ratios = pages.map(page => { const back = background(node, page); return ratio(blend(color, back), back); });
          record(`text ${describe(node)} [actual page]`, ratios[0], 4.5);
          record(`text ${describe(node)} [white/black]`, Math.min(ratios[1], ratios[2]), 4.5);
        }
        for (const node of popup.querySelectorAll(".jl-tab, .gsm-hoshidicts-text-action-button, input, textarea")) {
          if (!node.getClientRects().length) continue;
          const style = getComputedStyle(node);
          if (parseFloat(style.borderTopWidth) === 0) continue;
          const color = rgba(style.borderTopColor);
          const ratios = pages.map(page => { const back = background(node.parentElement, page); return ratio(blend(color, back), back); });
          record(`border ${describe(node)} [actual page]`, ratios[0], 3);
        }
        for (const node of popup.querySelectorAll(".gsm-hoshidicts-audio-button, .gsm-hoshidicts-mine-button, .gsm-hoshidicts-note-button")) {
          if (!node.getClientRects().length) continue;
          const color = rgba(getComputedStyle(node).color);
          const ratios = pages.map(page => { const back = background(node, page); return ratio(blend(color, back), back); });
          record(`icon ${describe(node)} [actual page]`, ratios[0], 3);
          record(`icon ${describe(node)} [white/black]`, Math.min(ratios[1], ratios[2]), 3);
        }
        const rows = [...worst.entries()].map(([key, value]) => ({ key, ...value })).sort((a, b) => a.ratio - b.ratio);
        return { failures: rows.filter(row => row.ratio < row.minimum), lowest: rows.slice(0, 8),
          size: (() => { const r = popup.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() };
      }, PAGES[name].bg);
    }
  }
  results.errors = errors;
  writeFileSync(resolve(out, `${label}-contrast.json`), JSON.stringify(results, null, 2));
  const failures = Object.entries(results.pages).flatMap(([page, words]) => Object.entries(words)
    .flatMap(([word, value]) => value.failures.map(failure => `${page}/${word}: ${failure.key} ${failure.ratio} < ${failure.minimum}`)));
  if (results.pixel) {
    const below = Object.entries(results.pixel).flatMap(([page, words]) => Object.entries(words)
      .flatMap(([word, value]) => value.below.map(row => `${page}/${word}: ${row.key} p5 ${row.p5} min ${row.min}`)));
    const lowest = Object.values(results.pixel).flatMap(words => Object.values(words).flatMap(value => value.lowest)).sort((a, b) => a.p5 - b.p5)[0];
    console.log(`${label} pixel check: ${below.length} text boxes with 5th-percentile contrast below 4.5${below.length ? `\n  ${below.slice(0, 30).join("\n  ")}` : ""}; lowest ${JSON.stringify(lowest)}`);
  }
  console.log(`${label}: ${failures.length ? `${failures.length} contrast failures\n  ${[...new Set(failures)].slice(0, 40).join("\n  ")}` : "no contrast failures"}${errors.length ? `\nerrors: ${errors.join("; ")}` : ""}`);
} finally {
  await browser?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
  rmSync(ext, { recursive: true, force: true });
}
