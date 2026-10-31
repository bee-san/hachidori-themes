#!/usr/bin/env python3
"""Build candidate stylesheets: Bee's shipped CSS with a palette swap, then a
direction's detail block. `svg:NAME` inside url("...") becomes a data URI.

usage: make_candidates.py <direction> [...]
"""
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote

W = Path(os.environ["TFB_WORK"])
BEE = W / "hachidori/extension/vendor/themes/bee/theme.css"
DIRECTIONS = W / "harness/directions"
OUT = W / "candidates"

# Bee's literal colours and the role each one plays.
BEE_ROLES = {
    "#95618c": "border", "#6442aa": "accent2", "#9a236c": "accent", "#fbe9f5": "surface",
    "#f2d6ec": "control", "#4a2442": "text", "#fff7fc": "bg", "#665064": "muted",
    "#9f2850": "danger", "#5f3ba4": "focus", "#754805": "freq",
}


def svg_uri(markup: str) -> str:
    markup = re.sub(r"\s+", " ", markup.strip()).replace("> <", "><")
    return "data:image/svg+xml," + quote(markup, safe=" =:/;,'()-.")


def build(name: str) -> Path:
    source = (DIRECTIONS / f"{name}.css").read_text()
    palette = dict(re.findall(r"^\s*--pal-(\w+):\s*(#[0-9a-fA-F]{6})\s*;", source, re.M))
    missing = set(BEE_ROLES.values()) - palette.keys()
    if missing:
        raise SystemExit(f"{name}: palette lacks {sorted(missing)}")
    css = BEE.read_text()
    css = re.sub(r"#[0-9a-fA-F]{6}\b", lambda m: palette[BEE_ROLES[m.group(0).lower()]] if m.group(0).lower() in BEE_ROLES else m.group(0), css)
    css = css.replace("rgba(74, 36, 66, 0.28)", palette.get("shadow_rgba", "rgba(0, 0, 0, 0.45)"))
    scheme = re.search(r"^\s*--pal-scheme:\s*(light|dark)\s*;", source, re.M)
    css = css.replace("color-scheme: light;", f"color-scheme: {scheme.group(1) if scheme else 'light'};", 1)
    svgs = {}
    for match in re.finditer(r"/\*\s*svg ([\w-]+)\s*\n(.*?)\*/", source, re.S):
        svgs[match.group(1)] = svg_uri(match.group(2))
    detail = re.sub(r"/\*\s*svg [\w-]+\s*\n.*?\*/\n?", "", source, flags=re.S)
    detail = re.sub(r'url\("svg:([\w-]+)"\)', lambda m: f'url("{svgs[m.group(1)]}")', detail)
    marker = "\n/* Shared glossary media styling from Hachidori. */"
    head, tail = css.split(marker, 1)
    OUT.mkdir(exist_ok=True)
    path = OUT / f"{name}.css"
    path.write_text(f"{head}\n{detail.strip()}\n{marker}{tail}")
    return path


for direction in sys.argv[1:]:
    print(build(direction))
