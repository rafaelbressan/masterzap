/**
 * MobileSearchBar — replaces chat header with inline search on mobile.
 * Navigate results with up/down arrows, highlights matched messages in chat.
 * Shows toast when no results found.
 *
 * Security note: innerHTML used only for static SVG icon literals.
 */
import { search, loadSearchIndex, isIndexLoaded } from '../lib/search.js';

const DEBOUNCE_MS = 300;

const ICON_BACK = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const ICON_UP = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const ICON_DOWN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const TOAST_LOGO = `<svg viewBox="0 0 39 39" width="28" height="28"><path fill="#1DAA61" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-16 16 0 2.9.8 5.7 2.4 8.2l.4.6-1.5 5.5 5.6-1.5z"/><text x="19.5" y="19.5" text-anchor="middle" dominant-baseline="central" fill="#FFF" font-family="Roboto,Arial,sans-serif" font-size="18" font-weight="700">$</text></svg>`;

/**
 * @param {HTMLElement} chatView - the .chat-view element
 * @param {string} conversationId
 * @param {object} options
 * @param {function} options.onNavigate - (messageId, date) => void
 * @param {function} options.onClose
 * @returns {{ destroy: function }}
 */
export function showMobileSearchBar(chatView, conversationId, { onNavigate, onClose }) {
  const header = chatView.querySelector('.chat-header');
  if (!header) return { destroy() {} };

  // Hide original header
  header.style.display = 'none';

  // Create search bar
  const bar = document.createElement('div');
  bar.className = 'mobile-search-bar';

  const backBtn = document.createElement('button');
  backBtn.className = 'mobile-search-back';
  backBtn.setAttribute('aria-label', 'Fechar pesquisa');
  backBtn.innerHTML = ICON_BACK; // Static SVG
  backBtn.addEventListener('click', destroy);
  bar.appendChild(backBtn);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'mobile-search-input';
  input.placeholder = 'Pesquisar...';
  input.setAttribute('aria-label', 'Pesquisar mensagens');
  bar.appendChild(input);

  const upBtn = document.createElement('button');
  upBtn.className = 'mobile-search-nav-btn';
  upBtn.setAttribute('aria-label', 'Resultado anterior');
  upBtn.innerHTML = ICON_UP; // Static SVG
  upBtn.style.display = 'none';
  bar.appendChild(upBtn);

  const downBtn = document.createElement('button');
  downBtn.className = 'mobile-search-nav-btn';
  downBtn.setAttribute('aria-label', 'Próximo resultado');
  downBtn.innerHTML = ICON_DOWN; // Static SVG
  downBtn.style.display = 'none';
  bar.appendChild(downBtn);

  // Insert before header
  header.parentNode.insertBefore(bar, header);

  let results = [];
  let currentIndex = -1;
  let debounceTimer = null;

  async function doSearch() {
    const query = input.value.trim();
    if (query.length < 2) {
      results = [];
      currentIndex = -1;
      upBtn.style.display = 'none';
      downBtn.style.display = 'none';
      return;
    }

    if (!isIndexLoaded()) {
      try { await loadSearchIndex(conversationId); } catch { return; }
    }

    results = search(query, { limit: 100 });

    if (results.length === 0) {
      showToast();
      upBtn.style.display = 'none';
      downBtn.style.display = 'none';
      currentIndex = -1;
      return;
    }

    upBtn.style.display = '';
    downBtn.style.display = '';
    currentIndex = 0;
    navigateTo(0);
  }

  function navigateTo(index) {
    if (results.length === 0) return;
    currentIndex = index;
    const r = results[currentIndex];
    if (onNavigate) onNavigate(r.id, r.date);
  }

  upBtn.addEventListener('click', () => {
    if (results.length === 0) return;
    currentIndex = (currentIndex - 1 + results.length) % results.length;
    navigateTo(currentIndex);
  });

  downBtn.addEventListener('click', () => {
    if (results.length === 0) return;
    currentIndex = (currentIndex + 1) % results.length;
    navigateTo(currentIndex);
  });

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') destroy();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        currentIndex = (currentIndex + 1) % results.length;
        navigateTo(currentIndex);
      }
    }
  });

  requestAnimationFrame(() => input.focus());

  function showToast() {
    const existing = chatView.querySelector('.search-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'search-toast';

    const logo = document.createElement('div');
    logo.className = 'search-toast-logo';
    logo.innerHTML = TOAST_LOGO; // Static SVG
    toast.appendChild(logo);

    const text = document.createElement('span');
    text.textContent = 'Nenhum resultado encontrado';
    toast.appendChild(text);

    chatView.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function destroy() {
    clearTimeout(debounceTimer);
    bar.remove();
    header.style.display = '';
    const toast = chatView.querySelector('.search-toast');
    if (toast) toast.remove();
    if (onClose) onClose();
  }

  return { destroy };
}
