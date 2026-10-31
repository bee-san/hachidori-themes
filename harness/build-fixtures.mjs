// Synthetic preview dictionaries for theme screenshots. All content is made up
// here or comes from Hachidori's own test fixtures; nothing is copied from a
// published dictionary.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const H = resolve(process.env.TFB_WORK, "hachidori");
const { buildFixtureZip, buildTitledZip, structuredContentDeepFixture } = await import(resolve(H, "test/make-fixture.mjs"));
const out = resolve(process.argv[2] || "fixtures");
mkdirSync(out, { recursive: true });

// Hachidori's own fixture: 食べる (two rows, 142位, three pitch shapes), 漢字 (table + image), 食 (kanji).
writeFileSync(resolve(out, "1-hachidori-fixture.zip"), buildFixtureZip());

// benchmark/theme-popup-fixture.mjs: 漢字 with 24 numbered senses.
const tags = ["n vs", "n", "vt", "n col", "exp", "n uk"];
const glosses = ["Chinese character", "kanji", "Han character", "sinograph", "logogram", "written form",
  "character used in Japanese writing", "ideograph (loosely)", "glyph", "letter", "script", "orthography"];
const senses = Array.from({ length: 24 }, (_, i) => ["漢字", "かんじ", tags[i % tags.length], "", 100 - i,
  Array.from({ length: 2 + i % 2 }, (_, j) => `${glosses[(i * 3 + j) % glosses.length]} (sense ${i + 1})`), 2, ""]);
writeFileSync(resolve(out, "2-theme-bench-senses.zip"), buildTitledZip("theme-bench-senses", { terms: senses }));

// test/make-fixture.mjs structuredContentDeepFixture: の with nested senses and ruby examples.
writeFileSync(resolve(out, "3-structured-deep.zip"), structuredContentDeepFixture().archive());

// A made-up entry with a long gloss, an example with furigana and two tags.
const ruby = (base, rt) => ({ tag: "ruby", content: [base, { tag: "rt", content: rt }] });
const sc = content => ({ type: "structured-content", content });
const bouken = sc([
  { tag: "ol", content: [
    { tag: "li", content: "a person who seeks adventure; especially one registered with a guild who takes on dangerous requests, escorts caravans and explores old ruins in exchange for pay" },
    { tag: "li", content: "(figurative) someone who takes bold risks in business or in life" },
  ] },
  { tag: "div", data: { content: "example" }, content: [
    "「", ruby("冒険者", "ぼうけんしゃ"), "ギルドに", ruby("登録", "とうろく"), "する」 to register with the adventurers' guild",
  ] },
]);
const crystal = sc([
  { tag: "ul", content: [
    { tag: "li", content: "crystal; a transparent solid with flat faces" },
    { tag: "li", content: ["(figurative) the fruit of long effort: ", "「", ruby("努力", "どりょく"), "の", ruby("結晶", "けっしょう"), "」"] },
  ] },
]);
writeFileSync(resolve(out, "4-theme-preview.zip"), buildTitledZip("Theme preview", { terms: [
  ["冒険者", "ぼうけんしゃ", "n", "", 50, [bouken], 10, "common"],
  ["結晶", "けっしょう", "n vs", "vs", 40, [crystal], 11, ""],
] }));

// Two rank-based frequency lists and a pitch list, so several frequency chips and a pitch marker show.
const freq = (term, reading, value) => [term, "freq", { reading, frequency: { value, displayValue: String(value) } }];
writeFileSync(resolve(out, "5-novel-frequency.zip"), buildTitledZip("Novel frequency", { banks: false, frequencyMode: "rank-based",
  termMeta: [freq("冒険者", "ぼうけんしゃ", 8412), freq("食べる", "たべる", 310), freq("漢字", "かんじ", 2034), freq("結晶", "けっしょう", 12850)] }));
writeFileSync(resolve(out, "6-anime-frequency.zip"), buildTitledZip("Anime frequency", { banks: false, frequencyMode: "rank-based",
  termMeta: [freq("冒険者", "ぼうけんしゃ", 5120), freq("食べる", "たべる", 95), freq("漢字", "かんじ", 4410)] }));
const pitch = (term, reading, position) => [term, "pitch", { reading, pitches: [{ position }] }];
writeFileSync(resolve(out, "7-sample-pitch.zip"), buildTitledZip("Sample pitch", { banks: false,
  termMeta: [pitch("冒険者", "ぼうけんしゃ", 3), pitch("漢字", "かんじ", 0), pitch("結晶", "けっしょう", 0)] }));
console.log(`fixtures in ${out}`);
