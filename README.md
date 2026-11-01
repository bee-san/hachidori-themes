# Crystal colours: previews (supporting material for the Crystal colours PR)

Review material for the update of [the Crystal theme](https://github.com/bee-san/hachidori-themes/tree/main/themes/crystal)
that the owner asked for on [#24](https://github.com/bee-san/hachidori-themes/issues/24): FFXIV-style Grey and Beige with
red and gold buttons, a retro Final Fantasy blue window, and a toggle. Nothing here ships.

- `previews/`: renders of Hachidori's real popup (Chrome for Testing 152.0.7977.75, unpacked extension, real WASM
  importer, synthetic dictionaries) in each colour choice, including the mock-up next to the renders.
  `contrast-summary.json` has the lowest WCAG ratio per variant, scene and kind (text, border, icon, focus).
- `harness/crystal-render.mjs`: the render and contrast harness,
  `CRYSTAL_VARIANTS=grey,beige,blue node crystal-render.mjs <hachidori> <out> [scene ...]`; `auto` renders Automatic
  under an emulated light and dark system mode. It reads the closed popup root through Hachidori's
  `test/chrome-popup-root.mjs`. `make-crystal-fixtures.mjs` builds its dictionaries and `previews.py` the sheets.
- `harness/ornaments.py`: readable sources of every inline SVG ornament in `theme.css`, including Retro blue's silver
  crest, plaque, gem and diamonds. Edit an SVG there and run `python3 ornaments.py themes/crystal/theme.css`; it
  rewrites each `url()` that follows a `/* svg:NAME */` marker.
- `harness/csp-probe.mjs`, `harness/load-cost.mjs`, `bench/`: the strict-CSP check, the page-load trace and the hover
  benchmark before and after, as quoted in the PR.
- `design-spec.md`: the notes the colours were built from.

Paths in the scripts point at the author's machine; pass your own Hachidori checkout.
