# Citadel previews (supporting material for the Citadel PR)

Review material for the Citadel theme (`themes/citadel/`), theme idea 2 in
[#24](https://github.com/bee-san/hachidori-themes/issues/24). Nothing here ships.

- `previews/`: renders of Hachidori's real popup (Chrome for Testing 152.0.7977.75, unpacked extension,
  real WASM importer, synthetic dictionaries) with Citadel, including the side-by-side with the mock-up.
  `theme-store-suite.png` is from Hachidori's `test/chrome-theme-store.mjs` with a Citadel pass added.
- `harness/render.mjs`: the render and contrast harness (`node render.mjs <hachidori> <out> [scene ...]`),
  adapted from the Crystal previews' `crystal-render.mjs`. It emulates the system colour scheme for the grey
  and beige variants and reads the closed popup root through Hachidori's `test/chrome-popup-root.mjs`.
  `make-fixtures.mjs` builds its dictionaries (the Crystal previews' fixtures, plus furigana on 朝);
  `compose.py` and `previews.py` build the sheets.
- `harness/ornaments.py`: readable sources of the three inline SVG ornaments in `theme.css` (the crystal and
  its mount, the section rule's diamonds and the book). Edit an SVG here and run
  `python3 ornaments.py themes/citadel/theme.css`; it rewrites each `url()` that follows a `/* svg:NAME */` marker.
- `harness/csp-probe.mjs` and `bench/csp-citadel.json`: the strict-CSP check.
- `bench/`: Hachidori's `benchmark/hover-popup.mjs` runs (`run.sh`, `run-three.sh`, `summarise*.py`).
  `hover-summary.json` is the run quoted in the PR (Bee, Crystal and Citadel, load average 17 to 31);
  `hover-summary-first.json` (Bee and Citadel) and `hover-summary-busy.json` (all three, load average 34 to 74)
  are earlier runs on the same machine. `no-warmup.json` is Citadel with its top-frame font and ornament
  warm-up disabled, and `load-cost.json` is `harness/load-cost.mjs`: page-load main-thread time with each
  theme selected and no lookup.
- `hachidori/citadel-bundling.diff`: the local change to Hachidori (`b6e2328f`) that the renders and the
  test runs used: Citadel in `POPUP_RENDERER_IDS`, `index.json` and `source.json`, the dictionary-styles and
  preview-group special cases, three renderer contract tests and Citadel in the native-kanji test, a Theme
  Store pass, and the Theme select counts in the Settings suites. A follow-up Hachidori PR that ships the
  theme can start from it.

Paths in the scripts point at the author's machine; pass your own Hachidori checkout.
