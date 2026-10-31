#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Contact sheets (<=1280 px per side) and contrast summaries for harness shots.
usage: sheet.py SHOTDIR OUT.png --themes a,b --scenes x,y --pages light,dark [--cols N] [--label]
       sheet.py SHOTDIR --report   (prints the worst text/border contrasts per shot)"""
import argparse, glob, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("shots"); ap.add_argument("out", nargs="?")
ap.add_argument("--themes", default=""); ap.add_argument("--scenes", default="taberu")
ap.add_argument("--pages", default="light,dark"); ap.add_argument("--suffix", default="")
ap.add_argument("--report", action="store_true"); ap.add_argument("--max", type=int, default=1280)
ap.add_argument("--transpose", action="store_true")
ap.add_argument("--cells", default=""); ap.add_argument("--cols", type=int, default=2)
a = ap.parse_args()

if a.report:
    shots = {}
    for path in sorted(glob.glob(os.path.join(a.shots, "report-*.json"))):
        for shot in json.load(open(path))["shots"]:
            shots[shot["name"]] = shot
    for name, shot in shots.items():
        low = sorted(shot["results"], key=lambda r: min(r["white"], r["black"]))[:3]
        borders = sorted(shot["borders"], key=lambda r: min(r["white"], r["black"]))[:2]
        print(name, "| text:", "; ".join(f'{r["element"]} "{r["text"]}" {min(r["white"], r["black"])}' + (f' img:{r["images"]}' if r["images"] else "") for r in low),
              "| borders:", "; ".join(f'{r["element"]} {min(r["white"], r["black"])}' for r in borders),
              "| focus:", shot.get("focus"))
    raise SystemExit

if a.cells:
    names = a.cells.split(",")
    grid = [names[i:i + a.cols] for i in range(0, len(names), a.cols)]
    cells = [[(Image.open(os.path.join(a.shots, n + ".png")).convert("RGB"), n.replace("__", " ")) for n in line] for line in grid]
    rows, cols = grid, grid[0]
if not a.cells:
  themes, scenes, pages = a.themes.split(","), a.scenes.split(","), a.pages.split(",")
  rows = [(t, p) for t in themes for p in pages]
  cols = scenes
  if a.transpose:
      rows, cols = [(t, None) for t in themes], [(s, p) for s in scenes for p in pages]
  cells = []
  for r in rows:
    line = []
    for c in cols:
        if a.transpose:
            theme, (scene, page) = r[0], c
        else:
            (theme, page), scene = r, c
        path = os.path.join(a.shots, f"{theme}__{scene}__{page}{a.suffix}.png")
        line.append((Image.open(path).convert("RGB") if os.path.exists(path) else Image.new("RGB", (300, 200), "magenta"), f"{theme} {scene} {page}"))
    cells.append(line)
cw = max(img.width for line in cells for img, _ in line); ch = max(img.height for line in cells for img, _ in line)
pad, label = 6, 16
sheet = Image.new("RGB", (len(cols) * (cw + pad) + pad, len(rows) * (ch + label + pad) + pad), (128, 128, 128))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/dejavu/DejaVuSansMono.ttf", 13)
except OSError:
    font = ImageFont.load_default()
for y, line in enumerate(cells):
    for x, (img, text) in enumerate(line):
        ox, oy = pad + x * (cw + pad), pad + y * (ch + label + pad)
        draw.text((ox, oy), text, fill=(255, 255, 255), font=font)
        sheet.paste(img, (ox, oy + label))
scale = min(1.0, a.max / sheet.width, a.max / sheet.height)
if scale < 1:
    sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)), Image.LANCZOS)
sheet.save(a.out)
print(a.out, sheet.size)
