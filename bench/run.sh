#!/bin/sh
export PATH=$HOME/.local/share/mise/installs/node/22.23.1/bin:$PATH
cd /home/skerraut/herd-synth3/clones/theme-24-crystal-hachidori
export HACHIDORI_PUPPETEER="$(node -p "require.resolve('puppeteer-core', { paths: ['./test/tooling'] })")"
export HACHIDORI_CHROME=/home/skerraut/herd-synth3/clones/theme-24-crystal-hachidori/test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome
export HACHIDORI_HOVER_SAMPLES=6
export FONTCONFIG_FILE=/home/skerraut/herd-synth3/clones/theme-24-crystal.work/fonts-ci.conf
for batch in 1 2; do
  if [ $batch = 1 ]; then order="bee crystal"; else order="crystal bee"; fi
  for theme in $order; do
    echo "batch $batch $theme start $(date -u +%H:%M:%S) load $(cut -d' ' -f1-3 /proc/loadavg)"
    HACHIDORI_HOVER_OPTIONS="{\"popupTheme\":\"$theme\"}" timeout 1800 node benchmark/hover-popup.mjs /home/skerraut/herd-synth3/clones/theme-24-crystal.work/bench/final/$theme-$batch docs/themes/bee-evidence/bee-hover-fixture.zip docs/themes/bee-evidence/bee-senses.zip > /home/skerraut/herd-synth3/clones/theme-24-crystal.work/bench/final/$theme-$batch.log 2>&1
    echo "batch $batch $theme exit $? $(date -u +%H:%M:%S)"
  done
done
