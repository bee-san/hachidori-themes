#!/usr/bin/env python3
"""PR preview images: per direction, the real popup for 食べたかった on a light and
a dark page side by side; plus Japanese checks for the chosen theme."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WORK = Path(__file__).resolve().parent.parent
OUT = WORK / "out" / "pr-previews"
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


def save(image, name):
    image.save(OUT / name, optimize=True)
    print(name, image.size, (OUT / name).stat().st_size // 1024, "KiB")


DIRECTIONS = [("ffxiv-dark", "final", "Hairline (chosen)"), ("ffxn-menu", "previews", "Menu"),
              ("ffxn-tooltip", "previews", "Tooltip"), ("ffxn-parchment", "previews", "Parchment")]
for slug, run, title in DIRECTIONS:
    for word, what in [("taberu", "食べたかった"), ("toru", "取る")]:
        tiles = [labelled(Image.open(WORK / "out" / run / f"{slug}--{page}--{word}.png").convert("RGB"), f"{title}: {what} on a {page} page")
                 for page in ["light", "dark"]]
        save(row(tiles), f"{slug.replace('ffxn-', '')}-{word}.png")

final = WORK / "out" / "final"
checks = [("ffxiv-dark--light--toru.png", "取る: ten senses, a long wrapped gloss, light page"),
          ("ffxiv-dark--light--taberu--japanese-tab.png", "Japanese tab: monolingual 国語 text, light page"),
          ("ffxiv-dark--dark--bouken.png", "Ruby furigana in examples, dark page"),
          ("ffxiv-dark--dark--toshokan.png", "図書館: small kana, nakadaka pitch, dark page"),
          ("ffxiv-dark--light--kanji.png", "漢字: structured table, nested list, image, light page"),
          ("ffxiv-dark--dark--kanjiview.png", "Kanji view with Back, dark page")]
rows = [row([labelled(Image.open(final / a).convert("RGB"), b) for a, b in checks[i:i + 2]]) for i in range(0, len(checks), 2)]
sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height - GAP for r in rows) + GAP), (90, 90, 96))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height - GAP
save(sheet, "ffxiv-dark-japanese.png")

pitch = [("hashi1", "箸 はし [1]"), ("hashi2", "橋 はし [2], odaka"), ("hashi3", "端 はし [0]"), ("kyou", "今日 きょう [1]"),
         ("shuppatsu", "出発 しゅっぱつ [0]"), ("toshokan", "図書館 としょかん [2]"), ("hikari", "光 ひかり [3], odaka"),
         ("taberu", "食べる たべる [2]"), ("toru", "取る とる [1]"), ("bouken", "冒険者: no pitch data")]
tiles = []
for word, label in pitch:
    image = Image.open(final / f"ffxiv-dark--dark--{word}--top.png").convert("RGB")
    image = image.crop((0, 0, min(image.width, 330), min(image.height, 44)))
    tiles.append(labelled(image.resize((image.width * 2, image.height * 2), Image.LANCZOS), label))
rows = [row(tiles[index:index + 2]) for index in range(0, len(tiles), 2)]
sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height - GAP for r in rows) + GAP), (90, 90, 96))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height - GAP
save(sheet, "ffxiv-dark-pitch.png")

suite = WORK / "out" / "store-suite-final"
states = [("bee-note.png", "Note editor"), ("bee-readable-300-more.png", "300 px, More actions"),
          ("bee-compact.png", "Compact glossary"), ("bee-forced-dark.png", "Forced colours, dark")]
save(row([labelled(Image.open(suite / a).convert("RGB"), b) for a, b in states]), "ffxiv-dark-states.png")
save(row([labelled(Image.open(final / f"ffxiv-dark--{page}--preview.png").convert("RGB"), f"Design preview sample, {page} page")
          for page in ["light", "dark"]]), "ffxiv-dark-preview.png")
