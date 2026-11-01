// Synthetic dictionaries for rendering Crystal: the mock-up's content plus coverage entries.
// Run from anywhere: node make-crystal-fixtures.mjs <hachidori checkout> <output dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [hachidori, output] = process.argv.slice(2);
const { buildTitledZip } = await import(pathToFileURL(resolve(hachidori, "test/make-fixture.mjs")).href);
mkdirSync(output, { recursive: true });
const sc = content => ({ type: "structured-content", content });
const ruby = (base, reading) => ({ tag: "ruby", content: [base, { tag: "rt", content: reading }] });
const example = (ja, en) => ({ tag: "div", data: { content: "example-sentence" }, content: [
  { tag: "div", data: { content: "example-sentence-a" }, lang: "ja", content: ja },
  { tag: "div", data: { content: "example-sentence-b" }, content: en }] });
// [expression, reading, definitionTags, rules, score, glossary, sequence, termTags]
const jmdict = [
  ["食べる", "たべる", "ichidan transitive", "v1", 100, [sc(["to eat", example(["朝", ruby("ご飯", "ごはん"), "を", ruby("食", "た"), "べる。"], "I eat breakfast.")])], 1, ""],
  ["食べる", "たべる", "ichidan transitive", "", 99, ["to live on (e.g. a salary)", "to live off", "to subsist on"], 1, ""],
  ["取る", "とる", "godan transitive", "v5", 90, ["to take", "to pick up", "to grab", "to catch"], 2, ""],
  ["取る", "とる", "godan transitive", "", 89, ["to pass", "to hand", "to give"], 2, ""],
  ["取る", "とる", "godan transitive", "", 88, ["to get", "to obtain", "to acquire", "to win", "to receive", "to earn", "to take (e.g. a prize, a seat, a holiday, a degree or a licence after several years of study)"], 2, ""],
  ["取る", "とる", "godan transitive", "", 87, ["to adopt (a method, proposal, etc.)", "to take (a measure, a course of action, an attitude)", "to choose"], 2, ""],
  ["取る", "とる", "godan transitive", "", 86, ["to remove", "to get rid of", "to take off"], 2, ""],
  ["取る", "とる", "godan transitive", "", 85, ["to take away", "to steal", "to rob"], 2, ""],
  ["取る", "とる", "godan transitive", "", 84, ["to eat", "to have (a meal)", "to take (vitamins, etc.)"], 2, ""],
  ["取る", "とる", "godan transitive", "", 83, ["to reserve", "to book", "to save (a seat)", "to hold"], 2, ""],
  ["取る", "とる", "godan transitive", "", 82, ["to make (a copy)", "to take down (notes)", "to record"], 2, ""],
  ["取る", "とる", "godan transitive", "", 81, ["to interpret", "to understand", "to make out", "to take (to mean)"], 2, ""],
  ["橋", "はし", "noun", "", 80, ["bridge"], 3, ""],
  ["箸", "はし", "noun", "", 79, ["chopsticks"], 4, ""],
  ["端", "はし", "noun", "", 78, ["end (e.g. of street)", "tip", "point", "edge", "margin"], 5, ""],
  ["図書館", "としょかん", "noun", "", 77, ["library"], 6, ""],
  ["今日", "きょう", "noun adverb", "", 76, ["today", "this day"], 7, ""],
  ["出発", "しゅっぱつ", "noun suru", "vs", 75, ["departure", "setting off", "starting out"], 8, ""],
  ["光", "ひかり", "noun", "", 74, ["light", "illumination", "ray", "beam", "gleam", "glow"], 9, ""],
  ["ありがとう", "", "interjection", "", 73, ["thank you", "thanks"], 10, ""],
  ["の", "", "particle", "", 72, [sc(["indicates possessive", example(["私", ruby("の", "の"), ruby("本", "ほん"), "です。"], "It's my book.")])], 11, ""],
  ["の", "", "particle", "", 71, [sc(["nominalizes verbs and adjectives", example([ruby("読", "よ"), "むのが", ruby("好", "す"), "きです。"], "I like reading.")])], 11, ""],
  ["の", "", "particle", "", 70, ["substitutes for \"ga\" in subordinate phrases", "(at sentence-end, falling tone) indicates a confident conclusion", "(at sentence-end) indicates emotional emphasis"], 11, ""],
  ["連鎖語", "れんさご", "noun", "", 60, ["chained word (a synthetic entry for long headers)", "a second gloss so the line wraps at narrow widths"], 12, ""],
];
const kokugo = [
  ["食べる", "たべる", "", "v1", 100, ["①食物を口に入れ、かんで飲みこむ。「朝ご飯を―」②生活する。暮らしを立てる。「筆一本で―・べていく」"], 1, ""],
  ["取る", "とる", "", "v5", 90, ["①手に持つ。つかむ。「本を手に―・る」②自分のものにする。得る。「資格を―・る」③選ぶ。採用する。「彼の案を―・る」④除く。「しみを―・る」"], 2, ""],
  ["連鎖語", "れんさご", "", "", 60, ["①連なって続く語。②（試験用）幅の狭い表示で行が折り返すことを確かめるための長い説明文。"], 3, ""],
  ["光", "ひかり", "", "", 74, ["①目に明るさを感じさせるもの。「月の―」②希望。「前途に―が見える」③夜、橋の上から見える街の灯り。"], 4, ""],
];
// Jitendex's shape: sense groups, a part-of-speech tag, circled sense markers and examples.
const marked = (tag, content, data) => ({ tag, data: { content: data }, content });
const sense = (mark, glosses, ja, en) => ({ tag: "li", data: { content: "sense" }, style: { listStyleType: `"${mark}"` },
  content: [marked("ul", glosses.map(gloss => ({ tag: "li", content: gloss })), "glossary"),
    marked("div", example(ja, en), "extra-info")] });
