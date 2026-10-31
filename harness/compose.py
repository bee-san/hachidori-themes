#!/usr/bin/env python3
"""Compose popup screenshots into one sheet (<= 1280 px per side).

usage: compose.py <out.png> <dir> <label> <word> [<word> ...]
Rows are words, columns are the light and dark pages.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

out, directory, label, *words = sys.argv[1:]
pages = ["light", "dark"]
tiles = [[Image.open(f"{directory}/{label}-{page}-{word}.png").convert("RGB") for page in pages] for word in words]
cell_w = max(tile.width for row in tiles for tile in row)
cell_h = [max(tile.height for tile in row) for row in tiles]
pad, caption = 8, 20
width = len(pages) * cell_w + (len(pages) + 1) * pad
height = sum(cell_h) + len(words) * (caption + pad) + pad
sheet = Image.new("RGB", (width, height), (128, 128, 128))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 14)
except OSError:
    font = ImageFont.load_default()
y = pad
for row, word, h in zip(tiles, words, cell_h):
    for column, (tile, page) in enumerate(zip(row, pages)):
        x = pad + column * (cell_w + pad)
        draw.text((x, y), f"{label} / {page} page / {word}", fill=(255, 255, 255), font=font)
        sheet.paste(tile, (x, y + caption))
    y += caption + h + pad
scale = min(1.0, 1280 / max(sheet.width, sheet.height))
if scale < 1:
    sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)), Image.LANCZOS)
sheet.save(out, optimize=True)
print(out, sheet.size)
