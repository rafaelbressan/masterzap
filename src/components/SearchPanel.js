/**
 * SearchPanel — the sidebar search, across every conversation, the way
 * WhatsApp Web does it: typing hides the list and shows two sections,
 * "Conversas" (the chats whose name matches, as list rows) and "Mensagens"
 * (the matching messages of all chats, newest first). No count, no cap:
 * more messages are drawn as the reader scrolls, down to the oldest.
 *
 * The chats show at once. The messages wait for the search indexes (the
 * Martha one is 5 MB on a first search) under a loading indicator.
 *
 * Security note: highlightMatch() applies escapeHtml() to ALL three segments
 * (before, match, after) before wrapping the match in a <mark> tag.
 * The <mark> tag itself is a static string literal, not derived from user input.
 */
import { escapeHtml, formatDateShort } from '../lib/utils.js';
import { searchIndex, loadSearchIndex, normalize, isIndexLoaded } from '../lib/search.js';
import { buildConversationItem, conversationName } from './Sidebar.js';

const DEBOUNCE_MS = 200;
/** The double tick WhatsApp puts before the phone owner's own messages. */
const ICON_TICKS = `<svg class="search-result-ticks" viewBox="0 0 16 11" width="16" height="11" aria-hidden="true"><path fill="currentColor" d="M11.07.65a.46.46 0 0 0-.65.08L4.8 7.8 2.07 5.13a.46.46 0 0 0-.65.01.46.46 0 0 0 0 .65l3.08 3.02a.46.46 0 0 0 .69-.05l5.96-7.46a.46.46 0 0 0-.08-.65Zm3.5 0a.46.46 0 0 0-.65.08L8.3 7.8l-.6-.58a.46.46 0 0 0-.64.66l.94.92a.46.46 0 0 0 .69-.05l5.96-7.46a.46.46 0 0 0-.08-.65Z"/></svg>`;
/** Message rows drawn at a time; more as the reader nears the end. */
const PAGE = 50;
/** How close to the end, in pixels, the next page is drawn. */
const NEAR_END_PX = 400;

/**
 * Highlight the matched substring with a <mark> tag.
 * Each segment is independently escaped before concatenation.
 */
function highlightMatch(content, start, end) {
  const before = escapeHtml(content.slice(0, start));
  const match = escapeHtml(content.slice(start, end));
  const after = escapeHtml(content.slice(end));
  return `${before}<mark class="search-highlight">${match}</mark>${after}`;
}

/** The chats whose name matches, those starting with the query first. */
export function matchConversations(conversations, query) {
  const q = normalize(query);
  const matches = [];
  for (const conv of conversations) {
    const name = conversationName(conv);
    const start = normalize(name).indexOf(q);
    if (start === -1) continue;
    // Offsets into the normalized name, which for the names here (composed
    // characters) line up with the name itself.
    matches.push({ conv, name, start, end: start + q.length });
  }
  return matches.sort((a, b) => (a.start === 0 ? 0 : 1) - (b.start === 0 ? 0 : 1)
    || a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Every matching message of every chat, newest first.
 * @param {Array<{conv: object, index: object}>} loaded
 * @returns {Array<object>} search hits, each with its conversation and contact name
 */
export function matchMessages(loaded, query) {
  const hits = [];
  for (const { conv, index } of loaded) {
    const contact = conversationName(conv);
    for (const hit of searchIndex(index, query, { limit: Infinity })) {
      hit.conversationId = conv.id;
      hit.contact = contact;
      hits.push(hit);
    }
  }
  // ISO dates compare as strings. The index has no time, so within a day the
  // order is by message id, which only orders messages of the same chat.
  return hits.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : Number(b.id) - Number(a.id)));
}

