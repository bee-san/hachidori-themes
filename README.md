<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
# FFXIV Dark: review previews (not for merging)

Review material for the FFXIV Dark pull request in
[bee-san/hachidori-themes](https://github.com/bee-san/hachidori-themes). This
orphan branch holds the screenshots, the three runner-up stylesheets and the
render harness, so the pull request itself only adds the theme. Delete the
branch once a direction is chosen.

Every image is Hachidori's real popup: Chrome for Testing 152.0.7977.75
headless, Hachidori `cc2bc3c`, Bee's renderer (`createView(options, true)`),
560 × 420, Design's default 85% opacity, real hover lookups on a light and a
dark article page. The sample dictionaries are small original files written for
this harness (`harness/dicts.py`) plus Hachidori's test fixture.

## Directions

| Direction | Idea | Images | Stylesheet |
| --- | --- | --- | --- |
| **Hairline (chosen)** | FFXIV's Dark window reduced to charcoal glass, one khaki-gold hairline, serif small caps for dictionary names and tabs. | `ffxiv-dark-*.png` | the pull request's `themes/ffxiv-dark/theme.css` |
| Menu | The Dark theme's menu windows: warm charcoal, gold outer and dark inner line, a title strip for the tabs, the amber category bar for the selected tab, dictionary names on fading bands. | `menu-*.png` | `css/menu.css` |
| Tooltip | An item tooltip's anatomy on blue-black: name and frequency on one line (where Item Level sits), the reading on a category line, a full-width rule, then definitions. Gold only for numbers. | `tooltip-*.png` | `css/tooltip.css` |
| Parchment | FFXIV's Light theme: parchment, bronze trim, brown serif small caps, amber selected tab. | `parchment-*.png` | `css/parchment.css` |

Each runner-up stylesheet is a complete drop-in `theme.css` for the same
renderer, exactly as rendered here. They passed the harness's text-contrast
check but not the full Theme Store suite, and are not polished.

## Chosen theme checks

- `ffxiv-dark-pitch.png`: heiban, atamadaka, nakadaka and odaka readings, small
  kana and a word without pitch data, enlarged.
- `ffxiv-dark-japanese.png`: a ten-sense entry with a long gloss, monolingual
  Japanese text, ruby furigana in examples, structured content and the kanji view.
- `ffxiv-dark-states.png`: the Note editor, 300 px with More actions, the compact
  glossary and forced colours, from Hachidori's `test/chrome-theme-store.mjs`
  run with this stylesheet in Bee's slot.
- `ffxiv-dark-preview.png`: Design's preview sample on both pages.
- `bench/summary.json`: Hachidori's hover benchmark, Bee against FFXIV Dark.

## Reproduce

```sh
git clone https://github.com/bee-san/hachidori.git hachidori   # at cc2bc3c
npm ci --prefix hachidori/test/tooling && npm --prefix hachidori/test/tooling run install:chrome
python3 harness/dicts.py                        # sample dictionaries -> harness/dicts/
(cd hachidori && node test/make-fixture.mjs && cp test/fixtures/hachidori-fixture.zip ../harness/dicts/ \
  && node benchmark/theme-popup-fixture.mjs ../harness/dicts/theme-bench-senses.zip)
python3 harness/register.py                     # local-only candidate registration
node harness/render.mjs --words=taberu,toru --out=out/run
```

`register.py` also expects the hachidori-themes checkout beside this one
(`../theme-ffxiv-normal`) for the final stylesheet. The evidence renders used an
optional `fonts.conf` here that adds Noto Sans JP, Noto Serif JP and Noto Serif
(SIL OFL 1.1) to the system fonts; nothing is bundled with the theme.

No Square Enix assets, logos, icons, textures or fonts are used anywhere here.
