# Crystal previews (supporting material for the Crystal PR)

Review material for [the Crystal theme](https://github.com/bee-san/hachidori-themes/tree/main/themes/crystal),
theme idea 5 in [#24](https://github.com/bee-san/hachidori-themes/issues/24). Nothing here ships.

- `previews/`: renders of Hachidori's real popup (Chrome for Testing 152.0.7977.75, unpacked extension,
  real WASM importer, synthetic dictionaries) with Crystal, including the side-by-side with the mock-up.
- `harness/crystal-render.mjs`: the render and contrast harness (`node crystal-render.mjs <hachidori> <out> [scene ...]`),
  with `make-crystal-fixtures.mjs` for its dictionaries and `compose.py`/`previews.py` for the sheets.
- `harness/ornaments.py`: readable sources of every inline SVG ornament in `theme.css`. Edit an SVG here and run
  `python3 ornaments.py themes/crystal/theme.css`; it rewrites each `url()` that follows a `/* svg:NAME */` marker.
- `harness/csp-probe.mjs`, `harness/load-cost.mjs`, `bench/`: the strict-CSP check, the page-load trace and the
  hover benchmark summary quoted in the PR.

Paths in the scripts point at the author's machine; pass your own Hachidori checkout.