/**
 * Attach search behavior to the sidebar.
 * @param {HTMLElement} sidebar - the sidebar element
 * @param {Array<object>} conversations - every conversation, in list order
 * @param {object} callbacks
 * @param {function} callbacks.onConversationClick - (conversationId) => void
 * @param {function} callbacks.onMessageClick - (conversationId, messageId, date) => void
 * @param {function} [callbacks.scope] - () => the conversations to search
 *   (the favorites on that tab); all of them by default
 * @returns {{ destroy: function }}
 */
export function attachSearch(sidebar, conversations, { onConversationClick, onMessageClick, scope = () => conversations }) {
  const input = sidebar.querySelector('.sidebar-search-input');
  const listContainer = sidebar.querySelector('.conversation-list');

  let resultsEl = null;
  let debounceTimer = null;
  let lastQuery = '';
  // Each search is numbered; one that finishes after a newer search, Escape
  // or the panel going away is dropped.
  let searchSeq = 0;
  function cancelSearch() {
    searchSeq++;
    lastQuery = '';
  }

  // The message rows not drawn yet, and where they go.
  let pendingHits = [];
  let messageList = null;

  function onKeyActivate(el, action) {
    el.addEventListener('click', action);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    });
  }

  function section(title) {
    const el = document.createElement('section');
    el.className = 'search-results-section';
    const heading = document.createElement('h2');
    heading.className = 'search-results-heading';
    heading.textContent = title;
    el.appendChild(heading);
    return el;
  }

  function messageRow(hit) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');

    const contactEl = document.createElement('span');
    contactEl.className = 'search-result-sender';
    contactEl.textContent = hit.contact;

    const dateEl = document.createElement('span');
    dateEl.className = 'search-result-date';
    dateEl.textContent = formatDateShort(hit.date);

    const topRow = document.createElement('div');
    topRow.className = 'search-result-top';
    topRow.append(contactEl, dateEl);

    const contentEl = document.createElement('div');
    contentEl.className = 'search-result-content';
    // All segments are escaped individually, <mark> and the ticks are static
    // literals. DV's own messages carry the double tick, as on WhatsApp.
    contentEl.innerHTML = (hit.sender === 'DV' ? ICON_TICKS : '')
      + highlightMatch(hit.content, hit.matchStart, hit.matchEnd);

    item.append(topRow, contentEl);
    onKeyActivate(item, () => onMessageClick(hit.conversationId, hit.id, hit.date));
    return item;
  }

  /** Draw the next page of message rows, if any are left. */
  function drawMore() {
    if (!messageList || !pendingHits.length) return;
    const page = pendingHits.splice(0, PAGE);
    for (const hit of page) messageList.appendChild(messageRow(hit));
  }

  function onResultsScroll() {
    if (!resultsEl) return;
    if (resultsEl.scrollTop + resultsEl.clientHeight >= resultsEl.scrollHeight - NEAR_END_PX) drawMore();
  }

  function showResults() {
    if (resultsEl) return resultsEl;
    resultsEl = document.createElement('div');
    resultsEl.className = 'search-results';
    resultsEl.setAttribute('role', 'region');
    resultsEl.setAttribute('aria-label', 'Resultados da pesquisa');
    resultsEl.addEventListener('scroll', onResultsScroll, { passive: true });
    listContainer.style.display = 'none';
    listContainer.parentNode.insertBefore(resultsEl, listContainer.nextSibling);
    return resultsEl;
  }

  function hideResults() {
    if (resultsEl) {
      resultsEl.remove();
      resultsEl = null;
    }
    pendingHits = [];
    messageList = null;
    listContainer.style.display = '';
  }

  /** The conversation open in the chat area, as the list marks it. */
  function activeId() {
    return listContainer.querySelector('.conversation-item.active')?.dataset.id;
  }

  function emptyState() {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.textContent = 'Nenhuma conversa, contato ou mensagem encontrada';
    return empty;
  }

  /**
   * Draw the results: the chats, then the messages section — loading while
   * `hits` is null.
   */
  function render(chats, hits, { failed = false } = {}) {
    const el = showResults();
    // Redrawn when the messages arrive: the row the keyboard was on keeps it.
    const focusedId = el.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    el.replaceChildren();
    pendingHits = [];
    messageList = null;

    if (chats.length) {
      const chatsSection = section('Conversas');
      const list = document.createElement('div');
      list.setAttribute('role', 'list');
      for (const { conv, name, start, end } of chats) {
        const item = buildConversationItem(conv, { nameHtml: highlightMatch(name, start, end) });
        // The open chat is marked as in the list.
        item.classList.toggle('active', conv.id === activeId());
        onKeyActivate(item, () => onConversationClick(conv.id));
        list.appendChild(item);
      }
      chatsSection.appendChild(list);
      el.appendChild(chatsSection);
      // Read badges as in the list (an opened chat shows none).
      sidebar.refreshReadState?.();
      if (focusedId) list.querySelector(`[data-id="${CSS.escape(focusedId)}"]`)?.focus();
    }

    if (hits === null) {
      const messages = section('Mensagens');
      const loading = document.createElement('div');
      loading.className = 'search-loading';
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-label', 'Pesquisando mensagens');
      messages.appendChild(loading);
      el.appendChild(messages);
      return;
    }

    if (hits.length) {
      const messages = section('Mensagens');
      messageList = document.createElement('div');
      messageList.setAttribute('role', 'list');
      messages.appendChild(messageList);
      el.appendChild(messages);
      pendingHits = hits.slice();
      drawMore();
    }

    if (failed) {
      const note = document.createElement('div');
      note.className = 'search-empty';
      note.textContent = 'Não foi possível pesquisar todas as mensagens';
      el.appendChild(note);
    } else if (!chats.length && !hits.length) {
      el.appendChild(emptyState());
    }
    // A short first page may not fill the panel; keep drawing until it does.
    while (pendingHits.length && el.scrollHeight <= el.clientHeight + NEAR_END_PX && el.clientHeight > 0) drawMore();
  }

  async function onInput() {
    const query = input.value.trim();

    // Two letters at least, counted after accents go (a lone accent is nothing).
    if (normalize(query).length < 2) {
      hideResults();
      cancelSearch();
      return;
    }

    const searched = scope();
    // The same words over the same chats: nothing to redo. A tab change
    // (Favoritas) changes the chats.
    const key = `${query}\u0000${searched.map(c => c.id).join(',')}`;
    if (key === lastQuery) return;
    lastQuery = key;
    const seq = ++searchSeq;

    const chats = matchConversations(searched, query);
    // Every index already here (any search after the first): no loading step,
    // or the messages would blink out and back on each key.
    const ready = searched.every(conv => isIndexLoaded(conv.id));
    if (!ready) render(chats, null);

    const settled = await Promise.allSettled(searched.map(conv => loadSearchIndex(conv.id)));
    // A newer search, Escape or the panel going away came first.
    if (seq !== searchSeq) return;

    const loaded = [];
    let failed = false;
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') loaded.push({ conv: searched[i], index: result.value });
      else {
        failed = true;
        console.error(`Failed to load search index for ${searched[i].id}:`, result.reason);
      }
    });
    // The same words may try again after a failure.
    if (failed) lastQuery = '';
    render(chats, matchMessages(loaded, query), { failed });
  }

  function onInputDebounced() {
    clearTimeout(debounceTimer);
    // Cleared (the X, or the text deleted): back to the list at once, so a
    // search still on its way cannot draw results under an empty field.
    if (!input.value.trim()) {
      cancelSearch();
      hideResults();
      return;
    }
    debounceTimer = setTimeout(onInput, DEBOUNCE_MS);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cancelSearch();
      input.value = '';
      hideResults();
      input.blur();
    }
  }

  input.addEventListener('input', onInputDebounced);
  input.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      clearTimeout(debounceTimer);
      cancelSearch();
      hideResults();
      input.removeEventListener('input', onInputDebounced);
      input.removeEventListener('keydown', onKeyDown);
    },
  };
}
