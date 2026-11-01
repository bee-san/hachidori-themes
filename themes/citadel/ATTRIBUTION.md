# Citadel

Citadel is theme idea 2 in [#24](https://github.com/bee-san/hachidori-themes/issues/24):
a slate-grey panel in a plain gold frame with a small blue crystal at the top,
red and gold buttons, and gold rules with a small diamond between dictionaries.
On a light system colour scheme the panel is parchment beige with bronze trim.
The theme was built from that mock-up, with fewer ornaments, and is original
work under GPL-3.0-or-later.

- **Inspiration, not assets.** The mock-up and the colours echo FINAL FANTASY
  XIV's grey and beige windows. Citadel is unofficial and not affiliated with
  Square Enix. It contains no game art, logos, icons or fonts.
- **Ornaments.** The crystal and its mount, the section rule's diamonds and the
  book icon are inline SVG drawn for this theme; the frame, tab plates and
  buttons are CSS. There is no game or third-party artwork.
- **Icons.** Anki, audio, the pencil, custom actions and Close use Hachidori's
  shared outline icons (`icons.css`), as the other themes do.
- **Fonts.** None are bundled or downloaded. The stack names freely licensed
  serif families (Noto Serif and Noto Serif CJK JP under the SIL OFL 1.1, Source
  Serif 4 and Source Han Serif under the SIL OFL 1.1), then the system serifs
  Georgia, Cambria, Times New Roman, Yu Mincho, Hiragino Mincho, BIZ UDPMincho
  and MS PMincho, then `serif`.
- **Renderer.** `theme.js` builds its own DOM from lookup data with Hachidori's
  shared components (group tabs, lookup actions, audio control, frequency
  badges, pitch morae, image preview and the structured glossary renderer). Its
  group tabs, More actions, Note editor placement and font warm-up follow
  Crystal's `../crystal/theme.js`, whose integration code in turn follows Bee's
  Theme in `../jl/theme.js`. Unlike Crystal, a word has one set of buttons, which
  mine and play all of its shown dictionaries, as Default's do.
