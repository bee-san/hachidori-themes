#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Labelled 2x2 previews for the PR: each direction on the same four renders."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

W = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(W, "previews")
os.makedirs(OUT, exist_ok=True)
font = ImageFont.truetype(os.path.join(W, "fonts/base/NotoSansCJKjp-Regular.otf"), 15)
bold = ImageFont.truetype(os.path.join(W, "fonts/base/NotoSansCJKjp-Bold.otf"), 20)
CELLS = [("taberu", "light", "Light page: 食べたかった (pitch, frequency, two blocks)"),
         ("taberu", "dark", "Dark page: the same lookup"),
         ("no", "dark", "Dark page: の (nested senses, furigana 用例/ようれい)"),
         ("rensa", "light", "Light page: 連鎖語 (four dictionaries, group tabs, links)")]
DIRECTIONS = {
    "pompom-post": ("final/main", "pompom-post", "Pompom Post (chosen)"),
    "chocobo-meadow": ("r3", "fw-chocobo", "Runner-up: Chocobo Meadow"),
    "saucer-marquee": ("r3", "fw-saucer", "Runner-up: Saucer Marquee"),
    "storybook-tale": ("r3", "fw-storybook", "Runner-up: Storybook Tale"),
    "patchwork-plush": ("r3", "fw-plush", "Also explored: Patchwork Plush"),
}
for slug, (folder, theme, title) in DIRECTIONS.items():
    images = [(Image.open(os.path.join(W, "shots", folder, f"{theme}__{scene}__{page}.png")).convert("RGB"), label)
              for scene, page, label in CELLS]
    cw = max(img.width for img, _ in images); ch = max(img.height for img, _ in images)
    pad, head, lab = 8, 34, 22
    sheet = Image.new("RGB", (2 * cw + 3 * pad, head + 2 * (ch + lab + pad) + pad), (96, 96, 96))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 4), title, fill=(255, 255, 255), font=bold)
    for index, (img, label) in enumerate(images):
        x = pad + (index % 2) * (cw + pad); y = head + (index // 2) * (ch + lab + pad)
        draw.text((x, y), label, fill=(255, 255, 255), font=font)
        sheet.paste(img, (x, y + lab))
    scale = min(1, 1240 / sheet.width)
    if scale < 1:
        sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)), Image.LANCZOS)
    path = os.path.join(OUT, f"{slug}.png")
    sheet.save(path, optimize=True)
    print(path, sheet.size, os.path.getsize(path))
