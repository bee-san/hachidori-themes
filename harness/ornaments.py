#!/usr/bin/env python3
"""Readable sources for Crystal's inline SVG ornaments.

ornaments.py <theme.css>: rewrites every url("data:image/svg+xml,...") that
follows a /* svg:NAME */ comment with the encoded SVG below.
"""
import re
import sys
from urllib.parse import quote

GOLD = "#e3c27c"
GOLD_DEEP = "#8d6a32"
FRAME_GOLD = "#b8913f"

CORNER = f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'>
<defs><linearGradient id='k' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fbe7ad'/><stop offset='.5' stop-color='#d4ad5f'/><stop offset='1' stop-color='#8a6526'/></linearGradient></defs>
<g fill='none' stroke='url(#k)' stroke-linecap='round' stroke-linejoin='round'>
<path d='M2.4 23V11.4C2.4 6 6 2.4 11.4 2.4H23' stroke-width='2.6'/>
<path d='M6.8 7.2c5-2.6 9.6.6 8.1 4.6-1.2 3.2-5.4 3-5.8.2-.3-1.9 1.5-3 3-2.2' stroke-width='2'/>
<path d='M13 5.2c4.4-1.4 8.6.4 14-1.1M5.2 13c-1.4 4.4.4 8.6-1.1 14' stroke-width='1.3'/>
</g>
<circle cx='27.6' cy='3.9' r='1.3' fill='#e9c97f'/><circle cx='3.9' cy='27.6' r='1.3' fill='#e9c97f'/>
</svg>"""


def mirrored(svg, matrix, size=30):
    body = svg.split(">", 1)[1].rsplit("</svg>", 1)[0]
    head = svg.split(">", 1)[0] + ">"
    return f"{head}<g transform='matrix({matrix})'>{body}</g></svg>"


def wing_path(outline, lines):
    return f"""<path d='M96.6 15.2C88 8.6 76 5.2 60 4.6L36 3.8C52 7 66 8.8 76.6 12.6 72.2 13.6 68.6 16.6 67.4 20.6 71.6 17.4 77.2 16.2 83.4 17.4L80.4 23.6C86.8 20.8 92 20.6 96.6 21.4Z' fill='url(#b)' stroke='{outline}' stroke-width='.7' stroke-linejoin='round'/>
<path d='M94 13.6C86 9.4 75 7.2 61 6.8' fill='none' stroke='{lines[0]}' stroke-width='.8' stroke-linecap='round' stroke-opacity='.75'/>
<path d='M60.4 9.4c-3.6.6-5.4 3.6-3.6 5.8 1.4 1.7 3.8.8 3.6-1.2' fill='none' stroke='{lines[1]}' stroke-width='1.2' stroke-linecap='round'/>
<path d='M52 6.4c-5.6 2-10.8 2-16 .6' fill='none' stroke='{lines[2]}' stroke-width='1' stroke-linecap='round'/>"""

def crest(wing, mount, outline, wing_lines):
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 48'>
<defs>
<linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='{wing[0]}'/><stop offset='.45' stop-color='{wing[1]}'/><stop offset='1' stop-color='{wing[2]}'/></linearGradient>
<linearGradient id='r' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='{mount[0]}'/><stop offset='.5' stop-color='{mount[1]}'/><stop offset='1' stop-color='{mount[2]}'/></linearGradient>
<linearGradient id='c' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f0fbff'/><stop offset='.35' stop-color='#5fc0ff'/><stop offset='.7' stop-color='#1d6fd6'/><stop offset='1' stop-color='#0b2f78'/></linearGradient>
<radialGradient id='h'><stop offset='0' stop-color='#7cc8ff' stop-opacity='.65'/><stop offset='.55' stop-color='#4aa3ff' stop-opacity='.2'/><stop offset='1' stop-color='#4aa3ff' stop-opacity='0'/></radialGradient>
<g id='w'>{wing_path(outline, wing_lines)}</g>
</defs>
<ellipse cx='110' cy='21' rx='30' ry='25' fill='url(#h)'/>
<use href='#w'/><use href='#w' transform='matrix(-1 0 0 1 220 0)'/>
<path d='M110 .8 124.4 18.4 110 47.2 95.6 18.4Z' fill='url(#r)' stroke='{outline}' stroke-width='.7' stroke-linejoin='round'/>
<path d='M110 4.4 121 18.4 110 42.6 99 18.4Z' fill='url(#c)'/>
<path d='M110 4.4 99 18.4 110 42.6Z' fill='#0a2a66' fill-opacity='.35'/>
<path d='M99 18.4h22M110 4.4l-3.8 14L110 42.6l3.8-24.2L110 4.4' fill='none' stroke='#d5f1ff' stroke-width='.6' stroke-opacity='.8'/>
<path d='M108.4 7.6 102.6 17h4Z' fill='#fff' fill-opacity='.92'/>
<path d='M112.4 21 110.4 35.4l3.6-13.4Z' fill='#fff' fill-opacity='.4'/>
</svg>"""


CREST = crest(("#fbe6a8", "#d9b263", "#7c5a20"), ("#fff1c4", "#d4ab5c", "#87631f"), "#6e4f1c", ("#fff3cf", "#e3c27c", "#c9a14f"))
CREST_SILVER = crest(("#ffffff", "#cfd6e4", "#6b7794"), ("#ffffff", "#c3cbdc", "#5f6a88"), "#2e3858", ("#ffffff", "#e8ecf4", "#b9c2d6"))

