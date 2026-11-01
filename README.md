# Grimoire previews (supporting material for the Grimoire PR)

Review material for the Grimoire theme, theme idea 1 in
[#24](https://github.com/bee-san/hachidori-themes/issues/24). Nothing here ships.

- `previews/`: renders of Hachidori's real popup (Chrome for Testing 152.0.7977.75,
  unpacked extension, real WASM importer, synthetic dictionaries) with Grimoire,
  including the side-by-side with the mock-up. `contrast-report.json` holds every
  contrast check of the final render round.
- `harness/grimoire-render.mjs`: the render and contrast harness
  (`node grimoire-render.mjs <hachidori> <out> [scene ...]`), with
  `make-grimoire-fixtures.mjs` for its dictionaries and `previews.py` for the sheets.
  It started from Crystal's harness on `previews/crystal`.
- `harness/ornaments.py`: readable sources of the four inline SVG ornaments in
  `theme.css`. Edit an SVG there and run `python3 ornaments.py themes/grimoire/theme.css`;
  it rewrites each `url()` that follows a `/* svg:NAME */` marker.
- `harness/csp-probe.mjs`, `harness/load-cost.mjs`, `bench/`: the strict-CSP check,
  the page-load trace, the hover benchmark (Bee against Grimoire), the preload
  ablation and the Store test's Grimoire contrast checks, as quoted in the PR.
- `hachidori-patch/`: the local Hachidori changes the checks ran with (catalogue
  entry, renderer registration, Store-test pass, contract tests), against the
  Hachidori revision in `BASE`. It is test scaffolding for review, not a Hachidori PR.

Paths in the scripts point at the author's machine; pass your own Hachidori checkout.
