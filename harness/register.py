#!/usr/bin/env python3
"""Assemble candidate stylesheets and register them in the local Hachidori
clone (uncommitted, never pushed) so the real extension can render them.

Each candidate is Bee's renderer (`createView(options, true)` from
../jl/theme.js) plus one assembled stylesheet: header + base + direction +
forced colours + Bee's shared glossary media rules."""
import json
import re
import sys
from pathlib import Path

WORK = Path(__file__).resolve().parent.parent
HACHI = WORK / "hachidori" / "extension"
CAND = WORK / "candidates"
DIRECTIONS = {
    "ffxn-hairline": ("Hairline", "dir-hairline.css"),
    "ffxn-menu": ("Menu", "dir-menu.css"),
    "ffxn-tooltip": ("Tooltip", "dir-tooltip.css"),
    "ffxn-parchment": ("Parchment", "dir-parchment.css"),
    "ffxiv-dark": ("Dark", "dir-final.css"),
}
DESIGN = ["popupOpacityPercent", "glossaryLayoutMode", "kanjiClickDictionary", "showFrequencyDictionaryNames",
          "compactFrequencyNumbers", "averageFrequency", "showPitchAccentFurigana", "pitchAccentFuriganaDictionary",
          "pitchAccentFuriganaStyle", "popupImageSource", "imageHoverPreview", "customButtons"]


def assemble(direction_file: str) -> str:
    parts = [CAND / "base.css", CAND / direction_file, CAND / "forced.css", CAND / "media-tail.css"]
    return "\n".join(path.read_text() for path in parts)


def main(selected):
    for slug in selected:
        name, css_file = DIRECTIONS[slug]
        target = HACHI / "vendor" / "themes" / slug
        target.mkdir(parents=True, exist_ok=True)
        final = WORK.parent / "theme-ffxiv-normal" / "themes" / slug / "theme.css"
        (target / "theme.css").write_text(final.read_text() if final.exists() else assemble(css_file))
        (target / "theme.js").write_text(
            "// SPDX-License-Identifier: GPL-3.0-or-later\n"
            'import { createView } from "../jl/theme.js";\n\n'
            f'export default {{ schema: 2, slug: "{slug}", contentMode: "rich",\n'
            "  createView: options => createView(options, true),\n};\n")
        bee_shot = HACHI / "vendor" / "themes" / "bee" / "screenshot.png"
        if not (target / "screenshot.png").exists():
            (target / "screenshot.png").write_bytes(bee_shot.read_bytes())

    reader = HACHI / "reader-options.js"
    text = reader.read_text()
    ids = re.search(r'const POPUP_RENDERER_IDS = \[(.*?)\];', text).group(1)
    wanted = ["nazeka", "plain", "jl", "bee"] + list(DIRECTIONS)
    text = text.replace(f"const POPUP_RENDERER_IDS = [{ids}];",
                        "const POPUP_RENDERER_IDS = [" + ", ".join(f'"{s}"' for s in wanted) + "];")
    reader.write_text(text)

    host = HACHI / "theme-host.js"
    text = host.read_text()
    text = re.sub(r'dictionaryStyles: name === "default" \|\| name === "bee"[^,]*,',
                  'dictionaryStyles: name === "default" || name === "bee" || name.startsWith("ffxn-") || name === "ffxiv-dark",', text)
    host.write_text(text)

    preview = HACHI / "design-preview.js"
    text = preview.read_text()
    text = re.sub(r'if \(HDReaderOptions\.popupRenderer\(options\.popupTheme\) === "bee"[^\n]*\n',
                  'if (["bee", ' + ", ".join(f'"{s}"' for s in DIRECTIONS)
                  + '].includes(HDReaderOptions.popupRenderer(options.popupTheme))\n', text)
    preview.write_text(text)

    index_path = HACHI / "vendor" / "themes" / "index.json"
    index = json.loads(index_path.read_text())
    index["themes"] = [theme for theme in index["themes"] if not theme["slug"].startswith(("ffxn-", "ffxiv-"))]
    for slug, (name, _) in DIRECTIONS.items():
        index["themes"].append({"slug": slug, "name": f"FFXIV {name} (candidate)", "description": f"Candidate direction {name}.",
                                "contentMode": "rich", "benchmark": "Render n/a", "benchmarkUrl": "https://example.invalid/",
                                "designSettings": DESIGN})
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    print("registered", ", ".join(selected))


if __name__ == "__main__":
    main(sys.argv[1:] or list(DIRECTIONS))
