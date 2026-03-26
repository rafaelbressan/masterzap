/**
 * SearchPanel — renders search results in the sidebar area.
 *
 * Appears when the user types in the search input. Shows matching messages
 * with highlighted query text. Clicking a result navigates to that message.
 *
 * Security note: highlightMatch() applies escapeHtml() to ALL three segments
 * (before, match, after) before wrapping the match in a <mark> tag.
 * The <mark> tag itself is a static string literal, not derived from user input.
 */
import { escapeHtml, formatDateShort } from '../lib/utils.js';
import { search, loadSearchIndex, isIndexLoaded } from '../lib/search.js';

const DEBOUNCE_MS = 200;

/**
 * Attach search behavior to the sidebar.
 * @param {HTMLElement} sidebar - the sidebar element
 * @param {string} conversationId - id of the conversation to search
 * @param {function} onResultClick - (messageId, date) => void
 * @returns {{ destroy: function }}
 */
export function attachSearch(sidebar, conversationId, onResultClick) {
  const input = sidebar.querySelector('.sidebar-search-input');
  const listContainer = sidebar.querySelector('.conversation-list');

  let resultsEl = null;
  let debounceTimer = null;
  let lastQuery = '';

  function showResults(results, query) {
    hideResults();

    resultsEl = document.createElement('div');
    resultsEl.className = 'search-results';
    resultsEl.setAttribute('role', 'listbox');
    resultsEl.setAttribute('aria-label', 'Resultados da pesquisa');

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'Nenhuma mensagem encontrada';
      resultsEl.appendChild(empty);
    } else {
      for (const result of results) {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');

        const senderEl = document.createElement('span');
        senderEl.className = 'search-result-sender';
        senderEl.textContent = result.sender;

        const dateEl = document.createElement('span');
        dateEl.className = 'search-result-date';
        dateEl.textContent = formatDateShort(result.date);

        const topRow = document.createElement('div');
        topRow.className = 'search-result-top';
        topRow.appendChild(senderEl);
        topRow.appendChild(dateEl);

        const contentEl = document.createElement('div');
        contentEl.className = 'search-result-content';
        // All segments are escaped individually, <mark> is a static literal
        contentEl.innerHTML = highlightMatch(result.content, result.matchStart, result.matchEnd);

        item.appendChild(topRow);
        item.appendChild(contentEl);

        item.addEventListener('click', () => {
          onResultClick(result.id, result.date);
        });
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onResultClick(result.id, result.date);
          }
        });

        resultsEl.appendChild(item);
      }
    }

    // Show results, hide conversation list
    listContainer.style.display = 'none';
    listContainer.parentNode.insertBefore(resultsEl, listContainer.nextSibling);
  }

  function hideResults() {
    if (resultsEl) {
      resultsEl.remove();
      resultsEl = null;
    }
    listContainer.style.display = '';
  }

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

  async function onInput() {
    const query = input.value.trim();

    if (query.length < 2) {
      hideResults();
      lastQuery = '';
      return;
    }

    if (query === lastQuery) return;
    lastQuery = query;

    // Load index on first search
    if (!isIndexLoaded()) {
      try {
        await loadSearchIndex(conversationId);
      } catch (err) {
        console.error('Failed to load search index:', err);
        return;
      }
    }

    const results = search(query, { limit: 50 });
    showResults(results, query);
  }

  function onInputDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onInput, DEBOUNCE_MS);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
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
      hideResults();
      input.removeEventListener('input', onInputDebounced);
      input.removeEventListener('keydown', onKeyDown);
    },
  };
}
