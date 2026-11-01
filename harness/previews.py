#!/usr/bin/env python3
"""Build the PR preview sheets from one harness round.

previews.py <round dir> <mock-up png> <output dir>
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

round_dir, mockup, out = sys.argv[1:]
os.makedirs(out, exist_ok=True)
FONT = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "../fonts/NotoSansCJKjp-Regular.otf"), 15)
BACK = (22, 22, 26)


def load(name):
    return Image.open(name if os.path.isabs(name) else os.path.join(round_dir, name)).convert("RGB")


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


save("mockup-comparison", row([("Mock-up: theme idea 2 in #24", load(mockup)),
    ("Citadel in Hachidori's real popup (Chrome 152, 560 × 420, dark page)", load("mockup-dark-2x.png"))], 600))
save("variants", row([("Dark system colour scheme: slate grey", load("mockup-dark-2x.png")),
    ("Light system colour scheme: parchment beige", load("mockup-beige-2x.png"))], 560))
save("light-dark-pages", column([
    row([("Grey on a white page, default 85% opacity", load("taberu-dark-on-light.png")),
        ("Grey on a #1e1e1e page", load("taberu-dark-on-dark.png"))], 470),
    row([("Beige on a white page", load("taberu-light-on-light.png")),
        ("Beige on a #1e1e1e page", load("taberu-light-on-dark.png"))], 470)]))
save("narrow-more-note", row([("300 px, white page, tab focused", load("narrow-dark-on-light-2x.png")),
    ("300 px, More actions", load("narrow-more-dark-on-dark-2x.png")),
    ("300 px, beige", load("narrow-light-on-light-2x.png")),
    ("Note editor, white page", load("note-dark-on-light-2x.png")),
    ("Note editor, beige", load("note-light-on-dark-2x.png"))], 640))
save("long-glosses-nested", row([("取る: ten senses, long glosses (560 × 900)", load("toru-long.png")),
    ("Nested popup from 橋 in a 国語 definition", load("nested-dark.png")),
    ("The same in beige", load("nested-light.png"))], 760))
save("furigana-kanji", row([("の: examples with furigana", load("no-furigana-2x.png")),
    ("Beige", load("no-furigana-beige-2x.png")),
    ("Kanji view, Back focused", load("kanji-back-focus-dark-2x.png")),
    ("Beige", load("kanji-back-focus-light-2x.png"))], 600))
pitch_columns = []
for style in ("contour", "overline"):
    crops = [load(f"pitch-{style}-{word}.png") for word in ("bridge", "chopsticks", "edge", "library", "today", "departure", "light")]
    crops = [crop.crop((0, 0, min(crop.width, 560), crop.height)) for crop in crops]
    pitch_columns.append((f"Reading pitch style: {style}", column(crops, 0)))
save("pitch-styles", row(pitch_columns, 560))
save("forced-colours", row([("Forced colours, dark system palette", load("forced-dark.png")),
    ("Forced colours, light system palette", load("forced-light.png"))], 500))
save("structured-compact-frequency", column([
    row([("Jitendex-style structured content with its own CSS", load("jitendex-like-2x.png")),
        ("Lists, a table and an image", load("fixture-kanji-structured-2x.png"))], 560),
    row([("Compact glossaries", load("compact-2x.png")),
        ("Frequency names, averages and abbreviated numbers", load("frequency-names-average-dark-2x.png")),
        ("Beige", load("frequency-names-average-light-2x.png"))], 560)]))
save("groups-preview", row([("The Japanese group selected", load("group-japanese-2x.png")),
    ("Settings → Design preview, dark", load("design-preview-dark.png")),
    ("Light", load("design-preview-light.png"))], 520))
