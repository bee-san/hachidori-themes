#!/usr/bin/env python3
"""Assemble candidate stylesheets and register them in the local Hachidori
clone (uncommitted, never pushed) so the real extension can render them.

Each candidate is Bee's renderer (`createView(options, true)` from
../jl/theme.js) plus one assembled stylesheet (v2-base.css + a direction file,
with svg(name) ornaments inlined as data URIs). Idempotent: the four core files
it edits are restored from git first."""
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ornaments import assemble  # noqa: E402

WORK = Path(__file__).resolve().parent.parent
HACHI = WORK / "hachidori" / "extension"
CAND = WORK / "candidates"
THEMES = WORK.parent / "theme-ffxiv-normal" / "themes"
DIRECTIONS = {
    "xiv2-crystal": ("Crystal", ["v2-base.css", "v2-crystal.css"]),
    "xiv2-ornate": ("Ornate", ["v2-base.css", "v2-ornate.css"]),
    "xiv2-banner": ("Banner", ["v2-base.css", "v2-banner.css"]),
    "xiv2-tome": ("Tome", ["v2-base.css", "v2-tome.css"]),
    "xiv2-crystal-dark": ("Crystal Dark", ["v2-base.css", "v2-crystal.css", "v2-dark.css"]),
    "ffxiv-dark": ("Dark", None),
    "xiv-v1": ("Dark v1 (first PR #23 version)", []),
}
DESIGN = ["popupOpacityPercent", "glossaryLayoutMode", "kanjiClickDictionary", "showFrequencyDictionaryNames",
          "compactFrequencyNumbers", "averageFrequency", "showPitchAccentFurigana", "pitchAccentFuriganaDictionary",
          "pitchAccentFuriganaStyle", "popupImageSource", "imageHoverPreview", "customButtons"]
CORE_FILES = ["reader-options.js", "theme-host.js", "design-preview.js", "vendor/themes/index.json"]


def stylesheet(slug):
    name, parts = DIRECTIONS[slug]
    override = CAND / f"{slug}.final.css"
    if override.exists():
        return override.read_text()
    if parts is None:
        return (THEMES / slug / "theme.css").read_text()
    return assemble([CAND / part for part in parts])


def main(selected):
    subprocess.run(["git", "checkout", "--", *[f"extension/{path}" for path in CORE_FILES]], cwd=HACHI.parent, check=True)
    for slug in DIRECTIONS:
        target = HACHI / "vendor" / "themes" / slug
        if slug not in selected and not target.exists():
            continue
        target.mkdir(parents=True, exist_ok=True)
        if slug in selected or not (target / "theme.css").exists():
            (target / "theme.css").write_text(stylesheet(slug))
        (target / "theme.js").write_text(
            "// SPDX-License-Identifier: GPL-3.0-or-later\n"
            'import { createView } from "../jl/theme.js";\n\n'
            f'export default {{ schema: 2, slug: "{slug}", contentMode: "rich",\n'
            "  createView: options => createView(options, true),\n};\n")
        if not (target / "screenshot.png").exists():
            (target / "screenshot.png").write_bytes((HACHI / "vendor" / "themes" / "bee" / "screenshot.png").read_bytes())
    slugs = [slug for slug in DIRECTIONS if (HACHI / "vendor" / "themes" / slug).exists()]

    reader = HACHI / "reader-options.js"
    text = reader.read_text()
    old = 'const POPUP_RENDERER_IDS = ["nazeka", "plain", "jl", "bee"];'
    assert old in text
    reader.write_text(text.replace(old, "const POPUP_RENDERER_IDS = [" + ", ".join(f'"{s}"' for s in ["nazeka", "plain", "jl", "bee", *slugs]) + "];"))

    host = HACHI / "theme-host.js"
    text = host.read_text()
    old = 'dictionaryStyles: name === "default" || name === "bee",'
    assert old in text
    host.write_text(text.replace(old, "dictionaryStyles: " + json.dumps(["default", "bee", *slugs]) + ".includes(name),"))

    preview = HACHI / "design-preview.js"
    text = preview.read_text()
    old = 'if (HDReaderOptions.popupRenderer(options.popupTheme) === "bee"'
    assert old in text
    preview.write_text(text.replace(old, "if (" + json.dumps(["bee", *slugs]) + ".includes(HDReaderOptions.popupRenderer(options.popupTheme))"))

    index_path = HACHI / "vendor" / "themes" / "index.json"
    index = json.loads(index_path.read_text())
    for slug in slugs:
        index["themes"].append({"slug": slug, "name": f"FFXIV {DIRECTIONS[slug][0]} (candidate)", "description": "Candidate direction.",
                                "contentMode": "rich", "benchmark": "Render n/a", "benchmarkUrl": "https://example.invalid/",
                                "designSettings": DESIGN})
    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    print("registered", ", ".join(slugs), "(rebuilt:", ", ".join(selected) + ")")


if __name__ == "__main__":
    main(sys.argv[1:] or [slug for slug in DIRECTIONS if DIRECTIONS[slug][1] is None or all((CAND / p).exists() for p in DIRECTIONS[slug][1])])
