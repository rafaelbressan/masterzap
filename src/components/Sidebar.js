/**
 * Sidebar component — renders the conversation list panel.
 *
 * Security note: innerHTML is used with static SVGs and data from our own
 * bundled JSON files (not user input), so XSS risk does not apply here.
 */
import { formatTime, escapeHtml, formatNumber, formatRelativeDate } from '../lib/utils.js';

const SEARCH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const DEFAULT_AVATAR = `<svg viewBox="0 0 212 212"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.251 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"/><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-2.608-3.299 70.112 70.112 0 00-3.184-3.527 71.097 71.097 0 00-5.924-5.47 72.458 72.458 0 00-10.204-7.026 75.2 75.2 0 00-5.98-3.055c-.218-.095-.436-.19-.656-.28a78.436 78.436 0 00-10.457-3.467c-1.08-.282-2.163-.545-3.25-.783a79.975 79.975 0 00-4.083-.816 82.3 82.3 0 00-7.034-.856 87.82 87.82 0 00-11.373-.36 85.075 85.075 0 00-7.19.488 82.473 82.473 0 00-3.626.542c-1.388.239-2.771.508-4.148.815-1.084.238-2.165.501-3.241.783a78.41 78.41 0 00-10.467 3.467c-.219.09-.437.185-.654.28a75.37 75.37 0 00-5.986 3.055 72.56 72.56 0 00-10.198 7.027 71.168 71.168 0 00-5.924 5.47 69.933 69.933 0 00-3.187 3.527c-.906 1.076-1.776 2.176-2.608 3.299a63.105 63.105 0 00-2.065 2.955 56.961 56.961 0 00-1.86 3.211 28.89 28.89 0 0117.373-9.752 36.505 36.505 0 011.404-.387c3.7-.915 7.533-1.373 11.444-1.373h.312c9.647.109 18.857 2.604 27.089 6.94.022.011.045.02.067.032a54.543 54.543 0 016.404 4.11c.327.244.65.494.971.748l.004.002a60.49 60.49 0 012.21 1.904l.002.003.142.13.166.149c.09.08.178.164.268.245a41.078 41.078 0 002.242-1.906l.004-.004c.321-.254.644-.503.971-.747a54.616 54.616 0 016.404-4.11c.021-.011.043-.021.065-.031 8.233-4.337 17.443-6.832 27.09-6.941h.312c3.91 0 7.744.459 11.444 1.373.474.117.941.248 1.404.387a28.88 28.88 0 0117.373 9.752 56.68 56.68 0 00-1.86-3.211z"/><path fill="#FFF" d="M106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 003.624-.896 37.124 37.124 0 005.12-2.023 36.413 36.413 0 006.15-4.02 37.172 37.172 0 005.088-5.088 36.483 36.483 0 004.02-6.15 37.318 37.318 0 002.023-5.12 38.689 38.689 0 00.896-3.624 39.321 39.321 0 00.737-7.68c0-20.933-17.006-37.939-37.938-37.939S68.064 69.63 68.064 90.562s17.006 37.938 37.938 37.938z"/></svg>`;

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {Array} options.conversations
 * @param {function} options.onSelect - called with conversation id
 */
export function renderSidebar(container, { conversations, onSelect }) {
  const el = document.createElement('aside');
  el.className = 'sidebar';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Lista de conversas');

  // Static sidebar chrome — safe innerHTML (no user input)
  el.innerHTML = `
    <div class="sidebar-header">
      <span class="sidebar-header-title">MasterWhats</span>
    </div>
    <div class="sidebar-search">
      <div class="sidebar-search-wrapper">
        <span class="sidebar-search-icon">${SEARCH_ICON}</span>
        <input
          type="text"
          class="sidebar-search-input"
          placeholder="Pesquisar nas favoritas"
          aria-label="Pesquisar conversas"
        />
      </div>
    </div>
    <div class="sidebar-tags">
      <button class="sidebar-tag">Todas</button>
      <button class="sidebar-tag">Não lidas <span class="sidebar-tag-count">65.772</span></button>
      <button class="sidebar-tag active">Favoritas</button>
      <button class="sidebar-tag disabled">Grupos</button>
    </div>
    <div class="conversation-list" role="list"></div>
  `;

  const list = el.querySelector('.conversation-list');

  for (const conv of conversations) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.id = conv.id;

    const lastDate = conv.last_message?.timestamp
      ? conv.last_message.timestamp.split('T')[0]
      : '';
    const lastTimeLabel = lastDate ? formatRelativeDate(lastDate) : '';

    const lastPreview = escapeHtml(conv.last_message?.content || '');
    const displayName = escapeHtml(
      conv.participants.find(p => p !== 'DV') || conv.participants[0]
    );
    const msgCount = conv.total_messages ? formatNumber(conv.total_messages) : '';

    // Use real avatar if available, otherwise default SVG
    const avatarHtml = conv.avatar
      ? `<img src="${conv.avatar}" alt="${displayName}" class="conversation-item-avatar-img" />`
      : DEFAULT_AVATAR;

    // Escaped user-facing data inserted via innerHTML
    item.innerHTML = `
      <div class="conversation-item-avatar">${avatarHtml}</div>
      <div class="conversation-item-content">
        <div class="conversation-item-top">
          <span class="conversation-item-name">${displayName}</span>
          <span class="conversation-item-time">${lastTimeLabel}</span>
        </div>
        <div class="conversation-item-bottom">
          <span class="conversation-item-preview">${lastPreview}</span>
          <span class="conversation-item-unread" data-conv-id="${conv.id}">${msgCount}</span>
        </div>
      </div>
    `;

    item.addEventListener('click', () => onSelect(conv.id));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(conv.id);
      }
    });

    list.appendChild(item);
  }

  // Lock message right after the last conversation — inside the scrollable list
  const lockMsg = document.createElement('div');
  lockMsg.className = 'sidebar-lock-message';
  // Static content — safe innerHTML
  lockMsg.innerHTML = `
    <svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>
    <span>Suas mensagens são exibidas <span class="sidebar-lock-link" data-action="profile-dv"><strong>nacionalmente para todos do Brasil</strong></span>.</span>
  `;
  list.appendChild(lockMsg);

  container.appendChild(el);
  return el;
}

/**
 * Set active conversation in sidebar.
 * @param {HTMLElement} sidebar
 * @param {string|null} activeId
 */
export function setActiveConversation(sidebar, activeId) {
  sidebar.querySelectorAll('.conversation-item').forEach(item => {
    const isActive = item.dataset.id === activeId;
    item.classList.toggle('active', isActive);

    // Clear unread badge when conversation is opened
    if (isActive) {
      const badge = item.querySelector('.conversation-item-unread');
      if (badge) badge.style.display = 'none';

      // Clear the "Não lidas" tag count
      const tagCount = sidebar.querySelector('.sidebar-tag-count');
      if (tagCount) tagCount.style.display = 'none';
    }
  });
}
