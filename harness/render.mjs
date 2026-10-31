// SPDX-License-Identifier: GPL-3.0-or-later
// Theme exploration harness: Hachidori's real extension popup (content script,
// engine, Bee renderer) on light and dark pages, with a computed-style contrast
// audit for every shot. Adapted from hachidori test/chrome-theme-store.mjs.
// usage: node render.mjs --out DIR --themes a,b --scenes taberu,no --pages light,dark
//        [--fonts free|base] [--width 560] [--height 420] [--options '{"k":v}'] [--store] [--dump]
//        [--forced] [--custom] [--opacity 85]
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const W = import.meta.dirname;
const root = resolve(W, "hachidori");
const require = createRequire(resolve(root, "test/tooling/package.json"));
const puppeteer = require("puppeteer-core");
const { answerAnkiConnect } = await import(resolve(root, "test/anki-connect-fake.mjs"));
const { values: args } = parseArgs({ options: {
  out: { type: "string" }, themes: { type: "string" }, scenes: { type: "string", default: "taberu" },
  pages: { type: "string", default: "light,dark" }, fonts: { type: "string", default: "free" },
  width: { type: "string", default: "560" }, height: { type: "string", default: "420" },
  options: { type: "string", default: "{}" }, store: { type: "boolean", default: false },
  dump: { type: "boolean", default: false }, forced: { type: "boolean", default: false },
  custom: { type: "boolean", default: false }, opacity: { type: "string" },
  reduced: { type: "boolean", default: false }, "no-anki": { type: "boolean", default: false },
} });
const output = resolve(args.out);
mkdirSync(output, { recursive: true });
const themes = args.themes.split(",");
const scenes = args.scenes.split(",");
const pages = args.pages.split(",");
const fixtures = readdirSync(resolve(W, "fixtures")).filter(name => name.endsWith(".zip")).map(name => resolve(W, "fixtures", name));
const PAGES = { light: { background: "#ffffff", text: "#1a1a1a" }, dark: { background: "#1e1e1e", text: "#e6e6e6" } };
// Each scene puts one word in the page's sentence and optionally acts on the popup.
const SCENES = {
  taberu: { before: "朝ごはんを", word: "食べたかった", after: "。" },
  kanji: { before: "この", word: "漢字", after: "を読む。" },
  no: { before: "これ", word: "のです", after: "。" },
  rensa: { before: "", word: "連鎖語", after: "について。" },
  heikin: { before: "", word: "平均", after: "して。" },
  arigatou: { before: "", word: "ありがとう", after: "。" },
  kanjiview: { before: "朝ごはんを", word: "食べたかった", after: "。", action: "kanji" },
  note: { before: "朝ごはんを", word: "食べたかった", after: "。", action: "note" },
  focus: { before: "", word: "連鎖語", after: "について。", action: "focus" },
  scrolled: { before: "この", word: "漢字", after: "を読む。", action: "scroll" },
  more: { before: "朝ごはんを", word: "食べたかった", after: "。", action: "more" },
  nested: { before: "", word: "連鎖語", after: "について。", action: "nested" },
};

