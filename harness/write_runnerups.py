#!/usr/bin/env python3
"""Write the runner-up directions as complete drop-in theme.css files for Bee's
renderer, with the same clean-up the chosen theme gets (header, free fonts)."""
import os
import re
from pathlib import Path

W = Path(os.environ["TFB_WORK"])
OUT = W / "previews/css"
NAMES = {"dutyfinder": "Duty Finder", "tooltip": "Item Tooltip", "parchment": "Parchment"}


def replace(text: str, old: str, new: str) -> str:
    assert text.count(old) == 1, (old, text.count(old))
    return text.replace(old, new)


OUT.mkdir(parents=True, exist_ok=True)
for slug, title in NAMES.items():
    css = (W / f"candidates/{slug}.css").read_text()
    css = replace(css, """/* Independent JL layout; Default reader.css is never loaded beneath it.
 * Sizes and spacing follow JL's defaults in rampaa/JL (Apache-2.0,
 * see ATTRIBUTION.md): ConfigManager.cs, PopupContentGenerator.cs, PopupWindow.
 * SPDX-License-Identifier: GPL-3.0-or-later */""", f"""/* FFXIV {title}: a runner-up direction for the "in between" FFXIV theme, kept
 * for review. A complete drop-in theme.css for Bee's Theme's direct renderer
 * (createView(options, true) from ../jl/theme.js). Layout, sizes and spacing come
 * from Bee's stylesheet, which follows JL's defaults in rampaa/JL (Apache-2.0):
 * ConfigManager.cs, PopupContentGenerator.cs, PopupWindow. Unofficial fan work
 * inspired by FINAL FANTASY XIV; colours and ornaments are original CSS/SVG and
 * no game assets are used.
 * SPDX-License-Identifier: GPL-3.0-or-later */""")
    css = replace(css, """  /* Meiryo's Latin letters are Verdana's, so Verdana keeps JL's look without Meiryo. */
  font: 17px/1.5 Meiryo, Verdana, "Noto Sans CJK JP", "Noto Sans JP", sans-serif; text-align: left; white-space: normal;""",
                  """  /* Only freely licensed fonts are named; without them the system's sans-serif is used. */
  font: 16px/1.55 "Noto Sans", "Noto Sans CJK JP", "Noto Sans JP", "Source Han Sans JP", sans-serif; text-align: left; white-space: normal;""")
    css = replace(css, """font: 16px/20px "Meiryo UI", Meiryo, Verdana, sans-serif;""", """font: 16px/20px "Noto Sans", sans-serif;""")
    css = replace(css, "/* Girlypop's blush, magenta and violet palette, darkened where text contrast needs it. */",
                  f"/* {title} palette. */")
    # The direction's palette notes were inputs to the generator, not CSS.
    css, count = re.subn(r"\npalette\n(?:  --pal-[\w]+: [^\n]+\n)+\*/", "\n */", css)
    assert count == 1, (slug, count)
    for name in ["Meiryo", "Verdana", "Girlypop", "--pal-", "svg:"]:
        assert name not in css, (slug, name)
    (OUT / f"ffxiv-{slug}.css").write_text(css)
    print(OUT / f"ffxiv-{slug}.css", len(css.splitlines()), "lines")
