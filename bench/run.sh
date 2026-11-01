#!/bin/sh
# Crystal before (hachidori main b6e2328f, navy) and after (this branch: Automatic, which headless Chrome's
# light default shows as Beige), alternating order, two batches of six fresh sessions each.
export PATH=$HOME/.local/share/mise/installs/node/22.23.1/bin:$PATH
cd /home/skerraut/herd-synth3/clones/theme-24-crystal-v2-hachidori
export HACHIDORI_PUPPETEER="$(node -p "require.resolve('puppeteer-core', { paths: ['./test/tooling'] })")"
export HACHIDORI_CHROME=/home/skerraut/herd-synth3/clones/theme-24-crystal-v2-hachidori/test/tmp/browsers/chrome/linux-152.0.7977.75/chrome-linux64/chrome
export HACHIDORI_HOVER_SAMPLES=6
export FONTCONFIG_FILE=/home/skerraut/herd-synth3/clones/theme-24-crystal.work/fonts-ci.conf
export HACHIDORI_HOVER_OPTIONS='{"popupTheme":"crystal"}'
for batch in ${BATCHES:-1 2}; do
  if [ $((batch % 2)) = 1 ]; then order="before after"; else order="after before"; fi
  for side in $order; do
    if [ $side = before ]; then repo=/home/skerraut/herd-synth3/clones/theme-24-crystal-v2-hachidori-base; else repo=/home/skerraut/herd-synth3/clones/theme-24-crystal-v2-hachidori; fi
    echo "batch $batch $side start $(date -u +%H:%M:%S) load $(cut -d' ' -f1-3 /proc/loadavg)"
    HACHIDORI_BENCH_REPO=$repo timeout 1800 node benchmark/hover-popup.mjs /home/skerraut/herd-synth3/clones/theme-24-crystal-v2.work/bench/v2/$side-$batch docs/themes/bee-evidence/bee-hover-fixture.zip docs/themes/bee-evidence/bee-senses.zip > /home/skerraut/herd-synth3/clones/theme-24-crystal-v2.work/bench/v2/$side-$batch.log 2>&1
    echo "batch $batch $side exit $? $(date -u +%H:%M:%S)"
  done
done
