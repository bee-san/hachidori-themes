#!/usr/bin/env python3
"""Compose labelled images side by side at one height, at most 1280 px wide.

compose.py out.png height label=path [label=path ...]
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

out, height, *items = sys.argv[1:]
height = int(height)
pairs = [item.split("=", 1) for item in items]
images = []
for label, path in pairs:
    image = Image.open(path).convert("RGB")
    width = round(image.width * height / image.height)
    images.append((label, image.resize((width, height), Image.LANCZOS)))
gap, band = 12, 26
total = sum(image.width for _, image in images) + gap * (len(images) - 1)
scale = min(1.0, 1280 / total)
canvas = Image.new("RGB", (total, height + band), (24, 24, 28))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "../fonts/NotoSansCJKjp-Regular.otf"), 16)
except OSError:
    font = ImageFont.load_default()
x = 0
for label, image in images:
    canvas.paste(image, (x, band))
    draw.text((x + 6, 3), label, fill=(235, 235, 235), font=font)
    x += image.width + gap
if scale < 1:
    canvas = canvas.resize((round(canvas.width * scale), round(canvas.height * scale)), Image.LANCZOS)
canvas.save(out, optimize=True)
print(out, canvas.size)
