#!/usr/bin/env python3
"""Readable sources for Citadel's inline SVG ornaments.

ornaments.py <theme.css>: rewrites every url("data:image/svg+xml,...") that
follows a /* svg:NAME */ comment with the encoded SVG below.
"""
import re
import sys
from urllib.parse import quote

# The crystal on its gold mount, centred at the top of the frame. The frame's
# top line runs at y 3-5 in this box; the mount's bar lies along it.
CREST = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 34'>
<defs>
<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f8e6ad'/><stop offset='.55' stop-color='#d3ac5c'/><stop offset='1' stop-color='#8f6a2c'/></linearGradient>
</defs>
<g fill='url(#g)' stroke='#3d2c10' stroke-width='.5' stroke-linejoin='round'>
<path d='M50 2.3C40 2.5 26 2.9 11 3.5C8 3.6 5.6 3.1 3.6 1.6C4.2 4.2 6.8 5.7 11 5.7C26 5.7 40 6.1 50 7.2Z'/>
<path d='M50 2.3C60 2.5 74 2.9 89 3.5C92 3.6 94.4 3.1 96.4 1.6C95.8 4.2 93.2 5.7 89 5.7C74 5.7 60 6.1 50 7.2Z'/>
<path d='M40.6 5.4C40.6 12.6 44.6 18.2 50 21C55.4 18.2 59.4 12.6 59.4 5.4L56.8 5.4C56.8 11.2 54 15.4 50 17.6C46 15.4 43.2 11.2 43.2 5.4Z'/>
</g>
<path d='M50 1L57 11.2L50 31.5L43 11.2Z' fill='#2f7fc4' stroke='#0a2a4a' stroke-width='.8' stroke-linejoin='round'/>
<path d='M50 1L43 11.2L50 13Z' fill='#dff5ff'/>
<path d='M50 1L57 11.2L50 13Z' fill='#8bcff7'/>
<path d='M43 11.2L50 13L50 31.5Z' fill='#4b9de2'/>
<path d='M57 11.2L50 13L50 31.5Z' fill='#1d5c9c'/>
<path d='M46.6 6.2L48.2 4L46.8 9.6Z' fill='#ffffff' opacity='.9'/>
</svg>"""

# A small diamond with a smaller one either side, laid over the section rule.
RULE = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 10'>
<path d='M22 .6L26.4 5L22 9.4L17.6 5Z'/>
<path d='M13.4 3L15.4 5L13.4 7L11.4 5Z'/>
<path d='M30.6 3L32.6 5L30.6 7L28.6 5Z'/>
</svg>"""

# An open book, drawn as a mask in the accent colour.
BOOK = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 14' fill='none' stroke='#000' stroke-linejoin='round' stroke-linecap='round'>
<path d='M9 2.6C7.2 1.3 4.7.9 1.3 1.3V11.8C4.7 11.4 7.2 11.8 9 13.1C10.8 11.8 13.3 11.4 16.7 11.8V1.3C13.3.9 10.8 1.3 9 2.6Z' stroke-width='1.4'/>
<path d='M9 2.6V13.1' stroke-width='1.2'/>
<path d='M3.4 4.3C4.8 4.2 6 4.4 7 4.9M3.4 6.7C4.8 6.6 6 6.8 7 7.3M11 4.9C12 4.4 13.2 4.2 14.6 4.3M11 7.3C12 6.8 13.2 6.6 14.6 6.7' stroke-width='.9'/>
</svg>"""

SVGS = {"crest": CREST, "rule": RULE, "book": BOOK}


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
