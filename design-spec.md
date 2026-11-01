# Crystal v2: colour variants (owner #24 comment, 2026-11-01 06:39Z)

Owner: "5 but like align the colours slightly more to ffxivs pallette; grey or beige toggle maybe;
red and gold icons; also retro ff games use blue ui like u see in the vid i linked". 1 and 2 "may have
too much info and people may associate that with ai art", so keep 5's simple layout.

The linked video (YouTube metadata, not watched): "FFXIV Quick Tips | How To Change Your UI Theme".
FFXIV's own theme list (Lodestone UI guide): Dark, Light, Classic FF, Clear Blue, Clear White,
Clear Green, Clear Grey, Clear Pink. So the three variants map to Dark (grey), Light (beige) and
Classic FF (the retro blue window of FF1-FF9).

Mock-ups viewed (1280 copies): idea5 (navy + gold, the base), idea1 (navy frame, parchment pages,
round dark buttons with gold rims), idea2 (charcoal panel, gold frame, crimson banner with gold
trim, square gold-rimmed buttons). Grey takes idea2's charcoal, beige idea1's parchment, red/gold
idea2's crimson banner.

## Layout (unchanged from Crystal / idea 5)
Frame + corner scrolls + crest, tab row, one header per word, a framed section per dictionary
with plaque, numbered diamonds, chips, examples behind a rule, circled numbers.

## Shared changes
- Primary buttons (audio, Anki, pencil, custom actions, More) become small crimson plates with a
  gold rim and a gold-cream glyph (red and gold). No more thin dividers: plates sit 3 px apart.
- Selected group tab: crimson plate, gold border, gold-cream small caps, underlined (non-colour cue).
- Ornaments become panel-agnostic so grey and beige share them: hollow sense diamonds, solid gold
  rule nodes and separator diamond, lines with gaps. Colours are light-dark() pairs, so
  Automatic needs no duplicated blocks: the popup's color-scheme is `light dark` (Automatic),
  `dark` (Grey, Blue) or `light` (Beige).

## Grey (FFXIV Dark)
Warm charcoal panel (~#2a2724) with a faint warm glow, gold frame, ivory text, gold reading,
warm grey muted text, bronze plaque, warm grey chips, dark warm tabs with gold borders.

## Beige (FFXIV Light)
Parchment panel (~#ebe1cb), dark brown ink, bronze reading/labels, darker muted brown, gold frame
and ornaments (gilt on parchment), light tabs with bronze borders, tan chips, dark-blue links and
focus ring. Plaque stays the dark bronze label with cream text.

## Retro blue (Classic FF)
Vertical blue gradient window (lighter top ~#223f9c to deep ~#08124a), a thin white/silver border
with rounded corners and a dark outline, no corner scrolls or section brackets, white text,
pale-gold reading, silver-mounted crest, blue plaque with silver outline, blue plates with silver
rims and white glyphs for buttons, lighter blue selected tab with white border and underline.

## Toggle
Hachidori has no theme-specific setting, so the hachidori PR adds one: the catalogue entry declares
`variants` (id + name); Design → Appearance shows a Colours select for a theme that declares them;
`popupThemeVariant` (default "auto") is stored and Reset Design restores it; core puts it on the
popup host as `data-hoshidicts-theme-variant` (absent for Automatic), so open popups, nested popups
and the Design preview switch without a rebuild. Automatic follows the system's light/dark mode,
as Hachidori's Automatic palette does (the format cannot see the page's scheme reliably).

## Must work (per variant)
light/dark pages, 300 px, long glosses, furigana, contour + overline pitch, frequency lists, kanji,
Note editor, nested popups, keyboard focus, forced colours; AA 4.5:1 text, 3:1 borders/focus/icons.
