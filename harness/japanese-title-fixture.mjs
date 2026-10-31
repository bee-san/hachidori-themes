import { writeFileSync } from "node:fs";
const { buildTitledZip } = await import(`${process.env.TFB_WORK}/hachidori/test/make-fixture.mjs`);
const ruby = (base, rt) => ({ tag: "ruby", content: [base, { tag: "rt", content: rt }] });
const gloss = { type: "structured-content", content: [
  { tag: "ol", content: [
    { tag: "li", content: ["危険を", ruby("承知", "しょうち"), "の上で、まだ知られていない土地や", ruby("遺跡", "いせき"), "を探り歩く人。また、そのような", ruby("依頼", "いらい"), "を引き受けることを", ruby("生業", "なりわい"), "とする人。"] },
    { tag: "li", content: ["（比喩的に）思い切った試みをする人。"] },
  ] },
] };
// Made-up monolingual entry for a theme preview; not taken from any dictionary.
writeFileSync(`${process.env.TFB_WORK}/fixtures-ja/8-japanese-title.zip`, buildTitledZip("見本国語辞典", { terms: [["冒険者", "ぼうけんしゃ", "名", "", 30, [gloss], 20, ""]] }));
