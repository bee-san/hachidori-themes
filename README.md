<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
# FFXIV Dark: review previews (not for merging)

Review material for the FFXIV Dark pull request in
[bee-san/hachidori-themes](https://github.com/bee-san/hachidori-themes). This
orphan branch holds the screenshots, the runner-up stylesheets and the render
harness, so the pull request itself only adds the theme. Delete the branch once
a direction is chosen.

FFXIV Dark is an unofficial, non-commercial fan theme. It is not affiliated with
or endorsed by Square Enix, and everything here is original CSS and SVG. FINAL
FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.

## Version 2 (current): `v2/`

Rebuilt after the owner's review ("go crazier ... like part of the game") from
the mockups in [#24](https://github.com/bee-san/hachidori-themes/issues/24).
Every image is Hachidori's real popup: Chrome for Testing 152.0.7977.75
headless, Hachidori `f419b92`, Bee's renderer (`createView(options, true)`),
560 × 420, Design's default 85% opacity, real hover lookups on a light and a
dark article page, with [Cinzel](https://github.com/NDISCOVER/Cinzel) (SIL OFL)
installed unless stated. The sample dictionaries are small original files
written for this harness (`v2/harness/dicts.py`) plus Hachidori's test fixture.

| Direction | Mockup | Images | Stylesheet |
| --- | --- | --- | --- |
| **A. Crystal, in the game's Dark colours (chosen)** | 4 and 5 | `v2/v2-dark-*.png` | the pull request's `themes/ffxiv-dark/theme.css` |
| A. Crystal in navy, as drawn in the mockups | 4 and 5 | `v2/v2-crystal-navy-*.png` | `v2/css/crystal-navy.css` |
| B. Ornate | 3 | `v2/v2-ornate-*.png` | `v2/css/ornate.css` |
| C. Banner | 2 | `v2/v2-banner-*.png` | `v2/css/banner.css` |
| D. Tome | 1 | `v2/v2-tome-*.png` | `v2/css/tome.css` |

Each stylesheet in `v2/css/` is a complete drop-in `theme.css` for the same
renderer, exactly as rendered. They pass the harness's contrast checks (text and
control borders on both pages) but were not run through the Theme Store suite,
and are not polished.

Checks for the chosen theme:

- `v2-pitch.png`: heiban, atamadaka, nakadaka and odaka readings, small kana and
  a word without pitch data, enlarged.
- `v2-japanese.png`: a ten-sense entry with long glosses, monolingual Japanese,
  ruby furigana in examples, structured content and the kanji view.
- `v2-states.png`: the Note editor, 300 px with More actions, the compact
  glossary and forced colours, from Hachidori's `test/chrome-theme-store.mjs`
  run with this stylesheet in Bee's slot.
- `v2-preview.png`: Design's preview sample on both pages.
- `v2-fallback.png`: without Cinzel installed (Noto Serif small caps).
- `v2-nested-300.png`: a nested popup with its close button, and 300 px wide.
- `v2/bench/`: Hachidori's hover benchmark, Bee against the theme with nine and
  then three inline images, and with and without Cinzel installed.

`v2/sources/` holds the stylesheet sources: `svg(name)` tokens there are replaced
by the drawings in `v2/harness/ornaments.py` as data URIs. `v2/harness/` renders
everything above (`register.py`, then `render.mjs`, then `pr_previews2.py`).

## Version 1 (first review): repository root

The first version, "Hairline", was a restrained nod to the Dark window: charcoal
glass, one khaki-gold hairline and serif small caps. Its images are
`ffxiv-dark-*.png`; its runner-ups were Menu, Tooltip and Parchment
(`menu-*.png`, `tooltip-*.png`, `parchment-*.png`, stylesheets in `css/`). It
was rendered at Hachidori `cc2bc3c` with the harness in `harness/`, and
benchmarked in `bench/summary.json`.
