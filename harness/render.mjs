// Render Citadel through Hachidori's real popup: the unpacked extension in the pinned
// Chrome for Testing, the real WASM importer, hover lookups on a local page.
// node render.mjs <hachidori checkout> <out dir> [scene ...]
// Adapted from the Crystal previews' crystal-render.mjs (previews/crystal branch).
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [hachidori, outArg, ...wanted] = process.argv.slice(2);
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const require = createRequire(resolve(hachidori, "test/tooling/package.json"));
const puppeteer = require("puppeteer-core");
const extension = resolve(hachidori, "extension");
const fixtures = resolve(import.meta.dirname, "../fixtures");
const { answerAnkiConnect } = await import(pathToFileURL(resolve(hachidori, "test/anki-connect-fake.mjs")).href);
// The production popup is a closed shadow root (#618); the tests' helper hands
// it to the page as window.__popupRoot without opening it.
const { exposePopupRoot } = await import(pathToFileURL(resolve(hachidori, "test/chrome-popup-root.mjs")).href);
const profile = mkdtempSync(resolve(tmpdir(), "citadel-render-"));
const WORDS = { none: "ぬぺぽ", taberu: "食べたかった", toru: "取った", bridge: "橋", chopsticks: "箸", edge: "端", library: "図書館",
  today: "今日", departure: "出発", light: "光", thanks: "ありがとう", no: "の", kanji: "漢字", rensa: "連鎖語" };
