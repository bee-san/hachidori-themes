# FFXIV Aetheryte

FFXIV Aetheryte shares Bee's Theme's direct renderer, `createView(options, true)`
from `../jl/theme.js`, so it has the same group tabs, formatted definitions,
image previews, personal dictionary editor, custom actions and Design settings.
Only the stylesheet differs. It starts from the Bee stylesheet that Hachidori
ships, swaps its colours and font stacks, and adds a short block of details:

- midnight-blue glass that keeps Design's background opacity, with a 6 px
  backdrop blur so page text behind the popup does not compete with definitions;
- a gold rim, a dark channel and a gold hairline as the window frame, with gold
  filigree corners and a small plate in the top edge holding three crystals in
  tank blue, healer green and DPS red;
- gold small-caps tabs and dictionary names, a lit gold selected tab (still
  underlined), and a gold band behind each dictionary row like a duty-list header;
- pale gold headwords, crystal-blue readings and pitch marks, crystal gems on
  frequency chips and diamond markers on glosses.

The decoration sits under the content and ignores the pointer. Forced colours
hide it and keep Bee's system-colour rules.

The layout follows JL; see [JL's attribution](../jl/ATTRIBUTION.md) and
[Apache-2.0 licence](../jl/LICENSE.Apache-2.0). Hachidori integration is
GPL-3.0-or-later.

The idea of a FINAL FANTASY XIV-styled Hachidori popup comes from
[KonyAHS/HachidoriFfxiv](https://github.com/KonyAHS/HachidoriFfxiv), the Dalamud
plugin that shows Hachidori lookups inside the game (GPL-3.0-or-later). This theme uses
none of its code or files.

This is an unofficial fan theme inspired by the user interface of FINAL FANTASY
XIV. It is not affiliated with or endorsed by Square Enix. It contains no game
artwork, logos, icons, fonts or other assets: the frame, crystals and corners
are original CSS and one original inline SVG. The stylesheet names only freely
licensed fonts (Noto Sans, Noto Serif, Noto Sans CJK JP, Noto Sans JP and
Source Han Sans JP, all under the SIL Open Font License) and bundles none; the
system's sans-serif and serif fonts are used when they are not installed.
