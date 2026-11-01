# FFXIV Dark

**Non-commercial fan work.** FFXIV Dark is an unofficial, non-commercial fan
theme for FINAL FANTASY XIV players. It is free, nobody earns anything from it,
and it is not affiliated with or endorsed by Square Enix. FINAL FANTASY XIV
© SQUARE ENIX CO., LTD. All Rights Reserved.

FFXIV Dark shares Bee's Theme's direct renderer, `createView(options, true)`
from `../jl/theme.js`, so it has the same group tabs, formatted definitions,
image previews, personal dictionary editor, custom actions and Design settings.
Only the stylesheet differs. It starts from the Bee stylesheet that Hachidori
ships and dresses the popup as a game window, after mockups 4 and 5 in
[issue #24](https://github.com/bee-san/hachidori-themes/issues/24):

- the game's Dark window colours: charcoal glass with a faint violet cast at
  Design's background opacity, with a light blur behind it;
- a gilt double frame with filigree corners, and a crystal on a gold bar at the
  top right;
- tab plates; the selected one is gilt and lit, and keeps Bee's underline;
- a framed panel for each dictionary, its name on a bronze plate with a blue
  gem, its top rule running from the plate to the actions;
- framed frequency chips with a book; gold readings, ruby, pitch lines, bullets
  and sense numbers.

The stylesheet also keeps a reading on one line when its pitch drops after the
last mora (橋, 光), which wraps in Bee's and JL's stylesheets.

Inspired by [KonyAHS/HachidoriFfxiv](https://github.com/KonyAHS/HachidoriFfxiv),
the Dalamud plugin that shows Hachidori popups inside FFXIV, and by the game's
own Dark UI theme. No code or files come from the plugin or the game.

The layout follows JL; see [JL's attribution](../jl/ATTRIBUTION.md) and
[Apache-2.0 licence](../jl/LICENSE.Apache-2.0). Hachidori integration is
GPL-3.0-or-later.

## Artwork

Every ornament is drawn for this theme: three small SVGs inlined in `theme.css`
(the frame's corners and crystal, the name plate with its gem, and the book
icon) and plain CSS for the rest (the double frame, rules, tab plates, panels
and their corner brackets). The theme contains no game artwork, logos, icons,
textures or fonts, and fetches nothing. The ornaments still draw on pages whose
Content-Security-Policy blocks images (checked in Chrome 152 with
`img-src 'none'`).

## Fonts

The theme bundles and downloads no fonts. Japanese text uses the font stack
Hachidori's Default already names. Tabs and dictionary names use
[Cinzel](https://github.com/NDISCOVER/Cinzel) (SIL OFL 1.1, free on Google
Fonts) when it is installed, for carved Roman capitals like the game's
headings. Without it they use Noto Serif, Source Serif 4, Noto Serif CJK JP or
Noto Serif JP (all SIL OFL 1.1) in small caps, then the system serif. Sense
numbers use those serifs rather than Cinzel, whose 1 reads as a Roman I. A
family that is not installed is skipped.
