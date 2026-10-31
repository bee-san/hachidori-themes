#!/usr/bin/env node
// Light and dark article pages for real hover lookups (generated per request).
// SPDX-License-Identifier: GPL-3.0-or-later
export const PAGES = {
  light: { background: "#ffffff", text: "#1a1a1a", muted: "#555555", banner: "linear-gradient(120deg, #2b6cb0, #e53e3e 45%, #f6e05e 75%, #38a169)" },
  dark: { background: "#121212", text: "#e6e6e6", muted: "#a0a0a0", banner: "linear-gradient(120deg, #1a365d, #9b2c2c 45%, #b7791f 75%, #276749)" },
  white: { background: "#ffffff", text: "#1a1a1a", muted: "#555555", plain: true },
  black: { background: "#121212", text: "#e6e6e6", muted: "#a0a0a0", plain: true },
};

export const WORDS = {
  taberu: "食べたかった", toru: "取る", bouken: "冒険者", kyou: "今日", shuppatsu: "出発", hikari: "光",
  kanji: "漢字", ame: "雨", hashi1: "箸", hashi2: "橋", hashi3: "端", toshokan: "図書館",
};

export function page(name) {
  const colours = PAGES[name];
  const word = id => `<span id="w-${id}">${WORDS[id]}</span>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${name} page</title><style>
body { margin: 0; background: ${colours.background}; color: ${colours.text}; font: 20px/1.9 "Noto Sans JP", sans-serif; }
main { padding: 28px 40px; }
.words { margin: 0 0 14px; font-size: 24px; letter-spacing: .02em; }
.words span { margin-right: .7em; }
.banner { height: 170px; margin: 14px 0; border-radius: 6px; background: ${colours.banner}; }
.meta { color: ${colours.muted}; font-size: 15px; }
h2 { margin: 18px 0 6px; font-size: 26px; }
</style></head><body><main>
<p class="words">${Object.keys(WORDS).map(word).join("")}</p>
${colours.plain ? "" : `<p class="meta">2026年10月31日 · 旅の記録</p>
<div class="banner"></div>
<h2>冒険者の朝</h2>
<p>冒険者は今日、朝ご飯を食べたかったが、雨のせいで出発が遅れた。図書館で漢字の本を手に取ると、窓から差し込む光が橋の端を照らしていた。箸を置いて、地図を広げる。</p>
<p>The quick brown fox jumps over the lazy dog. 0123456789 — reference text so the translucent popup has page content behind it.</p>
<p>次の町までは長い道のりだ。荷物を確かめ、仲間に声をかけてから、ゆっくりと歩き出した。</p>`}
</main></body></html>`;
}
