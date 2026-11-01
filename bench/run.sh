#!/bin/sh
# Bee against Citadel with Hachidori's hover benchmark: two batches of six fresh
# profiles each, in alternating order, with Bee's two fixture archives.
W=/local/home/skerraut/herd-synth3/clones/theme-24-idea2.work
H=/local/home/skerraut/herd-synth3/clones/theme-24-idea2-hachidori
export PATH=$HOME/.local/share/mise/installs/node/22.23.1/bin:$PATH
cd $H
export HACHIDORI_PUPPETEER="$(node -p "require.resolve('puppeteer-core', { paths: ['./test/tooling'] })")"
export HACHIDORI_CHROME=$H/test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome
export HACHIDORI_HOVER_SAMPLES=6
export FONTCONFIG_FILE=$W/fonts-ci.conf
mkdir -p $W/bench/final
for batch in 1 2; do
  if [ $batch = 1 ]; then order="bee citadel"; else order="citadel bee"; fi
  for theme in $order; do
    echo "batch $batch $theme start $(date -u +%H:%M:%S) load $(cut -d' ' -f1-3 /proc/loadavg)"
    HACHIDORI_HOVER_OPTIONS="{\"popupTheme\":\"$theme\"}" timeout 2400 node benchmark/hover-popup.mjs $W/bench/final/$theme-$batch docs/themes/bee-evidence/bee-hover-fixture.zip docs/themes/bee-evidence/bee-senses.zip > $W/bench/final/$theme-$batch.log 2>&1 < /dev/null
    echo "batch $batch $theme exit $? $(date -u +%H:%M:%S)"
  done
done
echo BENCH_DONE
