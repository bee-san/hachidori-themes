#!/usr/bin/env python3
"""PR #23 v2 preview images: per direction, the real popup for 食べたかった (and 取る)
on a light and a dark page side by side; plus Japanese, pitch, state, preview,
font-fallback and nested/narrow checks for the chosen theme."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WORK = Path(__file__).resolve().parent.parent
PR2 = WORK / "out" / "pr3"
OUT = PR2 / "images"
OUT.mkdir(parents=True, exist_ok=True)
FONT = ImageFont.truetype(str(WORK / "fonts" / "NotoSansJP[wght].ttf"), 15)
FONT.set_variation_by_axes([450])
BAR, GAP = 24, 8


def labelled(image, label):
    tile = Image.new("RGB", (image.width, image.height + BAR), (34, 34, 38))
    ImageDraw.Draw(tile).text((8, 3), label, fill=(238, 226, 196), font=FONT)
    tile.paste(image, (0, BAR))
    return tile


def row(tiles, background=(90, 90, 96)):
    width = sum(tile.width for tile in tiles) + GAP * (len(tiles) + 1)
    height = max(tile.height for tile in tiles) + 2 * GAP
    canvas = Image.new("RGB", (width, height), background)
    x = GAP
    for tile in tiles:
        canvas.paste(tile, (x, GAP))
        x += tile.width + GAP
    return canvas


def stack(rows):
    sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height - GAP for r in rows) + GAP), (90, 90, 96))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y)); y += r.height - GAP
    return sheet


def save(image, name):
    image.save(OUT / name, optimize=True)
    print(name, image.size, (OUT / name).stat().st_size // 1024, "KiB")


def shot(run, name):
    return Image.open(PR2 / run / name).convert("RGB")


DIRECTIONS = [("ffxiv-dark", "dark", "Chosen: Crystal frame in the game's Dark colours"),
              ("xiv2-crystal", "crystal-navy", "A. Crystal in navy, as mockups 4 and 5"),
              ("xiv2-ornate", "ornate", "B. Ornate (mockup 3)"),
              ("xiv2-banner", "banner", "C. Banner (mockup 2)"),
              ("xiv2-tome", "tome", "D. Tome (mockup 1)")]
for slug, short, title in DIRECTIONS:
    for word, what in [("taberu", "食べたかった"), ("toru", "取る")]:
        tiles = [labelled(shot("cmp", f"{slug}--{page}--{word}.png"), f"{title}: {what}, {page} page") for page in ["light", "dark"]]
        save(row(tiles), f"v2-{short}-{word}.png")

checks = [("ffxiv-dark--light--toru.png", "取る: ten senses, long wrapped glosses, light page"),
          ("ffxiv-dark--light--taberu--japanese-tab.png", "Japanese tab: monolingual 国語 text, light page"),
          ("ffxiv-dark--dark--bouken.png", "Ruby furigana in examples, dark page"),
          ("ffxiv-dark--dark--toshokan.png", "図書館: small kana, nakadaka pitch, dark page"),
          ("ffxiv-dark--light--kanji.png", "漢字: structured table, nested list, image, light page"),
          ("ffxiv-dark--dark--kanjiview.png", "Kanji view with Back, dark page")]
save(stack([row([labelled(shot("final", a), b) for a, b in checks[i:i + 2]]) for i in range(0, len(checks), 2)]), "v2-japanese.png")

pitch = [("hashi1", "箸 はし [1]"), ("hashi2", "橋 はし [2], odaka"), ("hashi3", "端 はし [0]"), ("kyou", "今日 きょう [1]"),
         ("shuppatsu", "出発 しゅっぱつ [0]"), ("toshokan", "図書館 としょかん [2]"), ("hikari", "光 ひかり [3], odaka"),
         ("taberu", "食べる たべる [2]"), ("toru", "取る とる [1]"), ("bouken", "冒険者: no pitch data")]
tiles = []
for word, label in pitch:
    image = shot("final", f"ffxiv-dark--dark--{word}--top.png")
    image = image.crop((0, 0, min(image.width, 330), min(image.height, 44)))
    tiles.append(labelled(image.resize((image.width * 2, image.height * 2), Image.LANCZOS), label))
save(stack([row(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]), "v2-pitch.png")

states = [("bee-note.png", "Note editor"), ("bee-readable-300-more.png", "300 px, More actions"),
          ("bee-compact.png", "Compact glossary"), ("bee-forced-dark.png", "Forced colours, dark")]
save(row([labelled(shot("store", a), b) for a, b in states]), "v2-states.png")
save(row([labelled(shot("final", f"ffxiv-dark--{page}--preview.png"), f"Design preview sample, {page} page") for page in ["light", "dark"]]),
     "v2-preview.png")
save(row([labelled(shot("fallback", f"ffxiv-dark--{page}--taberu.png"), f"Without Cinzel (Noto Serif small caps), {page} page")
          for page in ["light", "dark"]]), "v2-fallback.png")
save(row([labelled(shot("nested", "ffxiv-dark--dark--taberu--nested.png"), "Nested popup with its close button, dark page"),
          labelled(shot("w300", "ffxiv-dark--light--taberu.png"), "300 px wide, light page")]), "v2-nested-300.png")
