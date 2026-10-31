#!/usr/bin/env node
// Theme direction harness: real Hachidori popups (production renderer, real
// hover lookups and the Design preview's sample) on light and dark pages.
// Writes clipped screenshots and a WCAG text-contrast report per render.
// SPDX-License-Identifier: GPL-3.0-or-later
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PAGES, page } from "./pages.mjs";

const WORK = resolve(import.meta.dirname, "..");
const HACHI = resolve(WORK, "hachidori");
const { answerAnkiConnect } = await import(resolve(HACHI, "test/anki-connect-fake.mjs"));
const require = createRequire(resolve(HACHI, "test/tooling/package.json"));
const puppeteer = require("puppeteer-core");

const args = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...rest] = arg.replace(/^--/, "").split("="); return [key, rest.join("=")]; }));
const slugs = (args.slugs || "ffxn-hairline,ffxn-menu,ffxn-tooltip,ffxn-parchment").split(",");
const pageNames = (args.pages || "light,dark").split(",");
const words = args.words === "" ? [] : (args.words || "taberu,toru").split(",");
const out = resolve(args.out || resolve(WORK, "out", "run"));
const withPreview = args.preview !== "0";
const withKanji = args.kanji === "1";
const withTops = args.tops === "1";
const withJapaneseTab = args.jtab === "1";
const width = Number(args.width || 560), height = Number(args.height || 420);
const opacity = Number(args.opacity || 85);
const margin = Number(args.margin || 18);
const extraOptions = args.options ? JSON.parse(args.options) : {};
const dictDir = resolve(WORK, "harness", "dicts");
mkdirSync(out, { recursive: true });

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
  const name = request.url.replace(/^\//u, "").replace(/\.html$/u, "");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(page(PAGES[name] ? name : "light"));
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const port = server.address().port;

// In-page WCAG text contrast: each visible element with its own text, against
// its ancestors' backgrounds composited over a white and a black page (and
// every stop of any gradient background on the way, the worst case).
function contrastProbe(rootSelector) {
  const root = rootSelector === "preview"
    ? document.getElementById("preview-host").shadowRoot
    : document.querySelector("hachidori-host").shadowRoot;
  const popup = root.querySelector(".gsm-hoshidicts-popup");
  const canvas = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
  const rgba = value => {
    canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = "#000"; canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1);
    return [...canvas.getImageData(0, 0, 1, 1).data];
  };
  const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] / 255 + back[index] * (1 - front[3] / 255));
  const luminance = colour => colour.reduce((sum, value, index) => {
    const channel = value / 255;
    return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const ratio = (a, b) => { const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y); return (high + 0.05) / (low + 0.05); };
  const stops = value => (value.match(/(?:rgba?|color)\([^)]*\)|#[0-9a-f]{3,8}\b/giu) ?? []);
  const backgrounds = (node, pageColour) => {
    const chain = [];
    for (let current = node; current; current = current.parentElement) chain.unshift(current);
    let candidates = [pageColour];
    for (const element of chain) {
      const style = getComputedStyle(element);
      candidates = candidates.map(colour => blend(rgba(style.backgroundColor), colour));
      if (style.backgroundImage.includes("gradient")) {
        const layer = stops(style.backgroundImage).map(rgba);
        if (layer.length) candidates = candidates.flatMap(colour => layer.map(stop => blend(stop, colour)));
      }
    }
    return candidates;
  };
  const results = [];
  for (const element of popup.querySelectorAll("*")) {
    const own = [...element.childNodes].filter(child => child.nodeType === 3).map(child => child.textContent).join("").trim();
    if (!own || !element.getClientRects().length) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    if (element.closest("[hidden], details:not([open]) > :not(summary)")) continue;
    const colour = rgba(style.color);
    const size = parseFloat(style.fontSize), weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const per = {};
    for (const [name, pageColour] of [["white", [255, 255, 255]], ["black", [0, 0, 0]]]) {
      per[name] = Math.min(...backgrounds(element, pageColour).map(back => ratio(blend(colour, back), back)));
    }
    results.push({ element: `${element.tagName.toLowerCase()}.${element.className || ""}`.slice(0, 80), text: own.slice(0, 24),
      color: style.color, size, minimum: large ? 3 : 4.5, white: Number(per.white.toFixed(2)), black: Number(per.black.toFixed(2)) });
  }
  // Non-text contrast: borders of interactive controls against what is behind them (3:1).
  const controls = ".jl-tab, .gsm-hoshidicts-kanji-back, .gsm-hoshidicts-note-actions button, .gsm-hoshidicts-note-form input, "
    + ".gsm-hoshidicts-note-form textarea, .gsm-hoshidicts-lookup-failure button, .gsm-hoshidicts-audio-menu button";
  for (const element of popup.querySelectorAll(controls)) {
    if (!element.getClientRects().length) continue;
    const style = getComputedStyle(element);
    if (!parseFloat(style.borderTopWidth) || style.borderTopStyle === "none") continue;
    const colour = rgba(style.borderTopColor), per = {};
    for (const [name, pageColour] of [["white", [255, 255, 255]], ["black", [0, 0, 0]]]) {
      per[name] = Math.min(...backgrounds(element.parentElement, pageColour).map(back => ratio(blend(colour, back), back)));
    }
    results.push({ kind: "border", element: `${element.tagName.toLowerCase()}.${element.className || ""}`.slice(0, 80),
      text: (element.textContent || "").trim().slice(0, 24), color: style.borderTopColor, minimum: 3,
      white: Number(per.white.toFixed(2)), black: Number(per.black.toFixed(2)) });
  }
  return results;
}

const profile = mkdtempSync(resolve(tmpdir(), "ffxn-theme-"));
let browser;
const report = { chrome: null, width, height, opacity, renders: [] };
try {
  const extension = resolve(HACHI, "extension");
  browser = await puppeteer.launch({
    executablePath: resolve(HACHI, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
    headless: true, enableExtensions: true, userDataDir: profile,
    // An optional private fontconfig file pins the fonts used for the evidence renders.
    env: { ...process.env, ...(existsSync(resolve(WORK, "fonts.conf")) ? { FONTCONFIG_FILE: resolve(WORK, "fonts.conf") } : {}) },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--disable-gpu",
      "--disable-dev-shm-usage", "--no-sandbox", "--force-device-scale-factor=1", "--lang=en-US"],
  });
  report.chrome = await browser.version();
  const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const errors = [];
  const settings = await browser.newPage();
  settings.setDefaultTimeout(180000);
  settings.on("pageerror", error => errors.push(`settings: ${error.message}`));
  await settings.setViewport({ width: 1400, height: 1000 });
  await settings.goto(`${origin}/settings.html#add-dictionaries`);
  await settings.waitForFunction(async () => {
    const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
    return status.ok && status.ready && !status.loading;
  }, { polling: 200 });
  const only = args.dicts ? args.dicts.split(",") : null;
  const files = readdirSync(dictDir).filter(file => file.endsWith(".zip") && (!only || only.includes(file))).sort().map(file => resolve(dictDir, file));
  await (await settings.$("#import-file")).uploadFile(...files);
  await settings.waitForFunction(count => document.getElementById("import-state").textContent.includes(`${count} imported, 0 failed`),
    { polling: 250 }, files.length);
  console.log(`imported ${files.length} dictionaries`);
  await settings.evaluate(async () => {
    const { dictionaryState } = await chrome.storage.local.get("dictionaryState");
    const order = ["JMdict (sample)", "国語 (sample)", "hachidori-fixture", "theme-bench-senses", "KANJIDIC (sample)",
      "Ranks (sample)", "Corpus (sample)", "Pitch (sample)"];
    const rank = entry => { const index = order.indexOf(entry.title); return index < 0 ? order.length : index; };
    const dictionaries = [...dictionaryState.dictionaries].sort((a, b) => rank(a) - rank(b));
    const id = title => dictionaries.find(entry => entry.title === title)?.id;
    const groups = [
      { id: "ffxn-words", name: "Words", dictionaryIds: ["JMdict (sample)", "hachidori-fixture", "theme-bench-senses"].map(id).filter(Boolean) },
      { id: "ffxn-japanese", name: "Japanese", dictionaryIds: ["国語 (sample)"].map(id).filter(Boolean) },
    ];
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_state_cas",
      baseRevision: dictionaryState.revision, dictionaries, groups });
    if (!reply.ok) throw new Error(reply.error);
  });
  const writeOptions = patch => settings.evaluate(async patch => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write",
      baseRevision: options.revision, options: patch });
    if (!reply.ok) throw new Error(reply.error);
  }, patch);
  await settings.evaluate(async (ankiUrl, base) => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write",
      baseRevision: options.revision, options: { ...base, hoverEnabled: true, lookupMode: "hover",
        anki: { ...HDReaderOptions.DEFAULT_OPTIONS.anki, url: ankiUrl, model: "Basic",
          fieldTemplates: { Front: { value: "{expression}", overwriteMode: "overwrite" }, Back: { value: "{glossary}", overwriteMode: "overwrite" } } } } });
    if (!reply.ok) throw new Error(reply.error);
  }, `http://127.0.0.1:${port}`, { popupOpacityPercent: opacity, popupWidthPx: width, popupHeightPx: height, ...extraOptions });

  const tabs = {};
  for (const name of pageNames) {
    const tab = await browser.newPage();
    tab.setDefaultTimeout(30000);
    tab.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    await tab.setViewport({ width: 1100, height: 900 });
    await tab.goto(`http://127.0.0.1:${port}/${name}.html`);
    await tab.evaluate(() => document.fonts.ready);
    tabs[name] = tab;
  }
  const settle = tab => tab.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  const clipFor = async (tab, selector) => {
    const box = await tab.evaluate(selector => {
      const root = selector === "preview" ? document.getElementById("preview-host").shadowRoot : document.querySelector("hachidori-host").shadowRoot;
      return root.querySelector(".gsm-hoshidicts-popup").getBoundingClientRect().toJSON();
    }, selector);
    const view = tab.viewport();
    const x = Math.max(0, Math.floor(box.left - margin)), y = Math.max(0, Math.floor(box.top - margin));
    return { x, y, width: Math.min(view.width - x, Math.ceil(box.width + 2 * margin)), height: Math.min(view.height - y, Math.ceil(box.height + 2 * margin)), popup: box };
  };
  const hover = async (tab, id, slug) => {
    await tab.bringToFront();
    await tab.mouse.move(2, 2);
    await tab.keyboard.press("Escape");
    await tab.waitForFunction(() => {
      const popup = document.querySelector("hachidori-host")?.shadowRoot?.querySelector(".gsm-hoshidicts-popup");
      return !popup || popup.hidden;
    });
    const point = await tab.$eval(`#w-${id}`, node => {
      const range = document.createRange(); range.setStart(node.firstChild, 0); range.setEnd(node.firstChild, 1);
      const box = range.getBoundingClientRect(); return { x: box.x + box.width * 0.3, y: box.y + box.height / 2 };
    });
    await tab.mouse.move(point.x, point.y);
    await tab.waitForFunction(expected => {
      const host = document.querySelector("hachidori-host");
      const popup = host?.shadowRoot?.querySelector(".gsm-hoshidicts-popup");
      return host?.dataset.hoshidictsRenderer === expected && popup && !popup.hidden && popup.querySelector(".jl-entry");
    }, {}, slug);
    await tab.waitForFunction(() => {
      const button = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-mine-button");
      return !button || (button.dataset.state !== "checking" && !button.disabled);
    }).catch(() => {});
    // Park the pointer on the popup's top-right corner so hover-hide timers keep it open.
    const corner = await tab.evaluate(() => { const box = document.querySelector("hachidori-host").shadowRoot
      .querySelector(".gsm-hoshidicts-popup").getBoundingClientRect(); return { x: box.right - 3, y: box.top + 3 }; });
    await tab.mouse.move(corner.x, corner.y);
    await settle(tab);
  };

  let preview;
  if (withPreview) {
    preview = await browser.newPage();
    preview.on("pageerror", error => errors.push(`preview: ${error.message}`));
    await preview.setViewport({ width: 1100, height: 900 });
    await preview.goto(`${origin}/design-preview.html`);
    await preview.waitForFunction(() => !!window.HDDesignPreview);
  }

  for (const slug of slugs) {
    await writeOptions({ popupTheme: slug });
    for (const name of pageNames) {
      const tab = tabs[name];
      for (const id of words) {
        await hover(tab, id, slug);
        const clip = await clipFor(tab, "hover");
        const file = `${slug}--${name}--${id}.png`;
        await tab.screenshot({ path: resolve(out, file), clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } });
        const geometry = await tab.evaluate(() => {
          const popup = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup");
          const scroll = popup.querySelector(".jl-scroll").getBoundingClientRect();
          return { scrollTop: scroll.top - popup.getBoundingClientRect().top, entries: [...popup.querySelectorAll(".jl-entry:not([hidden])")].map(entry => {
            const box = entry.getBoundingClientRect(), definitions = entry.querySelector(".gsm-hoshidicts-definitions").getBoundingClientRect();
            return { dictionary: entry.dataset.dictionary, height: Math.round(box.height * 10) / 10, header: Math.round((definitions.top - box.top) * 10) / 10 };
          }) };
        });
        const contrast = await tab.evaluate(contrastProbe, "hover");
        report.renders.push({ slug, page: name, word: id, file, clip, contrast, geometry });
        console.log(`rendered ${file}`);
        if (withTops) {
          const top = await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".jl-entry:not([hidden]) .jl-top").getBoundingClientRect().toJSON());
          const topFile = `${slug}--${name}--${id}--top.png`;
          await tab.screenshot({ path: resolve(out, topFile), clip: { x: Math.max(0, top.left - 6), y: Math.max(0, top.top - 6), width: top.width + 12, height: top.height + 12 } });
        }
        if (withJapaneseTab && id === words[0]) {
          await hover(tab, id, slug);
          const clicked = await tab.evaluate(() => {
            const button = [...document.querySelector("hachidori-host").shadowRoot.querySelectorAll(".jl-tab")].find(node => node.textContent === "Japanese");
            button?.click(); return !!button;
          });
          if (clicked) {
            await settle(tab);
            const tabClip = await clipFor(tab, "hover");
            const tabFile = `${slug}--${name}--${id}--japanese-tab.png`;
            await tab.screenshot({ path: resolve(out, tabFile), clip: { x: tabClip.x, y: tabClip.y, width: tabClip.width, height: tabClip.height } });
            report.renders.push({ slug, page: name, word: `${id}-japanese-tab`, file: tabFile, clip: tabClip, contrast: await tab.evaluate(contrastProbe, "hover") });
            await tab.evaluate(() => [...document.querySelector("hachidori-host").shadowRoot.querySelectorAll(".jl-tab")][0].click());
          }
        }
        if (withKanji && id === words[0]) {
          await hover(tab, id, slug);
          await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-kanji-link").click());
          await tab.waitForFunction(() => !!document.querySelector("hachidori-host").shadowRoot.querySelector(".jl-kanji"));
          await settle(tab);
          const kanjiClip = await clipFor(tab, "hover");
          const kanjiFile = `${slug}--${name}--kanjiview.png`;
          await tab.screenshot({ path: resolve(out, kanjiFile), clip: { x: kanjiClip.x, y: kanjiClip.y, width: kanjiClip.width, height: kanjiClip.height } });
          report.renders.push({ slug, page: name, word: "kanji-view", file: kanjiFile, clip: kanjiClip, contrast: await tab.evaluate(contrastProbe, "hover") });
          console.log(`rendered ${kanjiFile}`);
        }
      }
    }
    if (preview) {
      for (const name of pageNames) {
        const colours = PAGES[name];
        await preview.bringToFront();
        await preview.evaluate(async ({ slug, colours, width, height, opacity, extraOptions }) => {
          let style = document.getElementById("ffxn-page");
          if (!style) {
            style = document.createElement("style"); style.id = "ffxn-page"; document.head.append(style);
            const content = document.createElement("section"); content.id = "ffxn-content";
            content.innerHTML = `<div class="banner"></div><h2>冒険者の朝</h2><p>冒険者は今日、朝ご飯を食べたかったが、雨のせいで出発が遅れた。図書館で漢字の本を手に取ると、窓から差し込む光が橋の端を照らしていた。</p><p>The quick brown fox jumps over the lazy dog. 0123456789 — reference text behind the popup.</p><p>次の町までは長い道のりだ。荷物を確かめ、仲間に声をかけてから、ゆっくりと歩き出した。</p>`;
            document.body.prepend(content);
          }
          style.textContent = `.vn-scene { background: ${colours.background} !important; color: ${colours.text} !important; }
            .vn-scene::before, .vn-next { display: none !important; }
            .vn-dialogue { inset: 24px auto auto 40px !important; padding: 0 !important; background: transparent !important; border: 0 !important;
              box-shadow: none !important; backdrop-filter: none !important; color: ${colours.text} !important; }
            .vn-speaker { color: ${colours.muted} !important; }
            #ffxn-content { position: absolute; inset: 120px 40px auto 40px; font: 20px/1.9 "Noto Sans JP", sans-serif; color: ${colours.text}; }
            #ffxn-content .banner { height: 170px; border-radius: 6px; background: ${colours.banner}; }`;
          const stored = await chrome.storage.local.get(["options"]);
          const options = { ...HDReaderOptions.normaliseOptions(stored.options), popupTheme: slug, popupWidthPx: width, popupHeightPx: height,
            popupOpacityPercent: opacity, ...extraOptions };
          HDDesignPreview.update(options, { revision: Date.now(), groups: [], dictionaries: [] });
        }, { slug, colours, width, height, opacity, extraOptions });
        await preview.waitForFunction(expected => {
          const host = document.getElementById("preview-host");
          return host.dataset.hoshidictsRenderer === expected && host.shadowRoot.querySelector(".gsm-hoshidicts-popup .jl-entry");
        }, {}, slug);
        await preview.waitForFunction(() => [...document.getElementById("preview-host").shadowRoot.querySelectorAll("img")]
          .every(image => image.complete)).catch(() => {});
        await settle(preview);
        const clip = await clipFor(preview, "preview");
        const file = `${slug}--${name}--preview.png`;
        await preview.screenshot({ path: resolve(out, file), clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } });
        report.renders.push({ slug, page: name, word: "preview", file, clip, contrast: await preview.evaluate(contrastProbe, "preview") });
        console.log(`rendered ${file}`);
      }
    }
  }
  report.errors = errors;
  writeFileSync(resolve(out, "report.json"), JSON.stringify(report, null, 2));
  const failures = report.renders.flatMap(render => render.contrast.filter(item => Math.min(item.white, item.black) < item.minimum)
    .map(item => `${render.file}: ${item.element} "${item.text}" ${item.color} white ${item.white} black ${item.black} < ${item.minimum}`));
  console.log(failures.length ? `CONTRAST FAILURES (${failures.length}):\n${failures.join("\n")}` : "contrast: all text passes over white and black pages");
  if (errors.length) console.log(`page errors:\n${errors.join("\n")}`);
} finally {
  await browser?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
