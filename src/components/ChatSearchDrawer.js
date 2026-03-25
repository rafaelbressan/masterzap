/**
 * ChatSearchDrawer — search within a conversation via a right-side drawer.
 * Shows search input + calendar icon, results with highlighted matches,
 * and navigates to the matched message in the chat.
 *
 * Security note: innerHTML used only for static SVG icon literals.
 * highlightMatch() applies escapeHtml() to all segments before wrapping
 * the match in a static <mark> tag — safe by construction.
 */
import { escapeHtml } from '../lib/utils.js';
import { search, loadSearchIndex, isIndexLoaded } from '../lib/search.js';

const ICON_SEARCH = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_CLEAR = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const DEBOUNCE_MS = 250;

/**
 * @param {HTMLElement} mainArea
 * @param {string} conversationId
 * @param {object} options
 * @param {Array} options.dateIndex
 * @param {function} options.onResultClick - (messageId, date) => void
 * @param {function} options.onDateSelect - (date) => void
 * @param {function} [options.onClose]
 */
export function showChatSearchDrawer(mainArea, conversationId, { dateIndex, onResultClick, onDateSelect, onClose }) {
  const existing = mainArea.querySelector('.chat-search-drawer');
  if (existing) existing.remove();

  const drawer = document.createElement('div');
  drawer.className = 'chat-search-drawer';

  // Header
  const header = document.createElement('div');
  header.className = 'chat-search-drawer-header';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'chat-search-drawer-close';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => { destroy(); if (onClose) onClose(); });
  header.appendChild(closeBtn);

  const titleEl = document.createElement('span');
  titleEl.className = 'chat-search-drawer-title';
  titleEl.textContent = 'Pesquisar mensagens';
  header.appendChild(titleEl);

  drawer.appendChild(header);

  // Search input row
  const inputRow = document.createElement('div');
  inputRow.className = 'chat-search-input-row';

  const searchIconEl = document.createElement('span');
  searchIconEl.className = 'chat-search-input-icon';
  searchIconEl.innerHTML = ICON_SEARCH; // Static SVG
  inputRow.appendChild(searchIconEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chat-search-input';
  input.placeholder = 'Pesquisar...';
  input.setAttribute('aria-label', 'Pesquisar mensagens');
  inputRow.appendChild(input);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'chat-search-clear-btn';
  clearBtn.style.display = 'none';
  clearBtn.innerHTML = ICON_CLEAR; // Static SVG
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    showEmpty();
    input.focus();
  });
  inputRow.appendChild(clearBtn);

  const calendarBtn = document.createElement('button');
  calendarBtn.className = 'chat-search-calendar-btn';
  calendarBtn.setAttribute('aria-label', 'Pesquisar por data');
  calendarBtn.innerHTML = ICON_CALENDAR; // Static SVG
  inputRow.appendChild(calendarBtn);

  drawer.appendChild(inputRow);

  // Results area
  const resultsArea = document.createElement('div');
  resultsArea.className = 'chat-search-results';
  drawer.appendChild(resultsArea);

  // Calendar
  let calendarEl = null;
  calendarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (calendarEl) { calendarEl.remove(); calendarEl = null; return; }
    calendarEl = buildCalendar(dateIndex, (date) => {
      calendarEl.remove();
      calendarEl = null;
      if (onDateSelect) onDateSelect(date);
    });
    drawer.appendChild(calendarEl);
  });

  // Search logic
  let debounceTimer = null;
  let lastQuery = '';

  async function doSearch() {
    const query = input.value.trim();
    clearBtn.style.display = query.length > 0 ? '' : 'none';
    if (query.length < 2) { showEmpty(); lastQuery = ''; return; }
    if (query === lastQuery) return;
    lastQuery = query;

    if (!isIndexLoaded()) {
      try { await loadSearchIndex(conversationId); } catch { return; }
    }

    const results = search(query, { limit: 30 });
    showResults(results);
  }

  function showResults(results) {
    while (resultsArea.firstChild) resultsArea.removeChild(resultsArea.firstChild);
    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-search-empty';
      empty.textContent = 'Nenhum resultado';
      resultsArea.appendChild(empty);
      return;
    }

    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'chat-search-result-item';

      const meta = document.createElement('div');
      meta.className = 'chat-search-result-meta';
      meta.textContent = `${r.date}  ${r.sender === 'DV' ? '✓✓' : ''}`;

      const content = document.createElement('div');
      content.className = 'chat-search-result-content';
      // Escaped segments + static <mark> tag
      content.innerHTML = highlightMatch(r.content, r.matchStart, r.matchEnd);

      item.appendChild(meta);
      item.appendChild(content);
      item.addEventListener('click', () => { if (onResultClick) onResultClick(r.id, r.date); });
      resultsArea.appendChild(item);
    }
  }

  function showEmpty() {
    while (resultsArea.firstChild) resultsArea.removeChild(resultsArea.firstChild);
  }

  function highlightMatch(content, start, end) {
    const before = escapeHtml(content.slice(0, start));
    const match = escapeHtml(content.slice(start, end));
    const after = escapeHtml(content.slice(end));
    return `${before}<mark class="search-highlight">${match}</mark>${after}`;
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { destroy(); if (onClose) onClose(); }
  });

  mainArea.appendChild(drawer);
  requestAnimationFrame(() => { drawer.classList.add('open'); input.focus(); });

  function destroy() {
    clearTimeout(debounceTimer);
    if (calendarEl) { calendarEl.remove(); calendarEl = null; }
    drawer.remove();
    document.removeEventListener('keydown', onEscKey);
  }

  function onEscKey(e) {
    if (e.key === 'Escape') { destroy(); if (onClose) onClose(); }
  }
  document.addEventListener('keydown', onEscKey);

  return { element: drawer, destroy };
}

function buildCalendar(dateIndex, onSelect) {
  const availableDates = new Set(dateIndex.map(d => d.date));
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  const el = document.createElement('div');
  el.className = 'chat-calendar';

  function render() {
    while (el.firstChild) el.removeChild(el.firstChild);

    const nav = document.createElement('div');
    nav.className = 'chat-calendar-nav';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.className = 'chat-calendar-nav-btn';
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); month--; if (month < 0) { month = 11; year--; } render(); });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.className = 'chat-calendar-nav-btn';
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); month++; if (month > 11) { month = 0; year++; } render(); });

    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const label = document.createElement('span');
    label.className = 'chat-calendar-label';
    label.textContent = `${monthNames[month]} ${year}`;

    nav.appendChild(prevBtn);
    nav.appendChild(label);
    nav.appendChild(nextBtn);
    el.appendChild(nav);

    const dayHeaders = document.createElement('div');
    dayHeaders.className = 'chat-calendar-grid';
    for (const d of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
      const hd = document.createElement('span');
      hd.className = 'chat-calendar-header';
      hd.textContent = d;
      dayHeaders.appendChild(hd);
    }
    el.appendChild(dayHeaders);

    const grid = document.createElement('div');
    grid.className = 'chat-calendar-grid';

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'chat-calendar-day empty';
      grid.appendChild(empty);
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('button');
      cell.className = 'chat-calendar-day';
      cell.textContent = d;

      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
        cell.classList.add('today');
      }

      if (availableDates.has(dateStr)) {
        cell.classList.add('has-messages');
        cell.addEventListener('click', (e) => { e.stopPropagation(); onSelect(dateStr); });
      } else {
        cell.classList.add('disabled');
      }

      grid.appendChild(cell);
    }
    el.appendChild(grid);
  }

  render();
  return el;
}
