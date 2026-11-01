// Each result has one header: spelling, reading with pitch, deinflection,
// frequencies and one set of audio, Anki and Note buttons for the whole word,
// as in Default. A gold rule then opens a section per dictionary.
// SPDX-License-Identifier: GPL-3.0-or-later
const HAN = /\p{Script=Han}/u;
const kanjiTokens = value => Array.isArray(value) ? value : String(value || "").split(/\s+/u).filter(Boolean);
// Yomitan separates tags with spaces; a no-break space stays inside a tag.
const tagNames = value => String(value || "").split(" ").filter(Boolean);
// A first popup would otherwise wait for the serif faces and the stylesheet's
// SVG ornaments, as Crystal's did. When the top frame loads the theme,
// measuring a few characters in the serif stack loads the faces and decoding
// the ornaments prepares them. SERIF is theme.css's --citadel-serif.
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
  const bar = node("div", "citadel-bar");
  const nav = node("div", "citadel-nav");
  const tabs = node("div", "citadel-tabs");
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Dictionary groups");
  bar.append(nav, tabs);
  const scroll = node("div", "citadel-scroll");
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
  // entries: what keybinds index. A word's result owns its header, buttons and
  // sections; a kanji view's entries are its dictionaries' sections.
  // heads: one per result, with the sections it introduces.
  let activeSource, entries = [], heads = [], selected = 0, tab = null, onTabSelected = null;
  let labels = [], markers = [], tools = [], groupTabs = [], groupContext = null, availableDictionaries = [];
  let revision = 0, pendingPresentation = null, paintedPitch = "", paintedFrequency = "";
  const frequencyDictionaries = new Set(), pitchByTerm = new Map(), images = new Set();
  let customButtons = options.customButtons || [];
  const pitchOptions = context => JSON.stringify([context.showPitchAccentFurigana !== false,
    context.pitchAccentFuriganaDictionary ?? "", context.pitchAccentFuriganaStyle === "overline" ? "overline" : "contour"]);
  const shown = () => entries.filter(entry => !entry.element.hidden);

  function closeActionMenu(restoreFocus = true) {
    const open = [...popup.querySelectorAll(".citadel-more-actions[open]")];
    for (const more of open) more.open = false;
    if (restoreFocus) open.at(-1)?.querySelector("summary").focus({ preventScroll: true });
    return open.length > 0;
  }
  function onMenuPointerDown(event) {
    const path = event.composedPath();
    // Document capture cannot see the production host's closed shadow tree.
    // Its own root handles presses within that host.
    if (event.currentTarget === document && path.includes(popup.getRootNode().host)) return;
    for (const more of popup.querySelectorAll(".citadel-more-actions[open]")) {
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
    entries = []; heads = []; labels = []; markers = []; selected = 0; tab = null; onTabSelected = null;
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
    const label = node("span", "citadel-dictionary", dictionary);
    label.dataset.dictionary = dictionary;
    labels.push(label);
    return label;
  }

  function paintFrequencies(context) {
    const presentation = context.dictionaryPresentation ?? [];
    for (const head of heads) {
      if (!head.frequency) continue;
      head.frequency.replaceChildren(...components.createFrequencyTags(document, head.result, presentation, Infinity,
        context.averageFrequency === true, context.showFrequencyDictionaryNames === true,
        context.compactFrequencyNumbers === true, context.showFrequencyTagsWithAverage === true));
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

  // The first two custom actions are icons beside audio, Anki and the pencil;
  // the others are listed under More actions.
  function placeCustomActions(actions, buttons) {
    for (const [index, custom] of buttons.entries()) {
      // Inline icons reuse the shared label; More keeps its visible label.
      const label = custom.firstElementChild;
      let icon = custom.querySelector(".citadel-custom-action-icon");
      if (index < 2) {
        if (icon && icon !== label) icon.remove();
        icon = label;
      } else if (icon === label) {
        label.classList.remove("citadel-custom-action-icon", "hd-icon");
        label.removeAttribute("aria-hidden");
        delete label.dataset.icon;
        icon = null;
      }
      if (!icon) {
        icon = node("span", "citadel-custom-action-icon hd-icon");
        custom.append(icon);
      }
      icon.classList.add("citadel-custom-action-icon", "hd-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.dataset.icon = custom.dataset.customButtonType === "anki" ? "document-add" : "open";
      if (custom.dataset.customButtonType === "link") {
        custom.title = `Open ${custom.dataset.customButtonLabel}`;
        custom.setAttribute("aria-label", custom.title);
      }
    }
    actions.querySelector(".citadel-more-actions")?.remove();
    if (buttons.length <= 2) return;
    const more = node("details", "citadel-more-actions");
    const summary = node("summary", "", "⋯");
    summary.setAttribute("aria-label", "More actions");
    summary.title = "More actions";
    const menu = node("div", "citadel-action-menu");
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
  // The Note form and Anki feedback open just beneath the row that holds their
  // buttons: a word's header, or a kanji section's title. A notice has
  // neither, so its form follows the notice.
  const insertBelow = (row, element) => row.parentNode.insertBefore(element, row.nextSibling);
  function addTools(actions, row, prefill, context) {
    const control = components.createLookupActions({ ...options, customButtons,
      idPrefix: `${options.idPrefix || "citadel"}-${tools.length}`,
      readPrefill: () => prefill, renderContext: context,
      onNoteEditingChange(editing) {
        if (editing) for (const other of tools) if (other !== control) other.close(false);
        options.onNoteEditingChange?.(editing);
      },
      onFormCreated(form) {
        if (row) insertBelow(row, form);
        else scroll.append(form);
        options.positionPopup();
      },
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
  function entryActions() {
    const actions = node("div", "gsm-hoshidicts-entry-actions");
    actions.setAttribute("role", "group");
    actions.setAttribute("aria-label", "Entry actions");
    return actions;
  }
  function feedbackSlot(row) {
    const feedback = node("div", "gsm-hoshidicts-anki-feedback");
    feedback.hidden = true;
    insertBelow(row, feedback);
    return feedback;
  }

  function formattedGlossary(parent, glossary, dictionary, context, owner) {
    const content = node("div", "gsm-hoshidicts-glossary-content citadel-gloss");
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
  // Numbered senses when there are several: the number, the sense's tags as
  // chips, then its formatted glossary.
  function appendSenses(definitions, rows, dictionary, context, owner) {
    const list = node("ol", "citadel-senses");
    list.dataset.count = String(rows.length);
    // Ten senses or more need a wider number column.
    if (rows.length >= 10) list.dataset.digits = String(String(rows.length).length);
    definitions.append(list);
    for (const row of rows) {
      const sense = node("li", "citadel-sense");
      list.append(sense);
      const tags = Array.isArray(row.tags) ? row.tags : tagNames(row.definitionTags).map(name => ({ name }));
      if (tags.length) {
        const chips = node("span", "citadel-tags");
        for (const tag of tags) {
          const chip = node("span", "citadel-tag", tag.name);
          if (tag.notes) chip.title = tag.notes;
          chips.append(chip);
        }
        sense.append(chips);
      }
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
      const span = node("span", "citadel-mora", mora.text);
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
    const element = node("span", "gsm-hoshidicts-expression citadel-spelling");
    for (const character of result.term.expression) {
      element.append(HAN.test(character)
        ? button("gsm-hoshidicts-kanji-link", character, event => options.onKanjiClick?.(character, result, candidate, event.currentTarget))
        : document.createTextNode(character));
    }
    return element;
  }
  // One header per result, then its sections.
  function appendHead(result, word) {
    const article = node("article", "citadel-result");
    const head = node("div", "citadel-head");
    const line = node("div", "citadel-word");
    line.append(word);
    head.append(line);
    article.append(head);
    scroll.append(article);
    const record = { article, head, line, result, frequency: null, sections: [] };
    heads.push(record);
    return record;
  }
  // Clicking an entry makes it the one keyboard actions use.
  function addEntry(entry) {
    const index = entries.length;
    entries.push(entry);
    entry.element.tabIndex = -1;
    entry.element.classList.add("gsm-hoshidicts-entry");
    entry.element.addEventListener("click", () => { selected = index; });
    return entry;
  }
  function termHead(result, candidate, context) {
    const term = result.term;
    const expression = spelling(result, candidate);
    const record = appendHead(result, expression);
    const reading = term.reading && term.reading !== term.expression ? term.reading : "";
    if (reading) record.line.append(pitchMarker(node("span", "citadel-reading"), reading, term, context));
    // Without a reading the spelling itself is marked, which only works for kana.
    else if (!HAN.test(term.expression)) pitchMarker(expression, term.expression, term, context);
    const steps = components.deinflectionSteps(result);
    const matched = result.matched || "";
    // The mock-up's trail, 食べたかった ～た→たい: the rules' names without their hyphen.
    const process = steps.length ? `～${steps.map(step => step.name.replace(/^-/u, "")).join("→")}` : "";
    if (process || (matched && matched !== term.expression && matched !== term.reading)) {
      record.line.append(node("span", "citadel-deconj", [matched, process].filter(Boolean).join(" ")));
    }
    const groups = (term.frequencies ?? []).filter(group => group.frequencies.length);
    for (const group of groups) frequencyDictionaries.add(group.dictionary);
    if (groups.length) {
      record.frequency = node("span", "citadel-frequency");
      record.line.append(record.frequency);
    }
    // One set of buttons for the word: Anki (which core adds first), audio,
    // the pencil and custom actions.
    const actions = entryActions();
    const audio = components.createAudioControl(document, term.expression);
    actions.append(audio.element);
    record.head.append(actions);
    const feedback = feedbackSlot(record.head);
    addTools(actions, record.head, termPrefill(result, candidate), context);
    addEntry({ element: record.article, sections: record.sections, result, audio: audio.button, actions, feedback });
    return record;
  }
  // A dictionary's section: a gold rule, the book and its name, then content.
  function appendSection(head, dictionary, className) {
    const section = node("section", `citadel-section${className ? ` ${className}` : ""}`);
    section.dataset.dictionary = dictionary;
    const title = node("div", "citadel-title");
    title.append(ornament("citadel-book"), dictionaryLabel(dictionary));
    section.append(title);
    head.sections.push(section);
    // Media ownership checks need the section attached before its images are requested.
    head.article.append(section);
    return { section, title };
  }
  function termSection(head, dictionary, rows, context) {
    const { section } = appendSection(head, dictionary);
    const definitions = node("div", "gsm-hoshidicts-definitions");
    section.append(definitions);
    appendSenses(definitions, rows, dictionary, context, section);
  }
  // A word's buttons mine and play the dictionaries its shown sections hold;
  // a kanji section's, its own entry.
  function binding(entry) {
    let { result } = entry;
    if (entry.audio) {
      const kept = new Set(entry.sections.filter(section => !section.hidden).map(section => section.dataset.dictionary));
      const rows = result.term.glossaries.filter(row => kept.has(row.dictionary));
      if (rows.length !== result.term.glossaries.length) result = { ...result, term: { ...result.term, glossaries: rows } };
    }
    return { audio: entry.audio ? { button: entry.audio, result } : null,
      mining: { actions: entry.actions, feedback: entry.feedback, result } };
  }
  // Like Default's tabs, core binds only what the selected tab shows, so
  // keybinds and autoplay follow the tab.
  function shownBindings() {
    const bound = shown().map(binding);
    return { audioButtons: bound.flatMap(item => item.audio ? [item.audio] : []), miningActions: bound.map(item => item.mining) };
  }
  // A group shows the results with a section in it. All shows every result,
  // including a word that only frequency or pitch dictionaries have, as Default does.
  function showResults(filtered) {
    for (const head of heads) head.article.hidden = filtered && !head.sections.some(section => !section.hidden);
  }
  function selectGroup(descriptor, notify) {
    const filtered = !!descriptor?.groupId;
    const sections = heads.flatMap(head => head.sections);
    if (notify || sections.some(section => section.hidden !== (filtered && !descriptor.dictionaries.has(section.dataset.dictionary)))) {
      closeActionMenu(false);
    }
    tab = filtered ? { groupId: descriptor.groupId } : null;
    for (const element of tabs.children) element.setAttribute("aria-pressed", String(element.dataset.groupId === descriptor?.groupId));
    for (const section of sections) section.hidden = filtered && !descriptor.dictionaries.has(section.dataset.dictionary);
    showResults(filtered);
    selected = Math.max(0, entries.findIndex(entry => !entry.element.hidden));
    if (notify) {
      scroll.scrollTop = 0;
      onTabSelected?.(tab);
      options.onResultsExpanded?.(shownBindings());
    }
  }
  // All, then the configured groups with results, in their saved order.
  function renderGroupTabs(dictionaries, context, notify = false) {
    const descriptors = components.createDictionaryTabs(dictionaries, context).tabs.filter(item => item.key === "all" || item.groupId);
    const active = descriptors.find(item => item.groupId === tab?.groupId) || descriptors[0];
    const previous = JSON.stringify(groupTabs.map(item => [item.groupId, item.label, [...item.dictionaries]]));
    const next = JSON.stringify(descriptors.map(item => [item.groupId, item.label, [...item.dictionaries]]));
    if (previous !== next) {
      const focused = popup.getRootNode().activeElement;
      const focusedTab = focused && tabs.contains(focused);
      tabs.replaceChildren();
      for (const descriptor of descriptors) {
        const element = button("citadel-tab", descriptor.label, () => selectGroup(descriptor, true));
        if (descriptor.groupId) element.dataset.groupId = descriptor.groupId;
        element.title = descriptor.title;
        tabs.append(element);
      }
      groupTabs = descriptors;
      if (focusedTab) {
        const replacement = [...tabs.children].find(element => element.dataset.groupId === focused.dataset.groupId)
          || tabs.firstElementChild || shown()[0]?.element;
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
      const head = termHead(result, candidate, context);
      for (const [dictionary, rows] of Map.groupBy(result.term.glossaries, glossary => glossary.dictionary)) {
        if (!found.includes(dictionary)) found.push(dictionary);
        termSection(head, dictionary, rows, context);
      }
    }
    renderTabs(orderedDictionaries(found, context), context);
    navigation(context);
    updateDictionaryPresentation(context, false);
    finish(candidate, results[0]?.matched || candidate?.query, context);
    options.onResultsRendered?.({ ...shownBindings(), lookupStats: null });
  }
  // The character once, then each kanji dictionary's meanings and readings,
  // with that dictionary's own buttons on its title row.
  function renderKanji(kanji, candidate, context = {}) {
    clear();
    navigation(context);
    const head = appendHead(null, node("span", "citadel-spelling citadel-kanji-character", kanji.character));
    for (const entry of kanji.entries) {
      const { section, title } = appendSection(head, entry.dictionary, "citadel-kanji");
      const result = { ...components.kanjiEntryResult(kanji.character, entry), generation: context.generation };
      result.term.frequencies = kanji.frequencies ?? [];
      const actions = entryActions();
      title.append(actions);
      const feedback = feedbackSlot(title);
      addEntry({ element: section, sections: [section], result, audio: null, actions, feedback });
      addTools(actions, title, { term: kanji.character, reading: "", definition: "", sentence: candidate?.sentence || "" }, context);
      formattedGlossary(section, JSON.stringify(entry.definitions), entry.dictionary, context, section);
      const details = node("div", "citadel-kanji-details");
      for (const [label, value] of [["On", entry.onyomi], ["Kun", entry.kunyomi]]) {
        const readings = kanjiTokens(value);
        if (!readings.length) continue;
        const row = node("div", "citadel-kanji-row");
        row.append(node("span", "citadel-kanji-label", label), node("span", "citadel-kanji-readings", readings.join("、")));
        details.append(row);
      }
      if (entry.stats?.length) {
        const stats = node("div", "citadel-kanji-row citadel-kanji-stats");
        stats.append(node("span", "citadel-kanji-label", "Statistics"));
        for (const stat of entry.stats) stats.append(node("span", "citadel-tag", `${stat.name}: ${stat.value}`));
        details.append(stats);
      }
      if (details.children.length) section.append(details);
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
    addTools(nav, null, { term: candidate?.query || "", reading: "", definition: "", sentence: candidate?.sentence || "" }, context);
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
  function scrollTo(position, target) {
    const top = position === 0 && target === shown()[0]?.element ? 0
      : (target.getBoundingClientRect().top - scroll.getBoundingClientRect().top) * coordinateScale() + scroll.scrollTop;
    scroll.scrollTo({ top, behavior: "instant" });
  }
  return {
    scrollElement: scroll, clear, renderResults, renderKanji, renderNotice, renderLookupFailure,
    captureTermView: () => ({ expandAll: true, restoreScrollTop: scroll.scrollTop, selectedDictionaryTab: tab }),
    currentEntryIndex: () => Math.max(0, shown().indexOf(entries[selected])),
    focusEntry(target) {
      const visible = shown();
      if (!visible.length) return false;
      let position = Math.max(0, visible.indexOf(entries[selected]));
      let element;
      if (target.dictionary) {
        // Yomitan's next or previous definition from another dictionary: here
        // the nearest section of another dictionary, in this or another word.
        const found = components.findDifferentDictionary(visible, position, Math.sign(target.dictionary), scroll,
          entry => entry.sections.filter(section => !section.hidden), section => section.dataset.dictionary);
        if (!found) return false;
        position = found.index;
        element = found.target;
      } else {
        let next = position + target.offset;
        if (target === "first") next = 0;
        else if (target === "last") next = visible.length - 1;
        position = Math.max(0, Math.min(visible.length - 1, next));
        element = visible[position].element;
      }
      selected = entries.indexOf(visible[position]);
      scrollTo(position, element);
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
export default { schema: 2, slug: "citadel", contentMode: "rich", createView };
