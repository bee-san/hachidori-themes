# Hachidori themes

Reviewed popup renderers for [Hachidori](https://github.com/bee-san/hachidori).
Themes **become the popup**: they create their own DOM directly from lookup data.
They do not build Default and hide or rearrange it afterwards.

## Initial catalogue

- **Default** — Hachidori's built-in rich popup and existing colour palettes.
- **Plain** — only complete dictionary definition text, with no headers, metadata,
  audio or Anki controls, or icon/dictionary stylesheets.
- **Nazeka** — a compact text renderer adapted from wareya/nazeka, with core
  pronunciation, Anki and navigation bindings. See its attribution and licence.

The experimental Store in Hachidori shows screenshots, descriptions and benchmark
results as carousel cards. **Use** selects the bundled renderer immediately.
Enable it under Advanced → Experimental features, then open Design.

## Distribution

Theme modules are reviewed here and copied into a pinned Hachidori release.
Hachidori does not download executable theme code at runtime. This repository's
YAML describes sources; the extension reads its bundled JSON catalogue.

The [version 2 view contract](https://github.com/bee-san/hachidori/blob/89e07c6f5b66599dda0b7bcd303a0b287b01f03d/docs/themes/README.md)
explains renderer ownership, core callbacks, text/rich content, CSS, switching and
fallback. The MVP omits a remote installer and live catalogue refresh.

Detailed future proposals are tracked in this repository's issues. Historical
proposal code must be ported to direct rendering before inclusion.

## Checking changes

```sh
for theme in themes/*/theme.js; do node --check "$theme"; done
```

Runtime correctness and repeated hover measurements use Hachidori's production
Chrome harness. The [benchmark report](benchmark/README.md) includes its exact setup, revisions and
limitations. Compare complete lookup frames as well as construction time; fewer
DOM nodes do not guarantee a lower end-to-end latency.

New integration code is GPL-3.0-or-later. Adapted Nazeka portions retain their
Apache-2.0 attribution and licence in `themes/nazeka/`.