BRACKET = f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'>
<g fill='none' stroke='{FRAME_GOLD}' stroke-linecap='round'>
<path d='M1.2 11V5.2Q1.2 1.2 5.2 1.2H11' stroke-width='1.2'/>
<path d='M4.2 4.4c2.2-.7 3.9 1 3 2.6-.6 1-2 .9-2.1-.1' stroke-width='.9'/>
</g></svg>"""

NODE = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9'><path d='M4.5 1 8 4.5 4.5 8 1 4.5Z'/></svg>"""

SEPARATOR = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'><path d='M6 1 10 5 6 9 2 5Z'/></svg>"""

def plaque(fill, outline, inner):
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 26'>
<defs><linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='{fill[0]}'/><stop offset='.5' stop-color='{fill[1]}'/><stop offset='1' stop-color='{fill[2]}'/></linearGradient></defs>
<path d='M4.5 1.5H28L38.5 13 28 24.5H4.5L1.5 21.5V4.5Z' fill='url(#p)' stroke='{outline}' stroke-width='1.3' stroke-linejoin='round'/>
<path d='M5.5 3.6H27L35.6 13 27 22.4H5.5L3.6 20.5V5.5Z' fill='none' stroke='{inner}' stroke-width='.7'/>
</svg>"""


PLAQUE = plaque(("#5c4520", "#402f13", "#302209"), GOLD, "#a07a3a")
PLAQUE_BLUE = plaque(("#2c4cb4", "#1c3388", "#101f62"), "#e8edf7", "#8d9cc6")

def gem(rim):
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 16'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e9f8ff'/><stop offset='.45' stop-color='#53b6ff'/><stop offset='1' stop-color='#123e8e'/></linearGradient></defs>
<path d='M6.5 1 12 8 6.5 15 1 8Z' fill='url(#g)' stroke='{rim}' stroke-width='1.1' stroke-linejoin='round'/>
<path d='M6.5 1 1 8 6.5 15Z' fill='#0d2f6e' fill-opacity='.35'/>
<path d='M5.6 3.4 3.2 7.4h1.8Z' fill='#fff' fill-opacity='.85'/>
</svg>"""


GEM = gem("#efd394")
GEM_SILVER = gem("#eef1f8")

def diamond(stroke, inner):
    return f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'>
<path d='M15 1.5 28.5 15 15 28.5 1.5 15Z' fill='#000' fill-opacity='.14' stroke='{stroke}' stroke-width='1.3' stroke-linejoin='round'/>
<path d='M15 4.6 25.4 15 15 25.4 4.6 15Z' fill='none' stroke='{inner}' stroke-width='.7'/>
</svg>"""


DIAMOND = diamond(FRAME_GOLD, GOLD_DEEP)
DIAMOND_SILVER = diamond("#e6ebf5", "#8a98c0")

STAR = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M8 1.2l2 4.3 4.7.6-3.4 3.2.9 4.7L8 11.7 3.8 14l.9-4.7L1.3 6.1 6 5.5Z'/></svg>"""

BOOK = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M1 3.2C3.4 2.4 5.8 2.6 7.5 4v9.6C5.8 12.3 3.4 12.1 1 12.9Z M15 3.2c-2.4-.8-4.8-.6-6.5.8v9.6c1.7-1.3 4.1-1.5 6.5-.7Z'/></svg>"""

# Faint speckle so the navy reads as a surface rather than a flat fill.
GRAIN = """<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/>
<feColorMatrix values='0 0 0 0 .5 0 0 0 0 .47 0 0 0 0 .43 0 0 0 .07 0'/></filter>
<rect width='160' height='160' filter='url(#n)'/></svg>"""

SVGS = {
    "corner-tl": CORNER,
    "corner-tr": mirrored(CORNER, "-1 0 0 1 30 0"),
    "corner-bl": mirrored(CORNER, "1 0 0 -1 0 30"),
    "corner-br": mirrored(CORNER, "-1 0 0 -1 30 30"),
    "crest": CREST,
    "crest-silver": CREST_SILVER,
    "bracket-tl": BRACKET,
    "bracket-tr": mirrored(BRACKET, "-1 0 0 1 12 0"),
    "bracket-bl": mirrored(BRACKET, "1 0 0 -1 0 12"),
    "bracket-br": mirrored(BRACKET, "-1 0 0 -1 12 12"),
    "node": NODE,
    "separator": SEPARATOR,
    "plaque": PLAQUE,
    "plaque-blue": PLAQUE_BLUE,
    "gem": GEM,
    "gem-silver": GEM_SILVER,
    "diamond": DIAMOND,
    "diamond-silver": DIAMOND_SILVER,
    "star": STAR,
    "book": BOOK,
    "grain": GRAIN,
}


def encode(svg):
    compact = re.sub(r"\s*\n\s*", "", svg.strip())
    return 'url("data:image/svg+xml,' + quote(compact, safe=" /=:;,.'()-+") + '")'


def main(path):
    css = open(path, encoding="utf-8").read()
    pattern = re.compile(r'/\* svg:([a-z-]+) \*/ url\("data:image/svg\+xml,[^"]*"\)')
    used = set()

    def replace(match):
        name = match.group(1)
        used.add(name)
        return f"/* svg:{name} */ {encode(SVGS[name])}"

    css, count = pattern.subn(replace, css)
    open(path, "w", encoding="utf-8").write(css)
    print(f"{count} ornaments, unused: {sorted(set(SVGS) - used)}")


if __name__ == "__main__":
    main(sys.argv[1])
