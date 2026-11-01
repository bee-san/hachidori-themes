#!/usr/bin/env python3
"""Apply the minimal Hachidori integration for ffxiv-dark to a clean checkout
(local test only, never pushed): vendored files, POPUP_RENDERER_IDS, the
catalogue entry, dictionary styles and the preview's sample groups, as Bee has."""
import json
import re
import shutil
from pathlib import Path

WORK = Path(__file__).resolve().parent.parent
HACHI = WORK / "hachidori" / "extension"
THEME = WORK.parent / "theme-ffxiv-normal" / "themes" / "ffxiv-dark"

target = HACHI / "vendor" / "themes" / "ffxiv-dark"
target.mkdir(parents=True, exist_ok=True)
for name in ["theme.css", "theme.js", "screenshot.png", "ATTRIBUTION.md"]:
    shutil.copy2(THEME / name, target / name)

reader = HACHI / "reader-options.js"
text = reader.read_text()
text = text.replace('const POPUP_RENDERER_IDS = ["nazeka", "plain", "jl", "bee"];',
                    'const POPUP_RENDERER_IDS = ["nazeka", "plain", "jl", "bee", "ffxiv-dark"];')
assert '"ffxiv-dark"]' in text
reader.write_text(text)

host = HACHI / "theme-host.js"
text = host.read_text()
text = text.replace('dictionaryStyles: name === "default" || name === "bee",',
                    'dictionaryStyles: ["default", "bee", "ffxiv-dark"].includes(name),')
assert '"ffxiv-dark"].includes(name)' in text
host.write_text(text)

preview = HACHI / "design-preview.js"
text = preview.read_text()
text = text.replace('if (HDReaderOptions.popupRenderer(options.popupTheme) === "bee"',
                    'if (["bee", "ffxiv-dark"].includes(HDReaderOptions.popupRenderer(options.popupTheme))')
assert '["bee", "ffxiv-dark"]' in text
preview.write_text(text)

yaml = (THEME / "theme.yaml").read_text()
declared = re.search(r"designSettings: \[(.*)\]", yaml).group(1).split(", ")
index_path = HACHI / "vendor" / "themes" / "index.json"
index = json.loads(index_path.read_text())
index["themes"] = [theme for theme in index["themes"] if theme["slug"] != "ffxiv-dark"]
index["themes"].append({"slug": "ffxiv-dark", "name": "FFXIV Dark",
    "description": "A restrained nod to FFXIV's Dark windows on Bee's layout: charcoal glass, a gold hairline and serif small caps.",
    "contentMode": "rich", "benchmark": "Render 1.30 ms (Bee's renderer)",
    "benchmarkUrl": "https://github.com/bee-san/hachidori/blob/main/docs/themes/bee.md", "designSettings": declared})
index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
print("integrated ffxiv-dark with", len(declared), "Design settings")
