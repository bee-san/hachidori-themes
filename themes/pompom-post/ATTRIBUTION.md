# Pompom Post

Pompom Post shares Bee's Theme's direct renderer, `createView(options, true)`
from `../jl/theme.js`, so it has the same group tabs, formatted definitions,
image previews, personal dictionary editor, custom actions and Design settings.
Only the stylesheet differs. It starts from the Bee stylesheet that Hachidori
ships and turns the popup into a letter delivered by moogle post: airmail
stripes round the edge, an envelope flap sealed with a winged pom-pom, a stamp
and postmark, postage-stamp frequency chips, postmark dictionary names, heart
bullets and an airmail dash between entries. Pitch is a red thread over the
reading. The envelope itself (stripes, flap, seal, stamp and postmark) is drawn
in the popup's frame, which stays opaque, so it never covers text; Background
opacity applies to the letter paper inside it.

The layout follows JL; see [JL's attribution](../jl/ATTRIBUTION.md) and
[Apache-2.0 licence](../jl/LICENSE.Apache-2.0). Hachidori integration is
GPL-3.0-or-later.

## Inspiration

This is an unofficial fan theme inspired by FFXIV's moogle mail and by
[KonyAHS/HachidoriFfxiv](https://github.com/KonyAHS/HachidoriFfxiv), the Dalamud
plugin that shows Hachidori popups in the game. It is not affiliated with or
endorsed by Square Enix or the plugin's author.

It contains no Square Enix artwork, logos, icons, fonts or other game assets.
The stripes, flap, wax seal, wings, stamp, postmark and hearts are CSS gradients
and inline SVG drawn for this theme.

## Fonts

No font files are included. The stack uses Zen Maru Gothic or M PLUS Rounded 1c
(SIL Open Font License 1.1) or Kosugi Maru (Apache-2.0) when one is installed,
then the fonts Bee's Theme uses: Meiryo and Noto Sans CJK JP.
