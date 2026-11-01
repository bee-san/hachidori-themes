// Does a page with a strict img-src CSP see violations from the theme, at load and on hover?
// node csp-probe.mjs <hachidori checkout> <theme> [label]
// From the Crystal previews (previews/crystal), with the closed popup root (#618) read through the tests' helper.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [hachidori, theme, label = theme] = process.argv.slice(2);
const require = createRequire(resolve(hachidori, "test/tooling/package.json"));
const puppeteer = require("puppeteer-core");
const extension = resolve(hachidori, "extension");
const { exposePopupRoot } = await import(pathToFileURL(resolve(hachidori, "test/chrome-popup-root.mjs")).href);
const profile = mkdtempSync(resolve(tmpdir(), "citadel-csp-"));
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'");
  response.end(`<!doctype html><meta charset="utf-8"><script>window.violations = [];
document.addEventListener("securitypolicyviolation", event => violations.push([performance.now() | 0, event.violatedDirective, event.blockedURI.slice(0, 40)]));</script>
<style>body{font:32px sans-serif;padding:80px}</style><p>朝ごはんを<span id="word">食べたかった</span>。</p>`);
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: resolve(hachidori, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
    headless: true, enableExtensions: true, userDataDir: profile,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--disable-gpu", "--no-sandbox"] });
  const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const settings = await browser.newPage();
  await settings.goto(`${origin}/settings.html#add-dictionaries`);
  await settings.bringToFront();
  await settings.waitForFunction(async () => {
    const status = await chrome.runtime.sendMessage({ target: "hoshidicts-offscreen", type: "hd_status" });
    return status.ok && status.ready && !status.loading;
  }, { polling: 100 });
  await (await settings.$("#import-file")).uploadFile(resolve(hachidori, "test/fixtures/hachidori-fixture.zip"));
  await settings.waitForFunction(() => /1 imported, 0 failed/.test(document.getElementById("import-state").textContent), { polling: 200 });
  await settings.evaluate(async popupTheme => {
    const { options } = await chrome.storage.local.get("options");
    const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write", baseRevision: options.revision,
      options: { hoverEnabled: true, lookupMode: "hover", popupTheme, definitionBlurCountEnabled: false } });
    if (!reply.ok) throw new Error(reply.error);
  }, theme);
  const tab = await browser.newPage();
  const consoleLines = [];
  tab.on("console", message => { if (/Content Security Policy|Refused/.test(message.text())) consoleLines.push(message.text().slice(0, 120)); });
  await tab.setViewport({ width: 1000, height: 700 });
  await tab.goto(`http://127.0.0.1:${server.address().port}/`);
  await tab.bringToFront();
  await new Promise(done => setTimeout(done, 3000));
  const atLoad = await tab.evaluate(() => violations.length);
  const point = await tab.$eval("#word", node => { const box = node.getBoundingClientRect(); return { x: box.x + 10, y: box.y + box.height / 2 }; });
  await tab.mouse.move(point.x, point.y);
  await exposePopupRoot(tab, { timeout: 15000 });
  await tab.waitForFunction(() => {
    const popup = window.__popupRoot?.querySelector(".gsm-hoshidicts-popup");
    return popup && !popup.hidden && popup.querySelector(".gsm-hoshidicts-entry");
  });
  await new Promise(done => setTimeout(done, 1500));
  const afterHover = await tab.evaluate(() => violations.length);
  // Positive control: the page's own data: image is blocked and reported.
  const control = await tab.evaluate(async () => {
    const image = new Image(); image.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw="; document.body.append(image);
    await new Promise(done => setTimeout(done, 500));
    return violations.length;
  });
  const icons = await tab.evaluate(() => {
    const root = window.__popupRoot;
    const icon = root.querySelector(".gsm-hoshidicts-note-icon");
    const book = root.querySelector(".citadel-book");
    return { note: icon ? getComputedStyle(icon).maskImage.slice(0, 30) : null, book: book ? getComputedStyle(book).maskImage.slice(0, 30) : null,
      crest: getComputedStyle(root.querySelector(".gsm-hoshidicts-popup"), "::after").backgroundImage.slice(0, 30) };
  });
  await tab.screenshot({ path: resolve(tmpdir(), `csp-${label}.png`) });
  console.log(JSON.stringify({ label, theme, violationsAtLoad: atLoad, violationsAfterHover: afterHover, violationsAfterPageDataImage: control, consoleLines: consoleLines.slice(0, 4), consoleCount: consoleLines.length, icons }));
} finally {
  await browser?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