const jitendexLike = [
  ["食べる", "たべる", "", "v1", 100, [sc([marked("ul", marked("li", [
    { tag: "span", data: { class: "tag", content: "part-of-speech-info" }, content: "1-dan" },
    { tag: "span", data: { class: "tag", content: "part-of-speech-info" }, content: "transitive" },
    { tag: "ol", content: [sense("①", ["to eat"], ["もっと", ruby("果物", "くだもの"), "を", ruby("食", "た"), "べるべきです。"], "You should eat more fruit."),
      sense("②", ["to live on (e.g. a salary)", "to live off", "to subsist on"], [ruby("脚本家", "きゃくほんか"), "で", ruby("食", "た"), "べていく。"], "To make a living as a scriptwriter.")] },
  ], "sense-group"), "sense-groups"), marked("div", "JMdict | Tatoeba", "attribution")])], 1, ""],
];
const archives = {
  "jmdict-sample.zip": buildTitledZip("JMdict (sample)", { terms: jmdict }),
  "kokugo-sample.zip": buildTitledZip("国語 (sample)", { terms: kokugo }),
  // Jitendex's own list rules, as test/chrome-glossary-layout.mjs quotes them.
  "jitendex-like.zip": buildTitledZip("Jitendex-like (sample)", { terms: jitendexLike, styles: `ul[data-sc-content="sense-groups"] { list-style-type: "＊"; }
li[data-sc-content="sense"] { padding-left: 0.25em; & ul[data-sc-content="glossary"] { list-style-type: none; padding-left: 0.25em; } }
ul[data-sc-content="glossary"] { list-style-type: disc; }` }),
  "corpus-sample.zip": buildTitledZip("Sample corpus", { banks: false, frequencyMode: "occurrence-based", termMeta: [
    ["食べる", "freq", { reading: "たべる", frequency: { value: 18240, displayValue: "18,240" } }],
    ["取る", "freq", { reading: "とる", frequency: { value: 9120, displayValue: "9,120" } }],
    ["の", "freq", { value: 990000, displayValue: "990,000" }]] }),
  "ranks-sample.zip": buildTitledZip("Sample ranks", { banks: false, frequencyMode: "rank-based", termMeta: [
    ["食べる", "freq", { reading: "たべる", value: 120, displayValue: "120" }],
    ["取る", "freq", { reading: "とる", value: 85, displayValue: "85" }],
    ["の", "freq", { value: 1, displayValue: "1" }]] }),
  "pitch-sample.zip": buildTitledZip("Sample pitch", { banks: false, termMeta: [
    ["食べる", "pitch", { reading: "たべる", pitches: [{ position: 2 }] }],
    ["取る", "pitch", { reading: "とる", pitches: [{ position: 1 }] }],
    ["橋", "pitch", { reading: "はし", pitches: [{ position: 2 }] }],
    ["箸", "pitch", { reading: "はし", pitches: [{ position: 1 }] }],
    ["端", "pitch", { reading: "はし", pitches: [{ position: 0 }] }],
    ["図書館", "pitch", { reading: "としょかん", pitches: [{ position: 2 }] }],
    ["今日", "pitch", { reading: "きょう", pitches: [{ position: 1 }] }],
    ["出発", "pitch", { reading: "しゅっぱつ", pitches: [{ position: 0 }] }],
    ["光", "pitch", { reading: "ひかり", pitches: [{ position: 3 }] }],
    ["連鎖語", "pitch", { reading: "れんさご", pitches: [{ position: 0 }] }]] }),
};
for (const [name, bytes] of Object.entries(archives)) writeFileSync(resolve(output, name), bytes);
console.log(Object.keys(archives).join("\n"));