const PAGES = { light: { background: "#ffffff", text: "#1a1a1a" }, dark: { background: "#1e1e1e", text: "#e6e6e6" } };
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
  const url = new URL(request.url, "http://localhost");
  const page = PAGES[url.searchParams.get("page")] ?? PAGES.dark;
  const clean = url.searchParams.has("clean");
  const lines = Object.entries(WORDS).map(([id, word]) => clean ? `<p><span id="${id}">${word}</span></p>`
    : `<p>朝ごはんを<span id="${id}">${word}</span>。この文は背景の文字です。</p>`).join("");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:40px 60px;background:${page.background};color:${page.text};font:28px/1.6 "Noto Sans CJK JP",sans-serif}p{margin:0 0 6px}</style>${lines}`);
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);
try {
  browser = await puppeteer.launch({
    executablePath: resolve(hachidori, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
    headless: true, enableExtensions: true, userDataDir: profile,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--disable-gpu", "--disable-dev-shm-usage",
      "--no-sandbox", "--font-render-hinting=none"],
  });
  const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
  const extensionOrigin = `chrome-extension://${new URL(worker.url()).host}`;
  const settings = await browser.newPage();
  settings.setDefaultTimeout(120000);
  const errors = [];
  settings.on("pageerror", error => errors.push(`settings: ${error.message}`));
  await settings.setViewport({ width: 1400, height: 1000 });
  await settings.goto(`${extensionOrigin}/settings.html#add-dictionaries`);
  await settings.bringToFront();
  await settings.waitForFunction(async () => {
    const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
    return status.ok && status.ready && !status.loading;
  }, { polling: 100 });
  const archives = ["corpus-sample.zip", "ranks-sample.zip", "pitch-sample.zip", "jmdict-sample.zip", "kokugo-sample.zip", "jitendex-like.zip"]
    .map(name => resolve(fixtures, name));
  archives.push(resolve(hachidori, "test/fixtures/hachidori-fixture.zip"));
  for (const [index, archive] of archives.entries()) {
    await (await settings.$("#import-file")).uploadFile(archive);
    try {
      await settings.waitForFunction(() => /1 imported, 0 failed/.test(document.getElementById("import-state").textContent), { timeout: 30000, polling: 200 });
    } catch (error) {
      log("import state:", await settings.$eval("#import-state", node => node.textContent));
      await settings.screenshot({ path: resolve(out, "import-failure.png") });
      throw error;
    }
    await settings.evaluate(() => { document.getElementById("import-state").textContent = ""; });
    log("imported", index + 1, archive.split("/").at(-1));
  }
  const settle = async () => {
    await settings.waitForFunction(async () => {
      const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
      return status.ok && status.ready && !status.loading;
    }, { polling: 200 });
    await new Promise(done => setTimeout(done, 400));
  };
  const writeOptions = patch => settings.evaluate(async patch => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write", baseRevision: options.revision, options: patch });
    if (!reply.ok) throw new Error(reply.error);
  }, patch);
  // Enabled dictionaries by title (reloads the engine), then groups as [name, titles].
  const library = (enabled, groups = []) => settings.evaluate(async (enabled, groups) => {
    let { dictionaryState } = await chrome.storage.local.get("dictionaryState");
    const dictionaries = dictionaryState.dictionaries.map(item => ({ ...item, enabled: enabled.includes(item.title) }));
    const applied = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_apply_state",
      requestId: `citadel-${Date.now()}`, baseRevision: dictionaryState.revision, dictionaries });
    if (!applied.ok) throw new Error(applied.error);
    ({ dictionaryState } = await chrome.storage.local.get("dictionaryState"));
    const byTitle = new Map(dictionaryState.dictionaries.map(item => [item.title, item.id]));
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_state_cas", baseRevision: dictionaryState.revision,
      dictionaries: dictionaryState.dictionaries,
      groups: groups.map(([name, titles], index) => ({ id: `citadel-group-${index}`, name, dictionaryIds: titles.map(title => byTitle.get(title)) })) });
    if (!reply.ok) throw new Error(reply.error);
  }, enabled, groups).then(settle);
  const MOCKUP = ["Sample corpus", "Sample ranks", "Sample pitch", "JMdict (sample)", "国語 (sample)"];
  const GROUPS = [["Words", ["JMdict (sample)"]], ["Japanese", ["国語 (sample)"]]];
  await writeOptions({ hoverEnabled: true, lookupMode: "hover", popupTheme: "citadel", showLookupCounts: false, definitionBlurCountEnabled: false });
  await settings.evaluate(async ankiUrl => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write", baseRevision: options.revision,
      options: { anki: { ...HDReaderOptions.DEFAULT_OPTIONS.anki, url: ankiUrl, model: "Basic",
        fieldTemplates: { Front: { value: "{expression}", overwriteMode: "overwrite" }, Back: { value: "{glossary}", overwriteMode: "overwrite" } } } } });
    if (!reply.ok) throw new Error(reply.error);
  }, origin);
  await library(MOCKUP, GROUPS);
  const tab = await browser.newPage();
  tab.on("pageerror", error => errors.push(`tab: ${error.message}`));
  tab.on("console", message => { if (["error", "warn"].includes(message.type())) errors.push(`console ${message.type()}: ${message.text()}`); });
  // scheme: the system colour scheme the popup follows (dark grey or beige).
  async function open(page = "dark", scale = 1, viewport = { width: 1100, height: 900 }, { clean = false, scheme = "dark", forced = false } = {}) {
    await tab.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }, { name: "forced-colors", value: forced ? "active" : "none" }]);
    await tab.setViewport({ ...viewport, deviceScaleFactor: scale });
    await tab.goto(`${origin}/?page=${page}${clean ? "&clean" : ""}`);
  }
  async function hover(id) {
    await tab.bringToFront();
    await tab.mouse.move(2, 2);
    await tab.keyboard.press("Escape");
    const point = await tab.$eval(`#${id}`, node => {
      const range = document.createRange(); range.setStart(node.firstChild, 0); range.setEnd(node.firstChild, 1);
      const box = range.getBoundingClientRect(); return { x: box.x + box.width * 0.3, y: box.y + box.height / 2 };
    });
    await tab.mouse.move(point.x, point.y);
    if (!await tab.evaluate(() => !!window.__popupRoot)) await exposePopupRoot(tab, { timeout: 15000 });
    await tab.waitForFunction(() => {
      const popup = window.__popupRoot?.querySelector(".gsm-hoshidicts-popup");
      return popup && !popup.hidden && popup.querySelector(".gsm-hoshidicts-entry, .gsm-hoshidicts-lookup-notice")
        && window.__popupRoot.host.dataset.hoshidictsRenderer === "citadel";
    });
    await tab.waitForFunction(() => {
      const popup = window.__popupRoot.querySelector(".gsm-hoshidicts-popup");
      const buttons = [...popup.querySelectorAll(".gsm-hoshidicts-mine-button")];
      return buttons.length > 0 && buttons.every(button => button.dataset.state !== "checking");
    }, { timeout: 5000 }).catch(() => log("no ready Anki button"));
    await tab.evaluate(() => document.fonts.ready);
    await tab.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  }
  async function shot(name, { margin = 0 } = {}) {
    const box = await tab.evaluate(() => {
      const popup = window.__popupRoot.querySelector(".gsm-hoshidicts-popup:not([hidden])");
      const rect = popup.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const clip = { x: Math.max(0, box.x - margin), y: Math.max(0, box.y - margin), width: box.width + margin * 2, height: box.height + margin * 2 };
    await tab.screenshot({ path: resolve(out, `${name}.png`), clip });
    log("shot", name, JSON.stringify(box));
    return box;
  }
  // WCAG contrast of every visible text node, control border, icon and focus
  // ring, composited over white and black pages. Gradient fills declare their
  // worst stop as the colour. Tabs paint their plate in ::before, which counts.
  async function contrast(name) {
    const checks = await tab.evaluate(() => {
      const root = window.__popupRoot;
      const popup = root.querySelector(".gsm-hoshidicts-popup:not([hidden])");
      const canvas = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
      const rgba = value => { canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = value; canvas.fillRect(0, 0, 1, 1); return [...canvas.getImageData(0, 0, 1, 1).data]; };
      const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] / 255 + back[index] * (1 - front[3] / 255));
      const luminance = color => color.reduce((sum, value, index) => {
        const channel = value / 255; return sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
      }, 0);
      const ratio = (a, b) => { const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y); return (high + 0.05) / (low + 0.05); };
      const PLATES = ".citadel-tab, .gsm-hoshidicts-kanji-back";
      const background = (node, page) => {
        const chain = []; for (let current = node; current; current = current.parentElement ?? current.getRootNode().host) {
          if (current === document.documentElement) break; chain.unshift(current); if (current === popup) break; }
        return chain.reduce((color, ancestor) => {
          let next = blend(rgba(getComputedStyle(ancestor).backgroundColor), color);
          if (ancestor.matches?.(PLATES)) next = blend(rgba(getComputedStyle(ancestor, "::before").backgroundColor), next);
          return next;
        }, page);
      };
      const results = [];
      const check = (node, color, minimum, against = node, kind = "text", property = "color") => {
        const ratios = [[255, 255, 255], [0, 0, 0]].map(page => { const back = background(against, page); return ratio(blend(rgba(color), back), back); });
        results.push({ kind, selector: `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}`, text: node.textContent.trim().slice(0, 24), property, minimum, ratio: Math.min(...ratios) });
      };
      const walker = document.createTreeWalker(popup, NodeFilter.SHOW_TEXT);
      const owners = new Set();
      for (let text = walker.nextNode(); text; text = walker.nextNode()) if (text.data.trim() && text.parentElement.getClientRects().length) owners.add(text.parentElement);
      for (const node of owners) {
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.opacity === "0" || parseFloat(style.fontSize) === 0) continue;
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight, 10) >= 700);
        check(node, style.color, large ? 3 : 4.5);
      }
      // Sense numbers are generated content.
      for (const node of popup.querySelectorAll(".citadel-sense")) {
        const style = getComputedStyle(node, "::before");
        if (node.getClientRects().length && style.content !== "none") check(node, style.color, 4.5, node, "text", "::before color");
      }
      for (const node of popup.querySelectorAll(PLATES))
        if (node.getClientRects().length) check(node, getComputedStyle(node, "::before").borderTopColor, 3, node.parentElement, "border", "::before border");
      for (const node of popup.querySelectorAll(".gsm-hoshidicts-tag-frequency, .citadel-tag, input, textarea"))
        if (node.getClientRects().length) check(node, getComputedStyle(node).borderTopColor, 3, node.parentElement, "border", "border");
      // Buttons: in the dark variant the gold edge marks them, in beige the red plate.
      for (const node of popup.querySelectorAll(".gsm-hoshidicts-mine-button, .gsm-hoshidicts-audio-button, .gsm-hoshidicts-note-button, .gsm-hoshidicts-popup-close, .citadel-more-actions > summary, .gsm-hoshidicts-entry-actions .gsm-hoshidicts-text-action-button")) {
        if (!node.getClientRects().length || node.closest(".citadel-action-menu")) continue;
        const style = getComputedStyle(node);
        const ratios = [[255, 255, 255], [0, 0, 0]].map(page => {
          const back = background(node.parentElement, page);
          return Math.max(ratio(blend(rgba(style.borderTopColor), back), back), ratio(blend(rgba(style.backgroundColor), back), back));
        });
        results.push({ kind: "button", selector: `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}`, text: node.getAttribute("aria-label") || "", property: "edge or plate", minimum: 3, ratio: Math.min(...ratios) });
      }
      // Mask icons paint their background colour over the button.
      for (const node of popup.querySelectorAll(".hd-icon"))
        if (node.getClientRects().length) check(node, getComputedStyle(node).backgroundColor, 3, node.parentElement, "icon", "icon");
      for (const node of popup.querySelectorAll(".gsm-hoshidicts-audio-button, .gsm-hoshidicts-popup-close"))
        if (node.getClientRects().length) check(node, getComputedStyle(node).color, 3, node, "icon", "icon");
      for (const node of popup.querySelectorAll(".citadel-book"))
        if (node.getClientRects().length) check(node, getComputedStyle(node).backgroundColor, 3, node.parentElement, "icon", "book");
      const focused = root.activeElement;
      if (focused && popup.contains(focused) && focused.matches(":focus-visible")) check(focused, getComputedStyle(focused).outlineColor, 3, focused.parentElement, "focus", "outline");
      return results;
    });
    const failing = checks.filter(item => item.ratio < item.minimum);
    const lowest = kind => checks.filter(item => item.kind === kind).reduce((low, item) => Math.min(low, item.ratio), Infinity);
    log("contrast", name, `checks=${checks.length}`, `fail=${failing.length}`, ...["text", "border", "button", "icon", "focus"].map(kind => `${kind}=${lowest(kind).toFixed(2)}`));
    for (const item of failing) log("  FAIL", JSON.stringify(item));
    return checks;
  }
  const report = {};
  const focusFirstTab = async () => {
    await tab.evaluate(() => window.__popupRoot.querySelector(".citadel-tab").focus());
    await tab.keyboard.press("Tab");
    await tab.keyboard.down("Shift"); await tab.keyboard.press("Tab"); await tab.keyboard.up("Shift");
  };
  const scenes = {
    async mockup() {
      await open("dark", 2);
      await hover("taberu");
      await shot("mockup-dark-2x");
      log("head", JSON.stringify(await tab.evaluate(() => {
        const root = window.__popupRoot;
        const width = node => Math.round(node.getBoundingClientRect().width * 10) / 10;
        const head = root.querySelector(".citadel-head");
        return { head: width(head), word: width(head.querySelector(".citadel-word")), actions: width(head.querySelector(".gsm-hoshidicts-entry-actions")),
          items: [...head.querySelectorAll(".citadel-word > *, .gsm-hoshidicts-tag-frequency")].map(node => [node.className.split(" ").at(-1), width(node)]) };
      })));
      report.mockup = await contrast("mockup-dark");
    },
    // Both variants on a white and a #1e1e1e page.
    async pages() {
      for (const scheme of ["dark", "light"]) {
        for (const page of ["light", "dark"]) {
          await open(page, 1, undefined, { scheme });
          await hover("taberu");
          await shot(`taberu-${scheme}-on-${page}`, { margin: 24 });
          report[`taberu-${scheme}-on-${page}`] = await contrast(`taberu-${scheme}-on-${page}`);
        }
      }
    },
    async beige() {
      await open("light", 2, undefined, { scheme: "light" });
      await hover("taberu");
      await shot("mockup-beige-2x");
      report.beige = await contrast("mockup-beige");
    },
    // 300 px with three custom buttons, so the third goes under More actions.
    async narrow() {
      await writeOptions({ popupWidthPx: 300, customButtons: [
        { id: "search", type: "link", label: "Search", url: "https://example.test/%w" },
        { id: "card", type: "anki", label: "Sentence card", templateId: "default" },
        { id: "extra", type: "link", label: "Example sentences", url: "https://example.test/%r" }] });
      for (const [scheme, page] of [["dark", "light"], ["dark", "dark"], ["light", "light"]]) {
        await open(page, 2, undefined, { scheme });
        await hover("taberu");
        await focusFirstTab();
        await shot(`narrow-${scheme}-on-${page}-2x`);
        report[`narrow-${scheme}-on-${page}`] = await contrast(`narrow-${scheme}-on-${page}`);
        await tab.evaluate(() => {
          const more = window.__popupRoot.querySelector(".citadel-more-actions");
          more.open = true; more.querySelector("summary").focus();
        });
        await shot(`narrow-more-${scheme}-on-${page}-2x`);
        report[`narrow-more-${scheme}-on-${page}`] = await contrast(`narrow-more-${scheme}-on-${page}`);
      }
      await writeOptions({ popupWidthPx: 560, customButtons: [] });
    },
    async long() {
      await writeOptions({ popupHeightPx: 900 });
      await open("dark", 1, { width: 1100, height: 1000 });
      await hover("toru");
      await shot("toru-long");
      report.long = await contrast("toru-long");
      await writeOptions({ popupHeightPx: 420 });
      await open("light", 1, undefined, { scheme: "light" });
      await hover("toru");
      await tab.evaluate(() => { window.__popupRoot.querySelector(".citadel-scroll").scrollTop = 260; });
      await shot("toru-scrolled-beige");
      report["long-beige"] = await contrast("toru-scrolled-beige");
    },
    async furigana() {
      await open("dark", 2);
      await hover("no");
      await shot("no-furigana-2x");
      report.furigana = await contrast("no-furigana");
      await open("light", 2, undefined, { scheme: "light" });
      await hover("no");
      await shot("no-furigana-beige-2x");
      report["furigana-beige"] = await contrast("no-furigana-beige");
    },
    // Each pitch type in both Design styles, cropped to the header.
    async pitch() {
      for (const style of ["contour", "overline"]) {
        await writeOptions({ pitchAccentFuriganaStyle: style });
        await open("dark", 2);
        for (const id of ["bridge", "chopsticks", "edge", "library", "today", "departure", "light"]) {
          await hover(id);
          const head = await tab.evaluate(() => {
            const rect = window.__popupRoot.querySelector(".citadel-head").getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          });
          await tab.screenshot({ path: resolve(out, `pitch-${style}-${id}.png`), clip: head });
        }
      }
      await writeOptions({ pitchAccentFuriganaStyle: "contour" });
    },
    async frequency() {
      await writeOptions({ averageFrequency: true, showFrequencyTagsWithAverage: true, showFrequencyDictionaryNames: true, compactFrequencyNumbers: true });
      for (const scheme of ["dark", "light"]) {
        await open(scheme, 2, undefined, { scheme });
        await hover("taberu");
        await shot(`frequency-names-average-${scheme}-2x`);
        report[`frequency-${scheme}`] = await contrast(`frequency-${scheme}`);
      }
      await writeOptions({ averageFrequency: false, showFrequencyTagsWithAverage: false, showFrequencyDictionaryNames: false, compactFrequencyNumbers: false });
    },
    async kanji() {
      await library([...MOCKUP, "hachidori-fixture"], GROUPS);
      for (const scheme of ["dark", "light"]) {
        await open(scheme, 2, undefined, { scheme });
        await hover("taberu");
        await tab.evaluate(() => window.__popupRoot.querySelector(".gsm-hoshidicts-kanji-link").click());
        await tab.waitForFunction(() => !!window.__popupRoot.querySelector(".citadel-kanji"));
        await tab.evaluate(() => document.fonts.ready);
        await tab.focus("body");
        await tab.keyboard.press("Tab");
        await tab.evaluate(() => window.__popupRoot.querySelector(".gsm-hoshidicts-kanji-back").focus());
        await shot(`kanji-back-focus-${scheme}-2x`);
        report[`kanji-${scheme}`] = await contrast(`kanji-${scheme}`);
      }
      await library(MOCKUP, GROUPS);
    },
    async note() {
      for (const [scheme, page] of [["dark", "light"], ["light", "dark"]]) {
        await open(page, 2, undefined, { scheme });
        await hover("taberu");
        await tab.evaluate(() => window.__popupRoot.querySelector(".gsm-hoshidicts-note-button").click());
        await tab.waitForFunction(() => !!window.__popupRoot.querySelector("form:not([hidden])"));
        await shot(`note-${scheme}-on-${page}-2x`);
        report[`note-${scheme}`] = await contrast(`note-${scheme}`);
      }
    },
    // Hover a word inside a definition for a child popup with Close.
    async nested() {
      for (const scheme of ["dark", "light"]) {
        await open(scheme, 1, { width: 1100, height: 1000 }, { scheme });
        await hover("light");
        const point = await tab.evaluate(() => {
          const root = window.__popupRoot;
          for (const content of root.querySelectorAll(".citadel-gloss")) {
            const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
            for (let text = walker.nextNode(); text; text = walker.nextNode()) {
              const index = text.data.indexOf("橋");
              if (index < 0) continue;
              const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
              const box = range.getBoundingClientRect(); return { x: box.x + box.width * 0.4, y: box.y + box.height / 2 };
            }
          }
          return null;
        });
        await tab.mouse.move(point.x, point.y, { steps: 4 });
        await tab.waitForFunction(() => window.__popupRoot.querySelectorAll(".gsm-hoshidicts-popup:not([hidden])").length > 1, { timeout: 10000 });
        await tab.evaluate(() => new Promise(done => setTimeout(done, 300)));
        const union = await tab.evaluate(() => {
          const rects = [...window.__popupRoot.querySelectorAll(".gsm-hoshidicts-popup:not([hidden])")].map(node => node.getBoundingClientRect());
          const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top));
          return { x: left - 10, y: top - 10, width: Math.max(...rects.map(r => r.right)) - left + 20, height: Math.max(...rects.map(r => r.bottom)) - top + 20 };
        });
        await tab.screenshot({ path: resolve(out, `nested-${scheme}.png`), clip: union });
        log("nested", scheme, JSON.stringify(union));
      }
    },
    async forced() {
      for (const scheme of ["dark", "light"]) {
        await open(scheme, 1, undefined, { scheme, forced: true });
        await hover("taberu");
        await focusFirstTab();
        await shot(`forced-${scheme}`, { margin: 12 });
        report[`forced-${scheme}`] = await contrast(`forced-${scheme}`);
      }
    },
    async structured() {
      await library(["Sample corpus", "Sample ranks", "Sample pitch", "Jitendex-like (sample)", "hachidori-fixture"], []);
      await open("dark", 2);
      await hover("taberu");
      await shot("jitendex-like-2x");
      report.structured = await contrast("structured");
      await hover("kanji");
      await tab.waitForFunction(() => [...window.__popupRoot.querySelectorAll(".citadel-gloss img")]
        .every(image => image.complete && image.naturalWidth > 0), { timeout: 10000 }).catch(() => log("image not loaded"));
      await shot("fixture-kanji-structured-2x");
      report["structured-kanji"] = await contrast("structured-kanji");
      await library(MOCKUP, GROUPS);
    },
    // The Store card: the mock-up's content on a plain dark page at 1x.
    async store() {
      await open("dark", 1, { width: 1100, height: 900 }, { clean: true });
      await hover("taberu");
      await tab.mouse.move(1, 1);
      await shot("store-card");
    },
    async preview() {
      await settings.bringToFront();
      for (const scheme of ["dark", "light"]) {
        await settings.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
        await settings.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
        await settings.evaluate(() => { location.hash = "design"; });
        await settings.waitForSelector(".theme-store-card button", { visible: true });
        const frame = settings.frames().find(item => item.url().includes("design-preview.html"));
        await frame.waitForFunction(() => document.getElementById("preview-host").dataset.hoshidictsRenderer === "citadel"
          && !!document.getElementById("preview-host").shadowRoot.querySelector(".citadel-section"));
        await frame.evaluate(() => document.fonts.ready);
        await new Promise(done => setTimeout(done, 400));
        const handle = await frame.frameElement();
        await handle.screenshot({ path: resolve(out, `design-preview-${scheme}.png`) });
        log("preview tabs", JSON.stringify(await frame.evaluate(() => [...document.getElementById("preview-host").shadowRoot.querySelectorAll(".citadel-tab")].map(node => node.textContent))));
      }
      await settings.emulateMediaFeatures([]);
    },
    async compact() {
      await writeOptions({ glossaryLayoutMode: "compact" });
      await open("dark", 2);
      await hover("toru");
      await shot("compact-2x");
      await writeOptions({ glossaryLayoutMode: "default" });
    },
    // Keyboard entry navigation in the real popup: Alt+ArrowDown/Home move
    // between words, a configured key moves to the next dictionary's section.
    async keyboard() {
      await library([...MOCKUP, "hachidori-fixture"], GROUPS);
      const keybinds = await settings.evaluate(() => [...HDReaderOptions.DEFAULT_OPTIONS.keybinds,
        { action: "nextEntryDifferentDictionary", argument: "", key: "KeyN", modifiers: ["alt"], scopes: ["popup"], enabled: true },
        { action: "previousEntryDifferentDictionary", argument: "", key: "KeyM", modifiers: ["alt"], scopes: ["popup"], enabled: true }]);
      await writeOptions({ keybinds, popupHeightPx: 300 });
      await open("dark", 1);
      await hover("taberu");
      const where = () => tab.evaluate(() => {
        const root = window.__popupRoot, scroll = root.querySelector(".citadel-scroll");
        const top = scroll.getBoundingClientRect().top;
        const atTop = [...root.querySelectorAll(".citadel-result, .citadel-section")].filter(node => node.getClientRects().length)
          .map(node => [node.className, node.dataset.dictionary ?? node.querySelector(".citadel-spelling")?.textContent, Math.round(node.getBoundingClientRect().top - top)])
          .filter(([, , offset]) => Math.abs(offset) <= 2);
        return { scrollTop: Math.round(scroll.scrollTop), atTop };
      });
      const steps = { start: await where() };
      for (const [name, key] of [["Alt+N", "KeyN"], ["Alt+N again", "KeyN"], ["Alt+M", "KeyM"], ["Alt+ArrowDown", "ArrowDown"], ["Alt+Home", "Home"], ["Alt+End", "End"]]) {
        await tab.keyboard.down("Alt"); await tab.keyboard.press(key); await tab.keyboard.up("Alt");
        await tab.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        steps[name] = await where();
      }
      log("keyboard", JSON.stringify(steps));
      report.keyboard = steps;
      await writeOptions({ keybinds: await settings.evaluate(() => HDReaderOptions.DEFAULT_OPTIONS.keybinds), popupHeightPx: 420 });
      await library(MOCKUP, GROUPS);
    },
    // Not a Citadel scene: custom buttons added after the page opened, then a
    // Store theme switch. The rebuilt renderer gets none until the page reloads
    // (the same for Crystal), because a closed popup's view.clear() drops the
    // recorded setCustomButtons that a rebuild would replay.
    async switchCustomButtons() {
      const count = () => tab.evaluate(() => [window.__popupRoot.host.dataset.hoshidictsRenderer, window.__popupRoot.querySelectorAll("[data-custom-button-id]").length]);
      const raw = async () => {
        await tab.bringToFront(); await tab.mouse.move(2, 2); await tab.keyboard.press("Escape");
        const point = await tab.$eval("#taberu", node => { const r = node.getBoundingClientRect(); return { x: r.x + 10, y: r.y + r.height / 2 }; });
        await tab.mouse.move(point.x, point.y);
        if (!await tab.evaluate(() => !!window.__popupRoot)) await exposePopupRoot(tab, { timeout: 15000 });
        await new Promise(done => setTimeout(done, 1200));
      };
      await writeOptions({ popupTheme: "default", customButtons: [] });
      await open("dark", 1);
      await raw();
      log("default, none", await count());
      await writeOptions({ customButtons: [
        { id: "search", type: "link", label: "Search", url: "https://example.test/%w" },
        { id: "card", type: "anki", label: "Sentence card", templateId: "default" },
        { id: "extra", type: "link", label: "Example sentences", url: "https://example.test/%r" }] });
      await raw();
      log("default, three", await count());
      await writeOptions({ popupTheme: "crystal" });
      await raw();
      log("switched to crystal", await count());
      await writeOptions({ popupTheme: "citadel" });
      await raw();
      log("switched to citadel", await count());
      await writeOptions({ customButtons: [] });
    },
    // A group tab hides the other sections; the word's buttons stay in its header.
    async groups() {
      await open("dark", 2);
      await hover("taberu");
      await tab.evaluate(() => [...window.__popupRoot.querySelectorAll(".citadel-tab")].at(-1).click());
      await tab.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      await shot("group-japanese-2x");
      report.groups = await contrast("group-japanese");
    },
  };
  for (const name of wanted.length ? wanted : Object.keys(scenes)) {
    if (!scenes[name]) throw new Error(`unknown scene ${name}`);
    log("scene", name);
    await scenes[name]();
  }
  writeFileSync(resolve(out, "report.json"), JSON.stringify({ chrome: await browser.version(), errors, report }, null, 1));
  log("errors", JSON.stringify(errors));
} finally {
  await browser?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
