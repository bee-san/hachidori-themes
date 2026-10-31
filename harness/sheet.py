#!/usr/bin/env python3
"""Labelled contact sheet: sheet.py OUT.png COLS "label=path" ... (max 1280 px per side)."""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols, *items = sys.argv[1:]
cols = int(cols)
tiles = []
for item in items:
    label, path = item.split("=", 1)
    tiles.append((label, Image.open(path).convert("RGB")))
cell_w = max(image.width for _, image in tiles)
cell_h = max(image.height for _, image in tiles) + 22
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (cell_w + 8) + 8, rows * (cell_h + 8) + 8), (128, 128, 128))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 15)
except OSError:
    font = ImageFont.load_default()
for index, (label, image) in enumerate(tiles):
    x = 8 + (index % cols) * (cell_w + 8)
    y = 8 + (index // cols) * (cell_h + 8)
    draw.rectangle([x, y, x + cell_w, y + 20], fill=(30, 30, 30))
    draw.text((x + 6, y + 1), label, fill=(255, 220, 120), font=font)
    sheet.paste(image, (x, y + 22))
sheet.thumbnail((1280, 1280), Image.LANCZOS)
sheet.save(out)
print(out, sheet.size)
