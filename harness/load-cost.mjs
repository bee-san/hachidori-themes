// Renderer main-thread task time for one page load with a theme selected and
// no lookup, from a Chrome trace: the sum of top-level RunTask durations on
// CrRendererMain during the 2 s after navigation starts.
// node load-cost.mjs <hachidori checkout> <loads> <theme ...>
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const [hachidori, loadsArg, ...themes] = process.argv.slice(2);
const loads = Number(loadsArg);
const require = createRequire(resolve(process.env.HACHIDORI_TOOLING || resolve(hachidori, "test/tooling"), "package.json"));
const puppeteer = require("puppeteer-core");
const extension = resolve(hachidori, "extension");
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><meta charset="utf-8"><style>body{font:32px sans-serif;padding:80px}</style><p>朝ごはんを<span id="word">食べたかった</span>。</p>');
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const median = values => { const v = [...values].sort((a, b) => a - b); const n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
const results = {};
try {
  for (const theme of themes) {
    const profile = mkdtempSync(resolve(tmpdir(), "crystal-load-"));
    const browser = await puppeteer.launch({ executablePath: process.env.HACHIDORI_CHROME || resolve(hachidori, "test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome"),
      headless: true, enableExtensions: true, userDataDir: profile,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--disable-gpu", "--no-sandbox"] });
    try {
      const worker = await browser.waitForTarget(target => target.type() === "service_worker" && target.url().endsWith("/background.js"));
      const origin = `chrome-extension://${new URL(worker.url()).host}`;
      const settings = await browser.newPage();
      await settings.goto(`${origin}/settings.html`);
      await settings.waitForFunction(async () => !!(await chrome.storage.local.get("options")).options, { polling: 100 }).catch(() => {});
      await settings.evaluate(async popupTheme => {
        const { options } = await chrome.storage.local.get("options");
        const reply = await chrome.runtime.sendMessage({ target: "hoshidicts-worker", type: "hd_options_write", baseRevision: options?.revision ?? 0,
          options: { popupTheme } });
        if (!reply.ok) throw new Error(reply.error);
      }, theme);
      const samples = [];
      for (let index = 0; index <= loads; index++) {
        const tab = await browser.newPage();
        const path = resolve(tmpdir(), `crystal-load-trace-${process.pid}.json`);
        await tab.tracing.start({ path, categories: ["toplevel", "disabled-by-default-devtools.timeline"] });
        await tab.goto(`http://127.0.0.1:${server.address().port}/?${theme}-${index}`);
        await new Promise(done => setTimeout(done, 2000));
        await tab.tracing.stop();
        await tab.close();
        const { traceEvents } = JSON.parse(readFileSync(path, "utf8"));
        rmSync(path, { force: true });
        const names = new Map(traceEvents.filter(event => event.name === "thread_name").map(event => [`${event.pid}:${event.tid}`, event.args.name]));
        const renderer = traceEvents.filter(event => event.ph === "X" && event.name === "ThreadControllerImpl::RunTask"
          && names.get(`${event.pid}:${event.tid}`) === "CrRendererMain");
        // The page's renderer is the one that ran the most tasks.
        const byPid = new Map();
        for (const event of renderer) byPid.set(event.pid, (byPid.get(event.pid) ?? 0) + event.dur / 1000);
        const total = Math.max(0, ...byPid.values());
        if (index > 0) samples.push(total);
      }
      results[theme] = { loads: samples.length, medianMs: median(samples).toFixed(1), samples: samples.map(value => value.toFixed(1)).join(" ") };
    } finally {
      await browser.close();
      rmSync(profile, { recursive: true, force: true });
    }
  }
  console.log(JSON.stringify(results, null, 1));
} finally { server.close(); }
