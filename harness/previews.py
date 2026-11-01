#!/usr/bin/env python3
"""Build the PR preview sheets from one harness round per variant.

previews.py <round dir> <auto round dir> <mock-up png> <output dir>
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

round_dir, auto_dir, mockup, out = sys.argv[1:]
os.makedirs(out, exist_ok=True)
FONT = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "../fonts/NotoSansCJKjp-Regular.otf"), 15)
BACK = (22, 22, 26)
VARIANTS = [("grey", "Grey"), ("beige", "Beige"), ("blue", "Retro blue")]


def load(name, base=None):
    path = name if os.path.isabs(name) else os.path.join(base or round_dir, name)
    return Image.open(path).convert("RGB")


def row(items, height, gap=12, band=24):
    """items: [(label, image)] scaled to one height, labelled above."""
    scaled = [(label, image.resize((round(image.width * height / image.height), height), Image.LANCZOS)) for label, image in items]
    width = sum(image.width for _, image in scaled) + gap * (len(scaled) - 1)
    canvas = Image.new("RGB", (width, height + band), BACK)
    draw = ImageDraw.Draw(canvas)
    x = 0
    for label, image in scaled:
        canvas.paste(image, (x, band))
        draw.text((x + 4, 3), label, fill=(232, 232, 232), font=FONT)
        x += image.width + gap
    return canvas


def column(rows, gap=10):
    width = max(image.width for image in rows)
    canvas = Image.new("RGB", (width, sum(image.height for image in rows) + gap * (len(rows) - 1)), BACK)
    y = 0
    for image in rows:
        canvas.paste(image, (0, y))
        y += image.height + gap
    return canvas


def save(name, image):
    scale = min(1.0, 1280 / image.width, 1280 / image.height)
    if scale < 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    path = os.path.join(out, f"{name}.png")
    image.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)
    print(path, image.size, os.path.getsize(path))


def per_variant(file):
    return [(name, load(f"{variant}/{file}")) for variant, name in VARIANTS]


grey, beige, blue = (load(f"{variant}/mockup-dark-2x.png") for variant, _ in VARIANTS)
save("mockup-comparison", column([
    row([("Mock-up: theme idea 5 in #24", load(mockup)), ("Grey (FFXIV Dark), real popup", grey)], 600),
    row([("Beige (FFXIV Light), real popup", beige), ("Retro blue (classic FF window), real popup", blue)], 600)]))
save("light-dark-pages", column([row([(f"{name}, white page, 85% opacity", load(f"{variant}/taberu-light.png")),
    (f"{name}, #1e1e1e page", load(f"{variant}/taberu-dark.png"))], 470) for variant, name in VARIANTS]))
save("automatic", row([("Automatic, system light mode (= Beige)", load("auto-light/taberu-light.png", auto_dir)),
    ("Automatic, system dark mode (= Grey)", load("auto-dark/taberu-dark.png", auto_dir))], 470))
save("narrow-more-note", column([row([(f"{name}: 300 px, white page, tab focused", load(f"{variant}/narrow-light-2x.png")),
    ("300 px, dark page", load(f"{variant}/narrow-dark-2x.png")), ("More actions", load(f"{variant}/narrow-more-2x.png")),
    ("Note editor", load(f"{variant}/note-light-2x.png"))], 560) for variant, name in VARIANTS]))
save("long-glosses-nested", column([
    row([(f"{name}: 取る, ten senses (560 × 900)", image) for name, image in per_variant("toru-long.png")], 760),
    row([(f"{name}: nested popup from 橋", image) for name, image in per_variant("nested.png")], 420)]))
save("furigana-kanji", column([
    row([(f"{name}: の, examples with furigana", image) for name, image in per_variant("no-furigana-2x.png")], 520),
    row([(f"{name}: kanji view, Back focused", image) for name, image in per_variant("kanji-back-focus-2x.png")], 520)]))
pitch_rows = []
for style in ("contour", "overline"):
    columns = []
    for variant, name in VARIANTS:
        crops = [load(f"{variant}/pitch-{style}-{word}.png") for word in ("bridge", "chopsticks", "edge", "library", "today", "departure", "light")]
        crops = [crop.crop((0, 0, min(crop.width, 420), crop.height)) for crop in crops]
        columns.append((f"{name}, {style}", column(crops, 0)))
    pitch_rows.append(row(columns, 430))
save("pitch-styles", column(pitch_rows))
save("forced-colours", row([("Forced colours, dark system palette (all three variants)", load("grey/forced-dark.png")),
    ("Forced colours, light system palette", load("grey/forced-light.png"))], 500))
save("structured-compact-frequency", column([
    row([(f"{name}: Jitendex-style content with its own CSS", image) for name, image in per_variant("jitendex-like-2x.png")], 480),
    row([(f"{name}: compact glossaries", image) for name, image in per_variant("compact-2x.png")], 480),
    row([(f"{name}: frequency names, averages, abbreviated", image) for name, image in per_variant("frequency-names-average-2x.png")], 480)]))
save("design-preview", column([
    row([(f"Design preview, {name}", image) for name, image in per_variant("design-preview.png")], 420),
    row([("Settings → Design → Appearance → Colours", load("auto-light/settings-colours.png", auto_dir))], 300)]))
