#!/usr/bin/env python3
"""Readable sources of Grimoire's inline SVG ornaments.

python3 ornaments.py path/to/themes/grimoire/theme.css

Rewrites the url() that follows each `/* svg:NAME */` marker in the stylesheet
with the encoded SVG below. Edit an SVG here, then run this script.
"""
import re
import sys
from urllib.parse import quote

SVG = {
    # Frequency badges (masks): an open book for corpus counts, crossed swords for ranks.
    "book": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>
<path d='M7.3 3.5C5.8 2.5 3.8 2.1 1 2.2v10.5c2.7-.1 4.7.4 6.3 1.4Z'/>
<path d='M8.7 3.5c1.5-1 3.5-1.4 6.3-1.3v10.5c-2.7-.1-4.7.4-6.3 1.4Z'/>
</svg>""",
    "swords": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-linecap='round'>
<path d='M2.4 2.4 10.5 10.5M13.6 2.4 5.5 10.5' stroke-width='1.6'/>
<path d='M8.9 11.9 11.9 8.9M4.1 8.9 7.1 11.9' stroke-width='1.5'/>
<path d='M11.1 11.1 13.6 13.6M4.9 11.1 2.4 13.6' stroke-width='2.1'/>
</svg>""",
    # Sense numbers sit in a grey diamond with a gold rim.
    "diamond": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
<path d='M12 1.2 22.8 12 12 22.8 1.2 12Z' fill='#2b2e34' stroke='#c9a55b' stroke-width='1.4' stroke-linejoin='round'/>
<path d='M12 3.9 20.1 12 12 20.1 3.9 12Z' fill='none' stroke='#8b6a34' stroke-width='.7'/>
</svg>""",
    # Between entries: a gold-rimmed diamond holding a small blue crystal.
    "divider": """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'>
<path d='M6 .8 11.2 6 6 11.2.8 6Z' fill='#25272c' stroke='#d9b866' stroke-width='1.1' stroke-linejoin='round'/>
<path d='M6 3.4 8.6 6 6 8.6 3.4 6Z' fill='#64c7f4'/>
</svg>""",
}


def encode(svg):
    compact = " ".join(line.strip() for line in svg.strip().splitlines())
    compact = compact.replace("> <", "><")
    return "data:image/svg+xml," + quote(compact, safe=" /=:',.-()")


def main(path):
    css = open(path, encoding="utf-8").read()
    pattern = re.compile(r'/\* svg:([\w-]+) \*/ url\("[^"]*"\)')
    missing = set()

    def replace(match):
        name = match.group(1)
        if name not in SVG:
            missing.add(name)
            return match.group(0)
        return f'/* svg:{name} */ url("{encode(SVG[name])}")'

    updated, count = pattern.subn(replace, css)
    if missing:
        sys.exit(f"unknown ornaments: {', '.join(sorted(missing))}")
    open(path, "w", encoding="utf-8").write(updated)
    print(f"{path}: {count} ornaments")


if __name__ == "__main__":
    main(sys.argv[1])
