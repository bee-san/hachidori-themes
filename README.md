<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
# Preview images for the Pompom Post pull request

This orphan branch holds only the supporting material for the pull request
that adds `themes/pompom-post/`: the preview images in its description, the
stylesheets of the directions that were not chosen, and the script that
rendered them. Nothing here is part of a theme. Delete the branch once a
direction has been chosen.

| File | Contents |
| --- | --- |
| `pompom-post.png` | The chosen direction |
| `chocobo-meadow.png`, `saucer-marquee.png`, `storybook-tale.png` | The three runner-ups |
| `patchwork-plush.png` | The fifth direction, dropped |
| `css/*.css` | Complete stylesheets for the four other directions, for Bee's renderer |
| `harness/` | The rendering and contrast-audit scripts |

Each image shows the same four lookups through Hachidori's real popup: the
extension loaded unpacked in Chrome 152, Bee's renderer, and the fixture
dictionaries from Hachidori's `test/make-fixture.mjs`, on a white page and on a
`#1e1e1e` page at the default 85% background opacity.

The other directions' stylesheets share one base (Hachidori's vendored Bee
stylesheet with its colours turned into custom properties) and differ only in
their skin. They were checked with the harness's contrast audit, not with
Hachidori's Store suite.

`harness/render.mjs` expects a Hachidori checkout at `./hachidori` with the
test tooling and Chrome installed, the theme slugs registered, the fixture
archives in `./fixtures` (`make-samples.mjs` writes them) and a fontconfig file
in `./fonts`. It records the contrast of every visible text node, border and
focus ring over white and black pages for each screenshot.
