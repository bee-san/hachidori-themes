#!/usr/bin/env python3
"""Small, original sample dictionaries for theme renders (never committed).

Covers what the brief asks to check: structured definitions with example
sentences in ruby furigana, several pitch shapes (heiban, atamadaka, nakadaka,
odaka, small kana, a long word), rank and occurrence frequencies, a long
multi-sense entry, a monolingual dictionary with long Japanese text, and a
kanji bank. All glosses and definitions are written for this harness."""
import json
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parent / "dicts"
OUT.mkdir(exist_ok=True)


def index(title, **extra):
    return {"title": title, "format": 3, "revision": "theme-sample-1", "sequenced": False,
            "author": "theme harness", "description": "Sample data for theme renders", **extra}


def write(title, filename, files):
    with zipfile.ZipFile(OUT / filename, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, value in files.items():
            data = value if isinstance(value, (bytes, str)) else json.dumps(value, ensure_ascii=False)
            archive.writestr(name, data)
    print("wrote", OUT / filename)


def tag(text, title):
    return {"tag": "span", "title": title, "data": {"content": "part-of-speech-info"}, "content": text}


def ruby(base, reading):
    return {"tag": "ruby", "content": [base, {"tag": "rt", "content": reading}]}


def example(japanese, english):
    return {"tag": "div", "data": {"content": "example-sentence"}, "content": [
        {"tag": "div", "lang": "ja", "data": {"content": "example-sentence-a"}, "content": japanese},
        {"tag": "div", "data": {"content": "example-sentence-b"}, "content": english}]}


def sense(tags, glosses, extra=None):
    content = [{"tag": "div", "data": {"content": "tags"}, "content": tags},
               {"tag": "ul", "data": {"content": "glossary"}, "content": [{"tag": "li", "content": g} for g in glosses]}]
    if extra:
        content.append(extra)
    return {"tag": "li", "data": {"content": "sense"}, "content": content}


def entry(*senses):
    return {"type": "structured-content", "content": {"tag": "ol", "data": {"content": "sense-list"}, "content": list(senses)}}


V1, V5R, VT, VI = tag("ichidan", "Ichidan verb"), tag("godan", "Godan verb with 'ru' ending"), tag("transitive", "Transitive verb"), tag("intransitive", "Intransitive verb")
N, VS, ADV = tag("noun", "Noun (common)"), tag("suru", "Noun or participle which takes the aux. verb suru"), tag("adverb", "Adverbial noun")

TERMS = [
    ["食べる", "たべる", "v1 vt", "v1", 120, [entry(
        sense([V1, VT], ["to eat"], example(["朝", ruby("ご飯", "ごはん"), "を", ruby("食", "た"), "べる。"], "I eat breakfast.")),
        sense([V1, VT], ["to live on (e.g. a salary)", "to live off", "to subsist on"]))], 1, "common"],
    ["冒険", "ぼうけん", "n vs", "vs", 100, [entry(
        sense([N, VS], ["adventure", "venture"], example([ruby("冒険", "ぼうけん"), "の", ruby("旅", "たび"), "に", ruby("出", "で"), "る。"], "To set out on an adventure.")),
        sense([N, VS], ["risk", "danger", "hazard"]))], 2, "common"],
    ["冒険者", "ぼうけんしゃ", "n", "", 90, [entry(sense([N], ["adventurer"],
        example([ruby("若", "わか"), "い", ruby("冒険者", "ぼうけんしゃ"), "が", ruby("街", "まち"), "に", ruby("着", "つ"), "いた。"], "A young adventurer arrived in town.")))], 3, ""],
    ["取る", "とる", "v5r vt", "v5", 110, [entry(
        sense([V5R, VT], ["to take", "to pick up", "to grab", "to catch"], example([ruby("本", "ほん"), "を", ruby("手", "て"), "に", ruby("取", "と"), "る。"], "To pick up a book.")),
        sense([V5R, VT], ["to pass", "to hand", "to give"]),
        sense([V5R, VT], ["to get", "to obtain", "to acquire", "to win", "to receive", "to earn", "to take (e.g. a vacation)"]),
        sense([V5R, VT], ["to adopt (a method, proposal, etc.)", "to take (a measure, attitude, etc.)", "to choose"]),
        sense([V5R, VT], ["to remove", "to get rid of", "to take off"]),
        sense([V5R, VT], ["to take away", "to steal", "to rob"]),
        sense([V5R, VT], ["to eat", "to have (a meal)", "to take (vitamins, etc.)", "to consume"]),
        sense([V5R, VT], ["to reserve", "to book", "to save", "to secure", "to put aside"]),
        sense([V5R, VT], ["to make (a copy)", "to take (notes, a photograph, minutes)", "to record"]),
        sense([V5R, VT], ["to interpret", "to understand", "to take (to mean)", "to read (a situation) in a particular way, which is a deliberately long gloss to test how a single sense wraps across several lines of the popup"]))], 4, "common"],
    ["今日", "きょう", "n adv", "", 100, [entry(sense([N, ADV], ["today", "this day"],
        example([ruby("今日", "きょう"), "は", ruby("雨", "あめ"), "が", ruby("降", "ふ"), "っている。"], "It is raining today.")))], 5, "common"],
    ["出発", "しゅっぱつ", "n vs vi", "vs", 100, [entry(sense([N, VS, VI], ["departure"],
        example([ruby("明日", "あした"), "の", ruby("朝", "あさ"), "に", ruby("出発", "しゅっぱつ"), "する。"], "We depart tomorrow morning.")),
        sense([N, VS, VI], ["start", "setting off", "starting point"]))], 6, "common"],
    ["光", "ひかり", "n", "", 100, [entry(sense([N], ["light", "illumination", "ray", "beam"]), sense([N], ["hope", "a bright future"]))], 7, "common"],
    ["漢字", "かんじ", "n", "", 100, [entry(sense([N], ["kanji", "Chinese characters"]))], 8, "common"],
    ["雨", "あめ", "n", "", 100, [entry(sense([N], ["rain"]))], 9, "common"],
    ["箸", "はし", "n", "", 100, [entry(sense([N], ["chopsticks"]))], 10, "common"],
    ["橋", "はし", "n", "", 100, [entry(sense([N], ["bridge"]))], 11, "common"],
    ["端", "はし", "n", "", 90, [entry(sense([N], ["end (e.g. of a street)", "tip", "point", "edge", "margin"]))], 12, ""],
    ["図書館", "としょかん", "n", "", 100, [entry(sense([N], ["library"]))], 13, "common"],
]

STYLES = """
span[data-sc-content="part-of-speech-info"] { display: inline-block; margin-right: 0.3em; padding: 0 0.35em;
  border-radius: 0.25em; font-size: 0.75em; background-color: #565656; color: #fff; }
div[data-sc-content="example-sentence"] { margin: 0.2em 0 0.3em 0.6em; padding-left: 0.5em; border-left: 3px solid #8c8c8c; }
div[data-sc-content="example-sentence-b"] { font-size: 0.85em; }
ol[data-sc-content="sense-list"] { padding-left: 1.4em; }
ul[data-sc-content="glossary"] { list-style: none; padding-left: 0; }
ul[data-sc-content="glossary"] > li { display: inline; }
ul[data-sc-content="glossary"] > li:not(:first-child)::before { content: "; "; }
"""

write("JMdict (sample)", "jmdict-sample.zip", {
    "index.json": index("JMdict (sample)"),
    "term_bank_1.json": TERMS,
    "tag_bank_1.json": [["v1", "partOfSpeech", 0, "Ichidan verb", 0], ["v5r", "partOfSpeech", 0, "Godan verb", 0],
                        ["vt", "partOfSpeech", 0, "transitive verb", 0], ["vi", "partOfSpeech", 0, "intransitive verb", 0],
                        ["n", "partOfSpeech", 0, "noun", 0], ["vs", "partOfSpeech", 0, "suru verb", 0],
                        ["adv", "partOfSpeech", 0, "adverb", 0], ["common", "popular", 0, "common word", 0]],
    "styles.css": STYLES,
})

MONO = [
    ["冒険", "ぼうけん", "", "", 50, ["危ないと分かっていながら、あえて何かに挑むこと。結果が読めない事柄に、思い切って踏み出すこと。「―心」「―に出る」"], 1, ""],
    ["冒険者", "ぼうけんしゃ", "", "", 50, ["冒険をする人。未知の土地や危険な仕事に、自ら進んで向かう人。"], 2, ""],
    ["食べる", "たべる", "", "", 50, ["①食物を口に入れ、かんで飲みこむ。「朝ご飯を―」②生活する。暮らしを立てる。「筆一本で―・べていく」"], 3, ""],
    ["取る", "とる", "", "", 50, ["①手に持つ。手でつかむ。「本を手に―」②自分のものにする。手に入れる。「資格を―」③必要なものとして確保する。予約する。「席を―」④取り除く。「しみを―」⑤書き記す。写す。「メモを―」⑥受け止めて解釈する。「冗談を本気に―」"], 4, ""],
    ["光", "ひかり", "", "", 50, ["目に明るさを感じさせるもの。太陽や灯火などから出て、物を照らすもの。また、希望や救いのたとえ。"], 5, ""],
]
write("国語 (sample)", "kokugo-sample.zip", {"index.json": index("国語 (sample)"), "term_bank_1.json": MONO})

RANKS = {"食べる": 120, "冒険": 4210, "冒険者": 9870, "取る": 85, "今日": 61, "出発": 2104, "光": 1533,
         "漢字": 3302, "雨": 902, "箸": 6118, "橋": 2875, "端": 4436, "図書館": 3817}
write("Ranks (sample)", "ranks-sample.zip", {
    "index.json": index("Ranks (sample)", frequencyMode="rank-based"),
    "term_meta_bank_1.json": [[word, "freq", {"value": value, "displayValue": str(value)}] for word, value in RANKS.items()],
})
write("Corpus (sample)", "corpus-sample.zip", {
    "index.json": index("Corpus (sample)", frequencyMode="occurrence-based"),
    "term_meta_bank_1.json": [["食べる", "freq", {"value": 18240, "displayValue": "18,240"}],
                              ["取る", "freq", {"value": 30112, "displayValue": "30,112"}],
                              ["冒険", "freq", {"value": 2215, "displayValue": "2,215"}]],
})

READINGS = {"食べる": "たべる", "冒険": "ぼうけん", "取る": "とる", "今日": "きょう", "出発": "しゅっぱつ", "光": "ひかり",
            "漢字": "かんじ", "雨": "あめ", "箸": "はし", "橋": "はし", "端": "はし", "図書館": "としょかん"}
PITCH = {"食べる": 2, "冒険": 0, "取る": 1, "今日": 1, "出発": 0, "光": 3, "漢字": 0, "雨": 1, "箸": 1, "橋": 2, "端": 0, "図書館": 2}
write("Pitch (sample)", "pitch-sample.zip", {
    "index.json": index("Pitch (sample)"),
    "term_meta_bank_1.json": [[word, "pitch", {"reading": READINGS[word], "pitches": [{"position": position}]}]
                              for word, position in PITCH.items()],
})

KANJI = [
    ["食", "ショク ジキ", "く.う た.べる", "jouyou", ["eat", "food"], {"strokes": "9", "grade": "2", "jlpt": "4"}],
    ["冒", "ボウ", "おか.す", "jouyou", ["risk", "face", "defy", "brave"], {"strokes": "9", "grade": "8"}],
    ["険", "ケン", "けわ.しい", "jouyou", ["precipitous", "steep", "inaccessible place"], {"strokes": "11", "grade": "5"}],
    ["取", "シュ", "と.る と.り", "jouyou", ["take", "fetch", "obtain"], {"strokes": "8", "grade": "3"}],
    ["光", "コウ", "ひか.る ひかり", "jouyou", ["ray", "light"], {"strokes": "6", "grade": "2"}],
]
write("KANJIDIC (sample)", "kanjidic-sample.zip", {
    "index.json": index("KANJIDIC (sample)"),
    "kanji_bank_1.json": KANJI,
    "tag_bank_1.json": [["jouyou", "frequent", 0, "included in list of regular-use characters", 0],
                        ["strokes", "misc", 0, "Stroke count", 0], ["grade", "class", 0, "School grade", 0],
                        ["jlpt", "class", 0, "JLPT level", 0]],
})
