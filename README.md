# Review material for FFXIV Aetheryte (not for merging)

Supporting files for the FFXIV Aetheryte theme pull request: the "in between"
one of the three FFXIV-inspired themes. Nothing here is part of the theme. Delete
this branch once a theme has been chosen.

- `css/` holds the three runner-up directions as complete drop-in stylesheets
  for Bee's renderer (`createView(options, true)` from `themes/jl/theme.js`):
  `ffxiv-dutyfinder.css`, `ffxiv-tooltip.css` and `ffxiv-parchment.css`. To try
  one, copy it over `extension/vendor/themes/bee/theme.css` in a Hachidori
  checkout, reload the unpacked extension and choose Bee's Theme in the Store.
  The chosen direction is `themes/ffxiv-aetheryte/theme.css` in the pull request.
- `images/` holds the previews used in the pull request: each direction on a
  white and a `#1e1e1e` page, the Japanese-text checks, and the chosen theme's
  Note editor, narrow, kanji, compact and forced-colour states.
- `harness/` holds the scripts that built and measured them. `render.mjs` loads
  the real extension in Chrome for Testing 152, imports the fixtures from
  `build-fixtures.mjs`, hovers each word on both pages, saves the popups and
  measures contrast twice: from computed colours composited over the page, and
  from pixels with the text hidden. `make_candidates.py` builds a candidate from
  Bee's shipped stylesheet and a file in `harness/directions/`;
  `write_theme_css.py` and `write_runnerups.py` write the published files.
  They expect `TFB_WORK` (a directory with `hachidori/`, which has its test
  tooling and Chrome installed, `fixtures/` and `fonts/fonts.conf`) and
  `TFB_REPO` (a hachidori-themes checkout).
- `bench/` holds Hachidori's `benchmark/hover-popup.mjs` results for Bee's stock
  stylesheet and FFXIV Aetheryte's: two alternating batches of three fresh
  profiles each, with manifests, gzipped raw samples, `summary.json` and the
  harness's contrast reports.

The fixtures are synthetic: Hachidori's own test fixture, the 24-sense benchmark
entry, the nested-sense fixture and a few made-up entries. Japanese text in the
renders uses Noto Sans CJK JP (SIL Open Font License) through a private
fontconfig. Noto Serif was not installed, so the small-caps labels show the
system serif (Nimbus Roman). No font files are included here or in the theme.

This is unofficial fan work inspired by FINAL FANTASY XIV. It is not affiliated
with or endorsed by Square Enix and contains no game assets. Code here is
GPL-3.0-or-later, like the rest of the repository.