const profile = mkdtempSync(resolve(tmpdir(), "fw-theme-render-"));
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
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:36px 70px;font:30px/1.6 "Noto Sans CJK JP",sans-serif;min-height:100vh;box-sizing:border-box}
    body.light{background:${PAGES.light.background};color:${PAGES.light.text}}
    body.dark{background:${PAGES.dark.background};color:${PAGES.dark.text}}
    p{margin:0 0 8px}</style>
    <body class="light"><p id="line"><span id="before"></span><span id="word"></span><span id="after"></span></p>
    <p style="font-size:18px;opacity:.75">The quick brown fox — 吾輩は猫である。名前はまだ無い。</p></body>`);
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const ankiUrl = `http://127.0.0.1:${server.address().port}`;
const fontconfig = resolve(W, "fonts", `${args.fonts}.conf`);
let browser;
const report = { fonts: args.fonts, shots: [] };
try {
  browser = await puppeteer.launch({
    executablePath: resolve(root, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
    headless: true, enableExtensions: true, userDataDir: profile,
    env: { ...process.env, FONTCONFIG_FILE: fontconfig },
    args: [`--disable-extensions-except=${resolve(root, "extension")}`, `--load-extension=${resolve(root, "extension")}`,
      "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox", "--hide-scrollbars", "--font-render-hinting=none"],
  });
  report.chrome = await browser.version();
  const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const settings = await browser.newPage();
  settings.setDefaultTimeout(180000);
  const errors = [];
  settings.on("pageerror", error => errors.push(`settings: ${error.message}`));
  await settings.goto(`${origin}/settings.html#add-dictionaries`);
  await settings.waitForFunction(async () => {
    const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
    return status.ok && status.ready && !status.loading;
  }, { polling: 200 });
  await (await settings.$("#import-file")).uploadFile(...fixtures);
  await settings.waitForFunction(count => document.getElementById("import-state").textContent.includes(`${count} imported, 0 failed`),
    { polling: 200 }, fixtures.length);
  // Group tabs: Words and Examples, as Bee's renderer shows All plus groups with results.
  await settings.evaluate(async () => {
    const { dictionaryState } = await chrome.storage.local.get("dictionaryState");
    const byTitle = title => dictionaryState.dictionaries.find(dictionary => dictionary.title === title)?.id;
    const groups = [
      { id: "fw-words", name: "Words", dictionaryIds: ["hachidori-fixture", "theme-bench-senses", "structured-content-deep-fixture",
        "nested-links-fixture", "Average terms", "kanji-reading-furigana-fixture"].map(byTitle).filter(Boolean) },
      { id: "fw-examples", name: "Examples", dictionaryIds: ["dictionary-tabs-usage", "dictionary-tabs-examples",
        "dictionary-tabs-reference"].map(byTitle).filter(Boolean) },
    ];
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_state_cas",
      baseRevision: dictionaryState.revision, dictionaries: dictionaryState.dictionaries, groups });
    if (!reply.ok) throw new Error(reply.error);
  });
  const writeOptions = patch => settings.evaluate(async patch => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write",
      baseRevision: options.revision, options: patch });
    if (!reply.ok) throw new Error(reply.error);
  }, patch);
  const base = { hoverEnabled: true, lookupMode: "hover", popupWidthPx: Number(args.width), popupHeightPx: Number(args.height),
    ...JSON.parse(args.options) };
  if (args.opacity) base.popupOpacityPercent = Number(args.opacity);
  if (args.custom) base.customButtons = [
    { id: "search", type: "link", label: "Search", url: "https://example.test/%w" },
    { id: "template", type: "anki", label: "My card", templateId: "default" },
    { id: "extra", type: "link", label: "Wiki", url: "https://example.test/%r" },
  ];
  if (!args["no-anki"]) {
    base.anki = await settings.evaluate(url => ({ ...HDReaderOptions.DEFAULT_OPTIONS.anki, url, model: "Basic",
      fieldTemplates: { Front: { value: "{expression}", overwriteMode: "overwrite" }, Back: { value: "{glossary}", overwriteMode: "overwrite" } } }), ankiUrl);
  }
  await writeOptions(base);
  const tab = await browser.newPage();
  tab.setDefaultTimeout(60000);
  tab.on("pageerror", error => errors.push(`tab: ${error.message}`));
  tab.on("console", message => { if (["error", "warn"].includes(message.type())) errors.push(`console ${message.type()}: ${message.text()}`); });
  await tab.setViewport({ width: 1100, height: 820, deviceScaleFactor: 1 });
  await tab.goto(ankiUrl);
  const media = await tab.createCDPSession();
  const features = [];
  if (args.forced) features.push({ name: "forced-colors", value: "active" });
  if (args.reduced) features.push({ name: "prefers-reduced-motion", value: "reduce" });
  const hover = async () => {
    await tab.bringToFront();
    await tab.keyboard.press("Escape");
    await tab.keyboard.press("Escape");
    await tab.evaluate(() => document.querySelector("hachidori-host")?.shadowRoot?.activeElement?.blur());
    await tab.mouse.move(2, 2);
    await new Promise(done => setTimeout(done, 120));
    const point = await tab.$eval("#word", node => {
      const range = document.createRange(); range.setStart(node.firstChild, 0); range.setEnd(node.firstChild, 1);
      const box = range.getBoundingClientRect(); return { x: box.x + box.width * .25, y: box.y + box.height / 2 };
    });
    await tab.mouse.move(point.x, point.y);
    await tab.waitForFunction(() => {
      const popup = document.querySelector("hachidori-host")?.shadowRoot?.querySelector(".gsm-hoshidicts-popup");
      return popup && !popup.hidden && popup.querySelector(".gsm-hoshidicts-entry, .jl-entry");
    });
  };
  const settle = async () => {
    await tab.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    await new Promise(done => setTimeout(done, 350));
  };
  for (const theme of themes) {
    await writeOptions({ popupTheme: theme });
    for (const pageName of pages) {
      const scheme = pageName === "dark" ? "dark" : "light";
      await media.send("Emulation.setEmulatedMedia", { features: [...features, { name: "prefers-color-scheme", value: scheme }] });
      await tab.evaluate(name => { document.body.className = name; }, pageName);
      for (const sceneName of scenes) {
        const scene = SCENES[sceneName];
        await tab.evaluate(scene => {
          for (const key of ["before", "word", "after"]) document.getElementById(key).textContent = scene[key];
        }, scene);
        await hover();
        await tab.waitForFunction(theme => document.querySelector("hachidori-host")?.dataset.hoshidictsRenderer === theme, {}, theme);
        if (!args["no-anki"] && !["kanjiview"].includes(sceneName)) {
          await tab.waitForFunction(() => {
            const buttons = [...document.querySelector("hachidori-host").shadowRoot.querySelectorAll(".gsm-hoshidicts-mine-button")];
            return buttons.length > 0 && buttons.every(button => button.dataset.state !== "checking");
          }).catch(() => errors.push(`${theme}/${sceneName}: mine button never settled`));
        }
        if (scene.action === "kanji") {
          await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-kanji-link").click());
          await tab.waitForFunction(() => !!document.querySelector("hachidori-host")?.shadowRoot?.querySelector(".jl-kanji"));
        } else if (scene.action === "note") {
          await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-note-button").click());
          await tab.waitForFunction(() => !!document.querySelector("hachidori-host")?.shadowRoot.querySelector("form:not([hidden])"));
        } else if (scene.action === "focus") {
          await tab.keyboard.press("Tab");
          await tab.evaluate(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".jl-tab:not([aria-pressed='true'])")?.focus());
        } else if (scene.action === "more") {
          await tab.evaluate(() => {
            const more = document.querySelector("hachidori-host").shadowRoot.querySelector(".bee-more-actions");
            more.open = true; more.querySelector("summary").focus();
          });
        } else if (scene.action === "nested") {
          const point = await tab.evaluate(() => {
            const popup = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup");
            const walker = document.createTreeWalker(popup, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              const index = text.textContent.indexOf("食用語");
              if (index < 0) continue;
              text.parentElement.scrollIntoView({ block: "center" });
              const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
              const box = range.getBoundingClientRect(); return { x: box.x + box.width * .3, y: box.y + box.height / 2 };
            }
            return null;
          });
          if (point) {
            await tab.mouse.move(point.x - 30, point.y);
            await tab.mouse.move(point.x, point.y, { steps: 4 });
            await tab.waitForFunction(() => document.querySelector("hachidori-host").shadowRoot.querySelectorAll(".gsm-hoshidicts-popup:not([hidden])").length > 1, { timeout: 15000 })
              .catch(() => errors.push("nested popup did not open"));
          } else errors.push("nested: no 食用語 text");
        } else if (scene.action === "scroll") {
          await tab.evaluate(() => { const scroll = document.querySelector("hachidori-host").shadowRoot.querySelector(".jl-scroll"); scroll.scrollTop = scroll.scrollHeight * 0.45; });
        }
        await settle();
        const audit = await tab.evaluate(pageColours => {
          const shadow = document.querySelector("hachidori-host").shadowRoot;
          const popup = shadow.querySelector(".gsm-hoshidicts-popup");
          const canvas = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
          const rgba = value => { canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1); return [...canvas.getImageData(0, 0, 1, 1).data]; };
          const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] / 255 + back[index] * (1 - front[3] / 255));
          const luminance = color => color.reduce((sum, value, index) => {
            const channel = value / 255;
            return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
          }, 0);
          const ratio = (front, back) => { const values = [luminance(front), luminance(back)].sort((a, b) => a - b); return (values[1] + .05) / (values[0] + .05); };
          const chain = node => { const list = []; for (let current = node; current; current = current.parentElement) list.unshift(current); return list; };
          const background = (node, page) => chain(node).reduce((color, ancestor) => blend(rgba(getComputedStyle(ancestor).backgroundColor), color), page);
          const imaged = node => chain(node).filter(ancestor => getComputedStyle(ancestor).backgroundImage !== "none").map(ancestor => ancestor.className || ancestor.tagName);
          const describe = node => `${node.tagName.toLowerCase()}.${String(node.className).split(" ").filter(Boolean).slice(-1)[0] || ""}`;
          const results = [];
          const walker = document.createTreeWalker(popup, NodeFilter.SHOW_TEXT);
          const seen = new Set();
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (!text.textContent.trim()) continue;
            const element = text.parentElement;
            if (seen.has(element) || !element.getClientRects().length || !element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
            seen.add(element);
            const style = getComputedStyle(element);
            if (parseFloat(style.fontSize) < 1) continue;
            const color = rgba(style.color);
            const ratios = Object.entries(pageColours).map(([name, page]) => {
              const back = background(element, page);
              return [name, Number(ratio(blend(color, back), back).toFixed(2))];
            });
            results.push({ element: describe(element), text: text.textContent.trim().slice(0, 24), size: style.fontSize,
              weight: style.fontWeight, ...Object.fromEntries(ratios), images: imaged(element) });
          }
          const borders = [];
          for (const node of popup.querySelectorAll(".jl-tab, .gsm-hoshidicts-text-action-button, input, textarea, .gsm-hoshidicts-kanji-back")) {
            if (!node.getClientRects().length) continue;
            const color = rgba(getComputedStyle(node).borderTopColor);
            if (parseFloat(getComputedStyle(node).borderTopWidth) === 0) continue;
            borders.push({ element: describe(node), ...Object.fromEntries(Object.entries(pageColours).map(([name, page]) => {
              const back = background(node.parentElement, page);
              return [name, Number(ratio(blend(color, back), back).toFixed(2))];
            })) });
          }
          const focused = shadow.activeElement;
          let focus = null;
          if (focused?.matches(":focus-visible")) {
            const style = getComputedStyle(focused);
            focus = { element: describe(focused), width: style.outlineWidth, offset: style.outlineOffset,
              ...Object.fromEntries(Object.entries(pageColours).map(([name, page]) => {
                const back = background(focused.parentElement, page);
                return [name, Number(ratio(blend(rgba(style.outlineColor), back), back).toFixed(2))];
              })) };
          }
          return { results, borders, focus, nodes: popup.querySelectorAll("*").length };
        }, { white: [255, 255, 255], black: [0, 0, 0], light: [255, 255, 255], dark: [30, 30, 30] });
        const geometry = await tab.evaluate(() => {
          const popup = document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup");
          const p = popup.getBoundingClientRect(), w = document.getElementById("word").getBoundingClientRect();
          return { popup: { x: p.x, y: p.y, width: p.width, height: p.height }, word: { x: w.x, y: w.y, width: w.width, height: w.height } };
        });
        const margin = 26;
        const left = Math.max(0, Math.min(geometry.popup.x, geometry.word.x) - margin);
        const top = Math.max(0, Math.min(geometry.popup.y, geometry.word.y) - 12);
        const right = Math.min(1100, Math.max(geometry.popup.x + geometry.popup.width, geometry.word.x + geometry.word.width) + margin);
        const bottom = Math.min(820, geometry.popup.y + geometry.popup.height + margin);
        const name = `${theme}__${sceneName}__${pageName}${args.forced ? "__forced" : ""}`;
        if (scene.action === "nested") await tab.screenshot({ path: resolve(output, `${name}.png`) });
        else await tab.screenshot({ path: resolve(output, `${name}.png`), clip: { x: left, y: top, width: right - left, height: bottom - top } });
        if (args.store && scene.action !== "nested") {
          const handle = await tab.evaluateHandle(() => document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup"));
          await handle.asElement().screenshot({ path: resolve(output, `${name}__popup.png`) });
          await handle.dispose();
        }
        if (args.dump) writeFileSync(resolve(output, `${name}.html`), await tab.evaluate(() =>
          document.querySelector("hachidori-host").shadowRoot.querySelector(".gsm-hoshidicts-popup").outerHTML));
        const worst = audit.results.reduce((min, item) => Math.min(min, item.white, item.black), Infinity);
        report.shots.push({ name, theme, scene: sceneName, page: pageName, worstText: worst, ...audit, geometry });
        console.log(`${name}: worst text ${worst.toFixed(2)} (${audit.results.length} text nodes, ${audit.nodes} elements)`);
      }
    }
  }
  report.errors = errors;
  writeFileSync(resolve(output, `report-${Date.now()}.json`), JSON.stringify(report, null, 2));
  if (errors.length) console.log("ERRORS", JSON.stringify(errors, null, 1));
} finally {
  await browser?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
