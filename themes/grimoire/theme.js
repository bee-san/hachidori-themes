// Grimoire: theme idea 1 of bee-san/hachidori-themes#24 as a direct renderer.
// Each result gets one entry per dictionary, as in JL and Bee's Theme: a grey
// band with the word (spelling, reading with pitch, deinflection and
// frequencies), then a parchment page. The page's banner holds the
// dictionary's plaque and its own Anki, audio and Note buttons, which sit on
// the seam between band and page; numbered senses follow. A word's later
// entries show only its spelling and reading in their bands.
// SPDX-License-Identifier: GPL-3.0-or-later
const HAN = /\p{Script=Han}/u;
const kanjiTokens = value => Array.isArray(value) ? value : String(value || "").split(/\s+/u).filter(Boolean);
// Yomitan separates tags with spaces; a no-break space stays inside a tag.
const tagNames = value => String(value || "").split(" ").filter(Boolean);
// The serif faces and the stylesheet's SVG ornaments would otherwise load on the
// first hover. As Crystal does, the top frame measures a few characters in the
// serif stack (theme.css's --grimoire-serif) and decodes the ornaments when it
// loads the theme.
const SERIF = `"Noto Serif", "Source Serif 4", "Source Serif Pro", Georgia, Cambria, "Times New Roman",
  "Noto Serif CJK JP", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", YuMincho, "Hiragino Mincho ProN",
  "BIZ UDPMincho", "MS PMincho", serif`;
// Held for the page's lifetime so the decoded ornaments stay cached.
const ORNAMENTS = [];
if (globalThis.top === globalThis && typeof OffscreenCanvas === "function") {
  const context = new OffscreenCanvas(1, 1).getContext("2d");
  for (const weight of [400, 600]) {
    context.font = `${weight} 16px ${SERIF}`;
    context.measureText("食べる たべる Aa");
  }
  fetch(new URL("theme.css", import.meta.url)).then(response => response.text()).then(css => {
    for (const [, uri] of css.matchAll(/url\("(data:image\/svg\+xml,[^"]*)"\)/gu)) {
      const image = new Image();
      image.src = uri;
      image.decode().catch(() => {});
      ORNAMENTS.push(image);
    }
  }).catch(() => {});
}

