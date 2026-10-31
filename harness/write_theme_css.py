#!/usr/bin/env python3
"""Write themes/ffxiv-aetheryte/theme.css from the final candidate: Bee's shipped
stylesheet with the palette swapped, free font stacks and the details block."""
import os
import re
from pathlib import Path

W = Path(os.environ["TFB_WORK"])
source = (W / "candidates/final3.css").read_text()
target = Path(os.environ["TFB_REPO"]) / "themes/ffxiv-aetheryte/theme.css"


def replace(text: str, old: str, new: str, count: int = 1) -> str:
    assert text.count(old) == count, (old, text.count(old))
    return text.replace(old, new)


css = source
css = replace(css, """/* Independent JL layout; Default reader.css is never loaded beneath it.
 * Sizes and spacing follow JL's defaults in rampaa/JL (Apache-2.0,
 * see ATTRIBUTION.md): ConfigManager.cs, PopupContentGenerator.cs, PopupWindow.
 * SPDX-License-Identifier: GPL-3.0-or-later */""", """/* FFXIV Aetheryte: an unofficial fan theme inspired by FINAL FANTASY XIV's
 * windows, on Bee's Theme's direct renderer. Default reader.css is never loaded
 * beneath it. Layout, sizes and spacing come from Bee's stylesheet, which
 * follows JL's defaults in rampaa/JL (Apache-2.0, see ATTRIBUTION.md):
 * ConfigManager.cs, PopupContentGenerator.cs, PopupWindow. Colours, fonts, the
 * frame and its ornaments are original CSS; no game assets are used.
 * SPDX-License-Identifier: GPL-3.0-or-later */""")
css = replace(css, """  /* Meiryo's Latin letters are Verdana's, so Verdana keeps JL's look without Meiryo. */
  font: 17px/1.5 Meiryo, Verdana, "Noto Sans CJK JP", "Noto Sans JP", sans-serif; text-align: left; white-space: normal;""",
              """  /* Only freely licensed fonts are named; without them the system's sans-serif is used. */
  font: 16px/1.55 "Noto Sans", "Noto Sans CJK JP", "Noto Sans JP", "Source Han Sans JP", sans-serif; text-align: left; white-space: normal;""")
css = replace(css, """font: 16px/20px "Meiryo UI", Meiryo, Verdana, sans-serif;""", """font: 16px/20px "Noto Sans", sans-serif;""")
css = replace(css, """/* Girlypop's blush, magenta and violet palette, darkened where text contrast needs it. */""",
              """/* Midnight crystal glass with gilt trim and crystal-blue accents. Every text colour
 * keeps WCAG AA over white and black pages at the default opacity. */""")
css = replace(css, "--font-size-no-units: 17; --line-height: 1.5;", "--font-size-no-units: 16; --line-height: 1.55;")
# The candidate's palette notes, and the font override the base rule now carries.
css = re.sub(r"/\* Final direction: Aetheryte\.\npalette\n.*?\*/\n", "", css, flags=re.S)
css = replace(css, """  border-radius: 9px;
  font: 16px/1.55 "Noto Sans", "Noto Sans CJK JP", "Noto Sans JP", "Source Han Sans JP", sans-serif;
""", """  border-radius: 9px;
""")
css = replace(css, """.gsm-hoshidicts-popup .gsm-hoshidicts-popup-close { margin-right: 14px; font-family: "Noto Sans", sans-serif; }""",
              """.jl-nav > .gsm-hoshidicts-popup-close { margin-right: 14px; }""")
for name in ["Meiryo", "Verdana", "Girlypop", "--pal-", "svg:"]:
    assert name not in css, name
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(css)
print(target, len(css.splitlines()), "lines")
