# FFXIV Dark

FFXIV Dark shares Bee's Theme's direct renderer, `createView(options, true)`
from `../jl/theme.js`, so it has the same group tabs, formatted definitions,
image previews, personal dictionary editor, custom actions and Design settings.
Only the stylesheet differs. It starts from the Bee stylesheet that Hachidori
ships and recolours it as a restrained nod to FFXIV's Dark window theme:
charcoal glass at Design's background opacity with a light blur behind it, one
khaki-gold hairline, serif small caps for dictionary names and tabs, gold
readings and pitch lines, entry separators that fade out at both ends, and a
warm fill, gold outline and underline on the selected tab.

The stylesheet also keeps a reading on one line when its pitch drops after the
last mora (橋, 光), which wraps in Bee's and JL's stylesheets.

Inspired by [KonyAHS/HachidoriFfxiv](https://github.com/KonyAHS/HachidoriFfxiv),
the Dalamud plugin that shows Hachidori popups inside FFXIV, and by the game's
own Dark UI theme. No code or assets come from the plugin.

The layout follows JL; see [JL's attribution](../jl/ATTRIBUTION.md) and
[Apache-2.0 licence](../jl/LICENSE.Apache-2.0). Hachidori integration is
GPL-3.0-or-later.

This is an unofficial fan theme. It is not affiliated with or endorsed by
Square Enix, and it contains no game artwork, logos, icons, textures or fonts:
only original CSS colours, lines and gradients. It bundles and downloads no
fonts. Japanese text uses the font stack Hachidori's Default already names.
The serif small caps name only freely licensed families (Noto Serif, Source
Serif 4, Noto Serif CJK JP and Noto Serif JP, all SIL OFL 1.1), then the
system serif and Default's Japanese stack. A family that is not installed is
skipped.
