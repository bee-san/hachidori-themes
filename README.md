# Hachidori themes

[![Discord](https://img.shields.io/discord/754001738184392704?logo=discord&label=Discord)](https://discord.skerritt.blog)

Reviewed popup renderers for [Hachidori](https://github.com/bee-san/hachidori).
Themes **become the popup**: they create their own DOM directly from lookup data.
They do not build Default and hide or rearrange it afterwards.

## Initial catalogue

- **Default** — Hachidori's built-in rich popup and existing colour palettes.
- **Plain** — only complete dictionary definition text, with no headers, metadata,
  audio or Anki controls, or icon/dictionary stylesheets.
- **Nazeka** — a compact text renderer adapted from wareya/nazeka, with core
  pronunciation, Anki and navigation bindings. See its attribution and licence.
- **JL** — a text renderer following rampaa/JL's popup, with JL's default
  colours, pitch marker and dictionary tabs. Each dictionary gets its own block
  with its own audio and Anki buttons. See its attribution and licence.

The experimental Store in Hachidori shows screenshots, descriptions and benchmark
results as carousel cards. **Use** selects the bundled renderer immediately.
Enable it under Advanced → Experimental features, then open Design.

- **Bee's Theme** — Girlypop blush and violet colours on JL's compact layout,
  with JL-style group tabs, formatted definitions, enlarged image previews, the
  personal dictionary editor and custom link/Anki actions. Entry actions share
  one gap, long dictionary names use an ellipsis with the full name on hover,
  and Back sits at the popup's upper left. Design supports compact glossaries,
  frequency dictionary names, abbreviated frequency numbers, frequency averages
  and contour/overline pitch markings; see `themes/bee/`.
- **Crystal** — theme idea 5 in [#24](https://github.com/bee-san/hachidori-themes/issues/24):
  a fine gold frame with corner scrolls and a blue crystal crest, and group tabs
  in small caps. Its colours follow FFXIV's windows: Grey, a warm charcoal after
  the Dark theme, or Beige, parchment after the Light theme, both with red and
  gold buttons. Retro blue is the classic Final Fantasy menu window: a blue
  gradient in a thin white border with white text. Design → Colours chooses one;
  Automatic is Beige in the system's light mode and Grey in its dark mode. Each
  word gets one header (serif headword, the reading with its pitch, the
  deinflection trail and book/star frequency badges), then a framed section per
  dictionary with a crystal plaque, numbered senses in diamonds, tag chips,
  examples behind a rule and its own audio, Anki and Note buttons. Original CSS
  and SVG with a serif and Mincho font stack; no fonts are bundled. Design
  supports Bee's settings plus each dictionary's frequencies beside the
  averages; see `themes/crystal/`.

## Distribution

Theme modules are reviewed here and copied into a pinned Hachidori release.
Hachidori does not download executable theme code at runtime. This repository's
YAML describes sources; the extension reads its bundled JSON catalogue.
Each `theme.yaml` lists in `designSettings` the Design settings its renderer
implements (`all` or option keys), matching that catalogue; Hachidori's
Settings → Design hides the others for that theme. See the
[Design settings contract](https://github.com/bee-san/hachidori/blob/main/docs/themes/README.md#design-settings).
A theme with colour schemes lists them in `variants` (an `id` and a `name`
each). Design → Colours offers them after Automatic and puts the chosen id on
the popup host as `data-hoshidicts-theme-variant`, which Automatic leaves off;
see [colour variants](https://github.com/bee-san/hachidori/blob/main/docs/themes/README.md#colour-variants).

The [version 2 view contract](https://github.com/bee-san/hachidori/blob/89e07c6f5b66599dda0b7bcd303a0b287b01f03d/docs/themes/README.md)
explains renderer ownership, core callbacks, text/rich content, CSS, switching and
fallback. The MVP omits a remote installer and live catalogue refresh.

Detailed future proposals are tracked in this repository's issues. Historical
proposal code must be ported to direct rendering before inclusion.

## Checking changes

Bee's group row always starts with **All**, selected for each fresh lookup.
Named groups such as **Grammar** filter the returned definitions only when
selected; ungrouped dictionaries remain accessible through All. Back restores
an explicitly selected group. Removing or renaming a group preserves tab focus.

```sh
for theme in themes/*/theme.js; do node --check "$theme"; done
```

Runtime correctness and repeated hover measurements use Hachidori's production
Chrome harness. The [benchmark report](benchmark/README.md) includes its exact setup, revisions and
limitations. Compare complete lookup frames as well as construction time; fewer
DOM nodes do not guarantee a lower end-to-end latency.

New integration code is GPL-3.0-or-later. Adapted Nazeka portions retain their
Apache-2.0 attribution and licence in `themes/nazeka/`, and the adapted JL design
keeps its Apache-2.0 attribution and licence in `themes/jl/`.
