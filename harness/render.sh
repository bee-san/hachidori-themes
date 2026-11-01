#!/bin/sh
# render.sh <round> [scene ...]: copy the theme into the Hachidori checkout and render.
set -e
W=/local/home/skerraut/herd-synth3/clones/theme-24-idea2.work
T=/local/home/skerraut/herd-synth3/clones/theme-24-idea2/themes/citadel
H=/local/home/skerraut/herd-synth3/clones/theme-24-idea2-hachidori
cp "$T/theme.js" "$T/theme.css" "$H/extension/vendor/themes/citadel/"
[ -f "$T/screenshot.png" ] && cp "$T/screenshot.png" "$H/extension/vendor/themes/citadel/"
[ -f "$T/ATTRIBUTION.md" ] && cp "$T/ATTRIBUTION.md" "$H/extension/vendor/themes/citadel/"
round=$1; shift
export PATH=$HOME/.local/share/mise/installs/node/22.23.1/bin:$PATH
export FONTCONFIG_FILE=$W/fonts.conf
exec timeout 1500 node "$W/harness/render.mjs" "$H" "$W/out/$round" "$@" < /dev/null