export function createView(options) {
  const { document, popup, components } = options;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  const button = (className, text, callback) => {
    const element = node("button", className, text);
    element.type = "button";
    element.addEventListener("click", callback);
    return element;
  };
  const ornament = className => {
    const element = node("span", className);
    element.setAttribute("aria-hidden", "true");
    return element;
  };
  // The top rail: Back, the group tabs, Close and a small crystal.
  const bar = node("div", "grimoire-bar");
  const nav = node("div", "grimoire-nav");
  const tabs = node("div", "grimoire-tabs");
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Dictionary groups");
  bar.append(nav, tabs, ornament("grimoire-crest"));
  const scroll = node("div", "grimoire-scroll");
  popup.append(bar, scroll);
  if (options.onResizeStart) {
    const resize = node("div", "gsm-hoshidicts-resize-handle");
    resize.title = "Resize popup";
    resize.addEventListener("pointerdown", options.onResizeStart);
    resize.addEventListener("pointermove", options.onResizeMove);
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) resize.addEventListener(event, options.onResizeEnd);
    popup.append(resize);
  }
  const highlighter = options.sourceHighlighter;
  let highlightEnabled = options.sourceHighlightEnabled;
  const coordinateScale = () => components.popupCoordinateScale(options.getPageZoom?.() ?? 1, options.getPopupScalePercent?.() ?? 100);
  // A hovered or focused glossary image is enlarged beside the popup, as in Default.
  const preview = components.createImagePreview({ document, window: options.window, popup,
    getCoordinateScale: coordinateScale, getImageHoverPreview: options.getImageHoverPreview, scrollBounds: () => scroll });
  // entries: one per result and dictionary, the entries keybinds index;
  // owners: the result each entry shows (null for kanji).
  let activeSource, entries = [], owners = [], bindings = [], selected = 0, tab = null, onTabSelected = null;
  let labels = [], markers = [], frequencies = [], tools = [], groupTabs = [], groupContext = null, availableDictionaries = [];
  let revision = 0, pendingPresentation = null, paintedPitch = "", paintedFrequency = "";
  const frequencyDictionaries = new Set(), pitchByTerm = new Map(), images = new Set();
  let customButtons = options.customButtons || [];
  const pitchOptions = context => JSON.stringify([context.showPitchAccentFurigana !== false,
    context.pitchAccentFuriganaDictionary ?? "", context.pitchAccentFuriganaStyle === "overline" ? "overline" : "contour"]);
  const shown = () => entries.filter(entry => !entry.hidden);

  function closeActionMenu(restoreFocus = true) {
    const open = [...popup.querySelectorAll(".grimoire-more-actions[open]")];
    for (const more of open) more.open = false;
    if (restoreFocus) open.at(-1)?.querySelector("summary").focus({ preventScroll: true });
    return open.length > 0;
  }
  function onMenuPointerDown(event) {
    const path = event.composedPath();
    // Document capture cannot see the production host's closed shadow tree.
    // Its own root handles presses within that host.
    if (event.currentTarget === document && path.includes(popup.getRootNode().host)) return;
    for (const more of popup.querySelectorAll(".grimoire-more-actions[open]")) {
      if (!path.includes(more)) more.open = false;
    }
  }
  const menuRoot = popup.getRootNode();
  document.addEventListener("pointerdown", onMenuPointerDown, true);
  if (menuRoot !== document) menuRoot.addEventListener("pointerdown", onMenuPointerDown, true);

  function clear() {
    revision += 1;
    for (const control of tools) control.close(false);
    tools = []; images.clear(); groupTabs = []; groupContext = null; availableDictionaries = []; pendingPresentation = null;
    tabs.replaceChildren(); nav.replaceChildren(); scroll.replaceChildren();
    entries = []; owners = []; bindings = []; labels = []; markers = []; frequencies = []; selected = 0; tab = null; onTabSelected = null;
    activeSource = null; paintedFrequency = ""; frequencyDictionaries.clear(); pitchByTerm.clear();
    highlighter?.clear();
    preview.hideImagePreview();
  }
  function finish(candidate, matched, context) {
    activeSource = { candidate, matched };
    if (highlightEnabled) highlighter?.apply(candidate, matched);
    setDefinitionBlurState(context.definitionBlurState ?? "revealed");
    options.positionPopup();
    if (context.restoreScrollTop) scroll.scrollTop = context.restoreScrollTop;
  }
  function navigation(context) {
    if (context.onBack) nav.append(button("gsm-hoshidicts-kanji-back", "Back", context.onBack));
    if (context.onClose) {
      const close = button("gsm-hoshidicts-popup-close", "", context.onClose);
      close.title = "Close";
      close.setAttribute("aria-label", "Close");
      nav.append(close);
    }
  }
  function setDefinitionBlurState(state) { scroll.dataset.definitionBlur = state; }
  function dictionaryLabel(dictionary) {
    const label = node("span", "grimoire-dictionary", dictionary);
    label.dataset.dictionary = dictionary;
    labels.push(label);
    return label;
  }

  // Frequency badges: an open book for counts in a corpus, crossed swords for ranks.
  function paintFrequencies(context) {
    const presentation = context.dictionaryPresentation ?? [];
    const modes = new Map(presentation.map(item => [item.title, item.frequencyMode]));
    const tagsByResult = new Map();
    for (const { element, result } of frequencies) {
      let tags = tagsByResult.get(result);
      if (tags) tags = tags.map(tag => tag.cloneNode(true));
      else {
        tags = components.createFrequencyTags(document, result, presentation, Infinity,
          context.averageFrequency === true, context.showFrequencyDictionaryNames === true,
          context.compactFrequencyNumbers === true, context.showFrequencyTagsWithAverage === true);
        for (const tag of tags) {
          const mode = tag.dataset.frequencyAverage ?? modes.get(tag.dataset.dictionary);
          tag.dataset.grimoireIcon = mode === "occurrence-based" ? "book" : "rank";
        }
        tagsByResult.set(result, tags);
      }
      element.replaceChildren(...tags);
    }
  }
  function updateDictionaryPresentation(context, notify = true) {
    const names = new Map((context.dictionaryPresentation ?? []).map(item => [item.title, item.displayName || item.title]));
    for (const label of labels) {
      const displayName = names.get(label.dataset.dictionary) || label.dataset.dictionary;
      if (label.textContent !== displayName) label.textContent = displayName;
      if (label.title !== displayName) label.title = displayName;
    }
    // Lookup data stays fixed for this view; only these inputs change its badges.
    const frequency = JSON.stringify([context.averageFrequency === true, context.showFrequencyDictionaryNames === true,
      context.compactFrequencyNumbers === true, context.showFrequencyTagsWithAverage === true,
      (context.dictionaryPresentation ?? []).filter(item => frequencyDictionaries.has(item.title))
        .map(({ title, displayName, frequencyMode }) => [title, displayName, frequencyMode])]);
    if (frequency !== paintedFrequency) {
      paintFrequencies(context);
      paintedFrequency = frequency;
    }
    // Markers hold no controls, so a pitch option change repaints them in place
    // without moving focus or touching an open Note draft.
    const pitch = pitchOptions(context);
    if (pitch !== paintedPitch) {
      paintedPitch = pitch;
      pitchByTerm.clear();
      for (const marker of markers) paintPitch(marker, context);
    }
    for (const image of images) image.updatePresentation(context);
    if (groupContext) {
      if (tools.some(control => control.form && !control.form.hidden) || options.canProjectDictionaryPresentation?.() === false) {
        pendingPresentation = context;
        return;
      }
      groupContext = { ...groupContext, ...context };
      renderGroupTabs(availableDictionaries, groupContext, notify);
    }
  }
  function flushDictionaryPresentation() {
    if (!pendingPresentation) return;
    const context = pendingPresentation; pendingPresentation = null;
    updateDictionaryPresentation(context);
  }

  // The first two custom actions are buttons beside Anki, audio and the pencil;
  // the others are listed under More actions.
  function placeCustomActions(actions, buttons) {
    for (const [index, custom] of buttons.entries()) {
      // Inline icons reuse the shared label; More keeps its visible label.
      const label = custom.firstElementChild;
      let icon = custom.querySelector(".grimoire-custom-action-icon");
      if (index < 2) {
        if (icon && icon !== label) icon.remove();
        icon = label;
      } else if (icon === label) {
        label.classList.remove("grimoire-custom-action-icon", "hd-icon");
        label.removeAttribute("aria-hidden");
        delete label.dataset.icon;
        icon = null;
      }
      if (!icon) {
        icon = node("span", "grimoire-custom-action-icon hd-icon");
        custom.append(icon);
      }
      icon.classList.add("grimoire-custom-action-icon", "hd-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.dataset.icon = custom.dataset.customButtonType === "anki" ? "document-add" : "open";
      if (custom.dataset.customButtonType === "link") {
        custom.title = `Open ${custom.dataset.customButtonLabel}`;
        custom.setAttribute("aria-label", custom.title);
      }
    }
    actions.querySelector(".grimoire-more-actions")?.remove();
    if (buttons.length <= 2) return;
    const more = node("details", "grimoire-more-actions");
    const summary = node("summary", "", "⋯");
    summary.setAttribute("aria-label", "More actions");
    summary.title = "More actions";
    const menu = node("div", "grimoire-action-menu");
    // Shared link actions stop bubbling. Capture their activation and dismiss
    // after the action handler runs, keeping its normal semantics.
    const dismiss = event => {
      if (event.button !== (event.type === "auxclick" ? 1 : 0) || !event.target.closest("button")) return;
      queueMicrotask(() => { if (more.isConnected) { more.open = false; summary.focus({ preventScroll: true }); } });
    };
    menu.addEventListener("click", dismiss, true);
    menu.addEventListener("auxclick", dismiss, true);
    menu.append(...buttons.slice(2)); more.append(summary, menu); actions.append(more);
  }
  // The Note form and Anki feedback open on the page, just beneath the banner
  // that holds their buttons. A notice has no page, so its form follows it.
  function insertBelowControls(owner, element) {
    const page = owner.querySelector(":scope > .grimoire-page") ?? owner;
    page.insertBefore(element, page.querySelector(":scope > .grimoire-banner")?.nextSibling ?? null);
  }
  function addTools(actions, owner, prefill, context) {
    const control = components.createLookupActions({ ...options, customButtons,
      idPrefix: `${options.idPrefix || "grimoire"}-${tools.length}`,
      readPrefill: () => prefill, renderContext: context,
      onNoteEditingChange(editing) {
        if (editing) for (const other of tools) if (other !== control) other.close(false);
        options.onNoteEditingChange?.(editing);
      },
      onFormCreated(form) { insertBelowControls(owner, form); options.positionPopup(); },
      onClose: flushDictionaryPresentation,
      onButtonsUpdated: placeCustomActions,
    });
    tools.push(control);
    actions.append(control.actions);
    return control;
  }
  function termPrefill(result, candidate) {
    const exact = candidate?.exactSelection === true;
    return { term: exact ? candidate.query : result.term.expression,
      reading: !exact || candidate.query === result.term.expression ? result.term.reading || "" : "",
      definition: "", sentence: candidate?.sentence || "" };
  }

  function formattedGlossary(parent, glossary, dictionary, context, owner) {
    const content = node("div", "gsm-hoshidicts-glossary-content grimoire-gloss");
    content.dataset.hoshidictsDictionary = dictionary;
    parent.append(content);
    const ownRevision = revision;
    try {
      options.appendTextOnlyGlossary(document, content, glossary, {
        dictionary, generation: context.generation,
        isCurrent: () => ownRevision === revision && owner.isConnected && context.isCurrentRequest?.() !== false,
        isCurrentLink: () => ownRevision === revision && owner.isConnected && !owner.hidden
          && (context.isCurrentView || context.isCurrentRequest)?.() !== false,
        onExternalLink: context.onExternalLink, onInternalLink: context.onInternalLink,
        resolveMedia: context.resolveMedia, imageContext: context,
        onImageCreated: image => images.add(image), onLayoutChange: options.positionPopup,
        requestImagePreview: preview.requestImagePreview, refreshImagePreview: preview.refreshImagePreview,
        hideImagePreview: preview.hideImagePreview,
      });
    } catch (error) {
      content.replaceChildren(node("div", "gsm-hoshidicts-lookup-failure", `Could not render definition: ${error.message}`));
    }
  }
  function tagChips(tags, className = "grimoire-tags") {
    const chips = node("span", className);
    for (const tag of tags) {
      const chip = node("span", "grimoire-tag", tag.name);
      if (tag.notes) chip.title = tag.notes;
      chips.append(chip);
    }
    return chips;
  }
  // Senses numbered in diamonds, each with its glossary. Tags that every sense
  // carries are shown once above them, as JL brackets a tag group every row shares.
  function appendSenses(definitions, rows, dictionary, context, owner) {
    const tagLists = rows.map(row => Array.isArray(row.tags) ? row.tags : tagNames(row.definitionTags).map(name => ({ name })));
    const shared = rows.length > 1
      ? tagLists[0].filter(tag => tagLists.every(list => list.some(other => other.name === tag.name))) : [];
    if (shared.length) definitions.append(tagChips(shared, "grimoire-tags grimoire-shared-tags"));
    const list = node("ol", "grimoire-senses");
    list.dataset.count = String(rows.length);
    definitions.append(list);
    for (const [index, row] of rows.entries()) {
      const sense = node("li", "grimoire-sense");
      list.append(sense);
      const own = tagLists[index].filter(tag => !shared.some(other => other.name === tag.name));
      if (own.length) sense.append(tagChips(own));
      formattedGlossary(sense, row.glossary, dictionary, context, owner);
    }
  }

  // The first pitch accent that fits the text, preferring Design's pitch dictionary.
  function pitchMorae(text, groups, preferred) {
    const ordered = [...groups.filter(group => group.dictionary === preferred),
      ...groups.filter(group => group.dictionary !== preferred)];
    for (const group of ordered) {
      for (const pitch of group.pitches) {
        const morae = components.buildPitchAccentMorae(text, components.pitchAccentPositions(pitch));
        if (morae) return morae;
      }
    }
    return null;
  }
  // A line over high morae and under low ones, joined where the pitch changes.
  function paintPitch({ element, text, term }, context) {
    const morae = pitchByTerm.has(term) ? pitchByTerm.get(term)
      : context.showPitchAccentFurigana === false ? null
        : pitchMorae(text, term.pitches ?? [], context.pitchAccentFuriganaDictionary);
    pitchByTerm.set(term, morae);
    element.dataset.pitchStyle = context.pitchAccentFuriganaStyle === "overline" ? "overline" : "contour";
    if (!morae) {
      element.textContent = text;
      return;
    }
    element.replaceChildren(...morae.map(mora => {
      const span = node("span", "grimoire-mora", mora.text);
      span.dataset.pitch = mora.level;
      if (mora.transition) span.dataset.transition = mora.transition;
      return span;
    }));
  }
  function pitchMarker(element, text, term, context) {
    const marker = { element, text, term };
    markers.push(marker);
    paintPitch(marker, context);
    return element;
  }
  function spelling(result, candidate) {
    const element = node("span", "gsm-hoshidicts-expression grimoire-spelling");
    for (const character of result.term.expression) {
      element.append(HAN.test(character)
        ? button("gsm-hoshidicts-kanji-link", character, event => options.onKanjiClick?.(character, result, candidate, event.currentTarget))
        : document.createTextNode(character));
    }
    return element;
  }
  // The band: spelling, reading, deinflection and frequencies, on every entry.
  function termBand(result, candidate, context) {
    const term = result.term;
    const band = node("div", "grimoire-band");
    const expression = spelling(result, candidate);
    band.append(expression);
    const reading = term.reading && term.reading !== term.expression ? term.reading : "";
    if (reading) band.append(pitchMarker(node("span", "grimoire-reading"), reading, term, context));
    // Without a reading the spelling itself is marked, which only works for kana.
    else if (!HAN.test(term.expression)) pitchMarker(expression, term.expression, term, context);
    const steps = components.deinflectionSteps(result);
    const matched = result.matched || "";
    // The mock-up's trail, 食べたかった ～た→たい: the rules' names without their hyphen.
    const process = steps.length ? `～${steps.map(step => step.name.replace(/^-/u, "")).join("→")}` : "";
    if (process || (matched && matched !== term.expression && matched !== term.reading)) {
      band.append(node("span", "grimoire-deconj", [matched, process].filter(Boolean).join(" ")));
    }
    const groups = (term.frequencies ?? []).filter(group => group.frequencies.length);
    if (groups.length) {
      for (const group of groups) frequencyDictionaries.add(group.dictionary);
      const element = node("span", "grimoire-frequency");
      frequencies.push({ element, result });
      band.append(element);
    }
    return band;
  }
  // An entry: its band, then a page whose banner carries the plaque (a crystal
  // and the dictionary's name) and the entry's controls.
  function appendEntry(band, dictionary, owner, className) {
    const entry = node("article", `gsm-hoshidicts-entry grimoire-entry${className ? ` ${className}` : ""}`);
    entry.tabIndex = -1;
    entry.dataset.dictionary = dictionary;
    const index = entries.length;
    entry.addEventListener("click", () => { selected = index; });
    const page = node("div", "grimoire-page");
    const banner = node("div", "grimoire-banner");
    const plaque = node("span", "grimoire-plaque");
    plaque.append(ornament("grimoire-gem"), dictionaryLabel(dictionary));
    const actions = node("div", "gsm-hoshidicts-entry-actions");
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "Entry actions");
    banner.append(plaque, actions);
    const feedback = node("div", "gsm-hoshidicts-anki-feedback");
    feedback.hidden = true;
    page.append(banner, feedback);
    entry.append(band, page);
    entries.push(entry);
    owners.push(owner);
    // Media ownership checks need the entry attached before its images are requested.
    scroll.append(entry);
    return { entry, page, actions, feedback };
  }
  function termEntry(result, dictionary, rows, candidate, context) {
    // An entry's actions mine and play only its own dictionary, as in JL and Bee.
    const projected = rows.length === result.term.glossaries.length ? result
      : { ...result, term: { ...result.term, glossaries: rows } };
    const { entry, page, actions, feedback } = appendEntry(termBand(result, candidate, context), dictionary, result);
    const audio = components.createAudioControl(document, result.term.expression);
    actions.append(audio.element);
    bindings.push({ audio: { button: audio.button, result: projected }, mining: { actions, feedback, result: projected } });
    addTools(actions, entry, termPrefill(result, candidate), context);
    const definitions = node("div", "gsm-hoshidicts-definitions");
    page.append(definitions);
    appendSenses(definitions, rows, dictionary, context, entry);
  }
  // Like Default's tabs, core binds only the entries the selected tab shows, so
  // keybinds and autoplay follow the tab.
  function shownBindings() {
    const bound = bindings.filter((_, index) => !entries[index].hidden);
    return { audioButtons: bound.flatMap(item => item.audio ? [item.audio] : []), miningActions: bound.map(item => item.mining) };
  }
  // The deinflection trail and frequencies belong to the word, so only the
  // first shown entry of a result carries them; its later entries drop them.
  function markRepeats() {
    let previous = null;
    for (const [index, entry] of entries.entries()) {
      if (entry.hidden) continue;
      const owner = owners[index];
      entry.dataset.grimoireRepeat = String(owner !== null && owner === previous);
      previous = owner;
    }
  }
  function selectGroup(descriptor, notify) {
    const filtered = !!descriptor?.groupId;
    if (notify || entries.some(entry => entry.hidden !== (filtered && !descriptor.dictionaries.has(entry.dataset.dictionary)))) {
      closeActionMenu(false);
    }
    tab = filtered ? { groupId: descriptor.groupId } : null;
    for (const element of tabs.children) element.setAttribute("aria-pressed", String(element.dataset.groupId === descriptor?.groupId));
    for (const entry of entries) entry.hidden = filtered && !descriptor.dictionaries.has(entry.dataset.dictionary);
    markRepeats();
    selected = Math.max(0, entries.findIndex(entry => !entry.hidden));
    if (notify) {
      scroll.scrollTop = 0;
      onTabSelected?.(tab);
      options.onResultsExpanded?.(shownBindings());
    }
  }
  // All, then the configured groups with results, in their saved order. All
  // alone filters nothing, so without a matching group the rail has no tabs.
  function renderGroupTabs(dictionaries, context, notify = false) {
    const descriptors = components.createDictionaryTabs(dictionaries, context).tabs.filter(item => item.key === "all" || item.groupId);
    const active = descriptors.find(item => item.groupId === tab?.groupId) || descriptors[0];
    const previous = JSON.stringify(groupTabs.map(item => [item.groupId, item.label, [...item.dictionaries]]));
    const next = JSON.stringify(descriptors.map(item => [item.groupId, item.label, [...item.dictionaries]]));
    if (previous !== next) {
      const focused = popup.getRootNode().activeElement;
      const focusedTab = focused && tabs.contains(focused);
      tabs.replaceChildren();
      if (descriptors.length > 1) {
        for (const descriptor of descriptors) {
          const element = button("grimoire-tab", descriptor.label, () => selectGroup(descriptor, true));
          if (descriptor.groupId) element.dataset.groupId = descriptor.groupId;
          element.title = descriptor.title;
          tabs.append(element);
        }
      }
      groupTabs = descriptors;
      if (focusedTab) {
        const replacement = [...tabs.children].find(element => element.dataset.groupId === focused.dataset.groupId)
          || tabs.firstElementChild || entries.find(entry => !entry.hidden);
        replacement?.focus({ preventScroll: true });
      }
    }
    const changed = tab?.groupId !== active?.groupId;
    selectGroup(active, false);
    if (changed) onTabSelected?.(tab);
    if (notify) options.onResultsExpanded?.(shownBindings());
  }
  function renderTabs(dictionaries, context) {
    groupContext = context; availableDictionaries = dictionaries;
    tab = context.selectedDictionaryTab?.groupId ? { groupId: context.selectedDictionaryTab.groupId } : null;
    renderGroupTabs(dictionaries, context);
  }
  // Tabs follow the dictionary order in Settings.
  function orderedDictionaries(found, context) {
    const order = (context.dictionaryPresentation ?? []).map(item => item.title);
    return [...order.filter(title => found.includes(title)), ...found.filter(title => !order.includes(title))];
  }

  function renderResults(results, candidate, context = {}) {
    clear();
    paintedPitch = pitchOptions(context);
    onTabSelected = context.onDictionaryTabSelected;
    const found = [];
    for (const result of results) {
      for (const [dictionary, rows] of Map.groupBy(result.term.glossaries, glossary => glossary.dictionary)) {
        if (!found.includes(dictionary)) found.push(dictionary);
        termEntry(result, dictionary, rows, candidate, context);
      }
    }
    renderTabs(orderedDictionaries(found, context), context);
    navigation(context);
    updateDictionaryPresentation(context, false);
    finish(candidate, results[0]?.matched || candidate?.query, context);
    options.onResultsRendered?.({ ...shownBindings(), lookupStats: null });
  }
  // One entry per kanji dictionary: the character, its meanings, then readings and statistics.
  function renderKanji(kanji, candidate, context = {}) {
    clear();
    navigation(context);
    for (const entry of kanji.entries) {
      const band = node("div", "grimoire-band");
      band.append(node("span", "grimoire-spelling grimoire-kanji-character", kanji.character));
      const { entry: block, page, actions, feedback } = appendEntry(band, entry.dictionary, null, "grimoire-kanji");
      const result = { ...components.kanjiEntryResult(kanji.character, entry), generation: context.generation };
      result.term.frequencies = kanji.frequencies ?? [];
      bindings.push({ mining: { actions, feedback, result } });
      addTools(actions, block, { term: kanji.character, reading: "", definition: "", sentence: candidate?.sentence || "" }, context);
      formattedGlossary(page, JSON.stringify(entry.definitions), entry.dictionary, context, block);
      const details = node("div", "grimoire-kanji-details");
      for (const [label, value] of [["On", entry.onyomi], ["Kun", entry.kunyomi]]) {
        const readings = kanjiTokens(value);
        if (!readings.length) continue;
        const row = node("div", "grimoire-kanji-row");
        row.append(node("span", "grimoire-kanji-label", label), node("span", "grimoire-kanji-readings", readings.join("、")));
        details.append(row);
      }
      if (entry.stats?.length) {
        const stats = node("div", "grimoire-kanji-row grimoire-kanji-stats");
        stats.append(node("span", "grimoire-kanji-label", "Statistics"));
        for (const stat of entry.stats) stats.append(node("span", "grimoire-tag", `${stat.name}: ${stat.value}`));
        details.append(stats);
      }
      if (details.children.length) page.append(details);
    }
    onTabSelected = context.onDictionaryTabSelected;
    renderTabs([...new Set(kanji.entries.map(entry => entry.dictionary))], context);
    updateDictionaryPresentation(context, false);
    finish(candidate, context.highlightText || kanji.character, context);
    options.onResultsRendered?.({ ...shownBindings(), lookupStats: null });
  }
  function renderNotice(message, candidate, context = {}) {
    clear(); navigation(context);
    const notice = node("div", "gsm-hoshidicts-lookup-notice", message);
    notice.setAttribute("role", "status"); scroll.append(notice);
    addTools(nav, scroll, { term: candidate?.query || "", reading: "", definition: "", sentence: candidate?.sentence || "" }, context);
    finish(candidate, candidate?.query, context);
  }
  function renderLookupFailure(state, { preserveView = false } = {}) {
    if (!preserveView) clear();
    scroll.querySelector(".gsm-hoshidicts-lookup-failure")?.remove();
    const failure = node("div", "gsm-hoshidicts-lookup-failure", `${state.title}: ${state.detail}`);
    failure.setAttribute("role", "alert");
    if (state.onAction) failure.append(button("", state.actionLabel, state.onAction));
    scroll.append(failure); options.positionPopup();
    return failure;
  }
  return {
    scrollElement: scroll, clear, renderResults, renderKanji, renderNotice, renderLookupFailure,
    captureTermView: () => ({ expandAll: true, restoreScrollTop: scroll.scrollTop, selectedDictionaryTab: tab }),
    currentEntryIndex: () => Math.max(0, shown().indexOf(entries[selected])),
    focusEntry(target) {
      const visible = shown();
      if (!visible.length) return false;
      let position = Math.max(0, visible.indexOf(entries[selected]));
      if (target.dictionary) {
        const found = components.findDifferentDictionary(visible, position, Math.sign(target.dictionary), scroll,
          entry => [entry], entry => entry.dataset.dictionary);
        if (!found) return false;
        position = found.index;
      } else {
        let next = position + target.offset;
        if (target === "first") next = 0;
        else if (target === "last") next = visible.length - 1;
        position = Math.max(0, Math.min(visible.length - 1, next));
      }
      selected = entries.indexOf(visible[position]);
      const top = position === 0 ? 0
        : (visible[position].getBoundingClientRect().top - scroll.getBoundingClientRect().top) * coordinateScale() + scroll.scrollTop;
      scroll.scrollTo({ top, behavior: "instant" });
      return true;
    },
    setDefinitionBlurState, updateDictionaryPresentation, flushDictionaryPresentation,
    hideImagePreview() { preview.hideImagePreview(); },
    closeNoteForm() { return tools.some(control => control.close()); },
    closeActionMenu,
    setCustomButtons(value) {
      customButtons = value || [];
      for (const control of tools) control.setCustomButtons(customButtons);
      options.positionPopup();
    },
    setSourceHighlightEnabled(enabled) {
      highlightEnabled = enabled;
      if (!enabled) highlighter?.clear();
      else if (activeSource) highlighter?.apply(activeSource.candidate, activeSource.matched);
    },
    destroy() {
      clear(); document.removeEventListener("pointerdown", onMenuPointerDown, true);
      menuRoot.removeEventListener("pointerdown", onMenuPointerDown, true);
      preview.destroy(); popup.replaceChildren();
    },
  };
}
export default { schema: 2, slug: "grimoire", contentMode: "rich", createView };
