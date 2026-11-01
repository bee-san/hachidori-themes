# Grimoire

Grimoire is theme idea 1 in [#24](https://github.com/bee-san/hachidori-themes/issues/24):
dark grey bands over parchment pages in a fine gold frame, a crystal plaque for each
dictionary with its own crimson-and-gold Anki, audio and Note buttons, and
numbered senses in diamonds. It was built from that mock-up, with fewer
ornaments, and is original work under GPL-3.0-or-later.

**Unofficial, non-commercial fan theme.** Its colours (grey, parchment beige,
red and gold buttons, blue crystals) are inspired by the user interface of
FINAL FANTASY XIV. It is free, nobody earns anything from it, and it is not
affiliated with or endorsed by Square Enix. It contains no game assets: no
artwork, icons, textures, logos or fonts. FINAL FANTASY XIV © SQUARE ENIX CO.,
LTD. All Rights Reserved.

- **Ornaments.** The frame, crest, plaques, gems, sense diamonds, the divider
  between entries and the book and crossed-swords badge icons are CSS and inline
  SVG drawn for this theme. The mock-up's background art, pennants, corner
  filigree and astrolabes are left out.
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
  group tabs, More actions, custom-action icons, pitch marker and font preload
  follow Crystal's renderer in `../crystal/theme.js`; like JL and Bee's Theme it
  gives each dictionary its own entry.
