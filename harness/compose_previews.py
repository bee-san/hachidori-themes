#!/usr/bin/env python3
"""Compose PR preview images from harness renders: light and dark pages side by
side, captioned. Writes into previews/images/."""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W = Path(os.environ["TFB_WORK"])
CMP = W / "renders/cmp"
STORE = W / "renders/store-pr"
OUT = W / "previews/images"
OUT.mkdir(parents=True, exist_ok=True)
FONT = ImageFont.truetype(str(W / "fonts/NotoSansCJKjp-Regular.otf"), 15)
BG = (64, 64, 70)


def compose(cells, out, columns=2, scale=1.0):
    """cells: list of (caption, image path, optional crop height)."""
    tiles = []
    for caption, path, height in cells:
        image = Image.open(path).convert("RGB")
        if height:
            image = image.crop((0, 0, image.width, min(height, image.height)))
        if scale != 1.0:
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        tiles.append((caption, image))
    pad, cap = 8, 24
    rows = [tiles[index:index + columns] for index in range(0, len(tiles), columns)]
    width = pad + max(sum(image.width + pad for _, image in row) for row in rows)
    height = pad + sum(cap + max(image.height for _, image in row) + pad for row in rows)
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    y = pad
    for row in rows:
        x = pad
        for caption, image in row:
            draw.text((x + 2, y + 2), caption, fill=(240, 240, 240), font=FONT)
            sheet.paste(image, (x, y + cap))
            x += image.width + pad
        y += cap + max(image.height for _, image in row) + pad
    sheet.save(OUT / out, optimize=True)
    print(OUT / out, sheet.size)


TITLES = {"aetheryte": "Aetheryte (chosen)", "dutyfinder": "Duty Finder", "tooltip": "Item Tooltip", "parchment": "Parchment"}
for slug, title in TITLES.items():
    compose([(f"{title}: 食べたかった on a light page", CMP / f"{slug}-light-taberu.png", None),
             (f"{title}: 食べたかった on a dark page", CMP / f"{slug}-dark-taberu.png", None)], f"{slug}-taberu.png")
    compose([(f"{title}: の (nested senses, 用例 furigana), light page", CMP / f"{slug}-light-no.png", None),
             (f"{title}: 結晶 (furigana in a gloss), dark page", CMP / f"{slug}-dark-kesshou.png", None),
             (f"{title}: 冒険者 (long gloss, example), light page", CMP / f"{slug}-light-bouken.png", None),
             (f"{title}: 漢字 (table, image, 24 senses), dark page", CMP / f"{slug}-dark-kanji.png", None)],
            f"{slug}-japanese.png", scale=0.8)
compose([("Personal dictionary editor", STORE / "bee-note.png", None),
         ("300 px wide, More actions open", STORE / "bee-readable-300-more.png", None),
         ("Kanji view with Back", STORE / "bee-kanji-rich.png", None),
         ("Compact glossary layout", STORE / "bee-compact.png", None),
         ("Forced colours, dark", STORE / "bee-forced-dark.png", None),
         ("Forced colours, light", STORE / "bee-forced-light.png", None)], "aetheryte-states.png", columns=3, scale=0.7)
