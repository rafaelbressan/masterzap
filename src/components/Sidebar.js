/**
 * Sidebar component — renders the conversation list panel.
 *
 * Security note: innerHTML is used with static SVGs and data from our own
 * bundled JSON files (not user input), so XSS risk does not apply here.
 */
import { formatTime, escapeHtml, formatNumber, formatRelativeDate } from '../lib/utils.js';

import { ICON_SEARCH as SEARCH_ICON, ICON_MEETBALL } from '../lib/icons.js';
import { defaultAvatarSvg } from '../lib/avatar.js';

/**
 * The two conversations pinned under "Favoritas" — the leaks this project is
 * actually about. Everything else is context around them.
 */
export const FAVORITE_CONVERSATIONS = new Set(['alexandre-de-moraes', 'martha-graeff']);

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {Array} options.conversations
 * @param {function} options.onSelect - called with conversation id
 * @param {Set<string>} [options.readConversations] - ids already opened
 */
export function renderSidebar(container, { conversations, onSelect, onProfile, onAbout, onExportAll, onCalls, onChats, onApi, onLegal, readConversations = new Set() }) {
  const el = document.createElement('aside');
  el.className = 'sidebar';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Lista de conversas');

  // Static sidebar chrome — safe innerHTML (no user input)
  el.innerHTML = `
    <div class="sidebar-header">
      <span class="sidebar-header-title">MasterWhats</span>
      <button class="sidebar-menu-btn" aria-label="Menu" data-tip="Menu">${ICON_MEETBALL}</button>
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
        <button class="sidebar-search-clear" aria-label="Limpar pesquisa" style="display:none;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="sidebar-tags">
      <button class="sidebar-tag active" data-filter="todas">Todas</button>
      <button class="sidebar-tag" data-filter="nao-lidas">Não lidas <span class="sidebar-tag-count"></span></button>
      <button class="sidebar-tag" data-filter="favoritas">Favoritas</button>
      <button class="sidebar-tag disabled">Grupos</button>
    </div>
    <div class="conversation-list" role="list"></div>
  `;

  const list = el.querySelector('.conversation-list');
  const searchInput = el.querySelector('.sidebar-search-input');
  const searchClear = el.querySelector('.sidebar-search-clear');

  // Show/hide clear button based on input content
  searchInput.addEventListener('input', () => {
    searchClear.style.display = searchInput.value.length > 0 ? '' : 'none';
  });

  // Clear button: clear text, hide results, restore chat list
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchClear.style.display = 'none';
    searchInput.blur();
  });

  for (const conv of conversations) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.id = conv.id;
    if (FAVORITE_CONVERSATIONS.has(conv.id)) item.dataset.favorite = 'true';

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
      : defaultAvatarSvg(conv.id);

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

  // Shown when a filter leaves nothing on screen.
  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'sidebar-empty-filter';
  emptyMsg.style.display = 'none';
  list.appendChild(emptyMsg);

  // ── Filter tabs ────────────────────────────────────
  //
  // The tabs used to be decorative. They now actually filter, and the unread
  // tally follows the read state instead of being a fixed total.

  const tagButtons = [...el.querySelectorAll('.sidebar-tag[data-filter]')];
  const unreadCountEl = el.querySelector('.sidebar-tag-count');
  let activeFilter = 'todas';

  const isUnread = (conv) => !readConversations.has(conv.id);

  function matchesFilter(conv) {
    if (activeFilter === 'nao-lidas') return isUnread(conv);
    if (activeFilter === 'favoritas') return FAVORITE_CONVERSATIONS.has(conv.id);
    return true;
  }

  /** Refresh the unread badges, the tab tally and — if filtering by unread —
   *  which rows are on screen. */
  function refreshReadState() {
    const unread = conversations.filter(isUnread);
    const unreadMessages = unread.reduce((sum, c) => sum + (c.total_messages || 0), 0);

    unreadCountEl.textContent = unreadMessages ? unreadMessages.toLocaleString('pt-BR') : '';
    unreadCountEl.style.display = unreadMessages ? '' : 'none';

    for (const item of el.querySelectorAll('.conversation-item')) {
      const badge = item.querySelector('.conversation-item-unread');
      if (badge) badge.style.display = readConversations.has(item.dataset.id) ? 'none' : '';
    }

    applyFilter();
  }

  function applyFilter() {
    const byId = new Map(conversations.map(c => [c.id, c]));
    let visible = 0;

    for (const item of el.querySelectorAll('.conversation-item')) {
      const conv = byId.get(item.dataset.id);
      const show = conv ? matchesFilter(conv) : true;
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    }

    emptyMsg.style.display = visible ? 'none' : '';
    emptyMsg.textContent = activeFilter === 'nao-lidas'
      ? 'Você já abriu todas as conversas.'
      : 'Nenhuma conversa aqui.';
    // The lock note belongs at the end of the real list, not of an empty one.
    lockMsg.style.display = visible ? '' : 'none';
  }

  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      tagButtons.forEach(b => b.classList.toggle('active', b === btn));
      searchInput.placeholder = activeFilter === 'favoritas'
        ? 'Pesquisar nas favoritas'
        : 'Pesquisar';
      applyFilter();
      list.scrollTop = 0;
    });
  }

  searchInput.placeholder = 'Pesquisar';
  refreshReadState();

  // main.js marks a conversation read when it opens; this lets it repaint the
  // badges and the tally without rebuilding the whole sidebar.
  el.refreshReadState = refreshReadState;

  // Mobile bottom navbar (hidden on desktop via CSS)
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'sidebar-bottom-nav';
  // Static SVG icons from design system — safe innerHTML
  bottomNav.innerHTML = `
    <button class="sidebar-bottom-tab active" data-tab="chats">
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.87666 26.2151L4.87341 26.2197L4.87321 26.2199C4.706 26.4546 4.68382 26.7629 4.81573 27.0191C4.9477 27.2753 5.21177 27.4363 5.49999 27.4363H5.50082H5.5017L5.50365 27.4363L5.50821 27.4363L5.52001 27.4361C5.52906 27.436 5.54047 27.4357 5.55417 27.4352C5.58157 27.4343 5.61815 27.4326 5.66334 27.4294C5.75371 27.423 5.87867 27.4108 6.03375 27.3875C6.34391 27.3409 6.77501 27.2498 7.29101 27.072C8.31884 26.7177 9.67288 26.0227 11.0709 24.6667C11.4506 24.6956 11.8354 24.7104 12.2244 24.7104C18.6653 24.7104 24.2185 20.5799 24.2185 15.1216C24.2185 9.66321 18.6653 5.53272 12.2244 5.53272C5.7835 5.53272 0.230316 9.66321 0.230316 15.1216C0.230316 18.2149 2.04624 20.9077 4.75611 22.6306C5.08489 22.8396 5.42735 23.0348 5.78209 23.2153C5.90866 23.2797 5.9714 23.3611 5.98185 23.5782C5.99459 23.843 5.90966 24.2111 5.7393 24.6369C5.57476 25.0481 5.35835 25.4455 5.17802 25.746C5.08884 25.8946 5.01071 26.0158 4.95561 26.0988C4.92811 26.1403 4.90648 26.172 4.89224 26.1926L4.88655 26.2009L4.87666 26.2151Z"/></svg>
      <span>Conversas</span>
    </button>
    <div class="sidebar-bottom-tab disabled">
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 6.96672C14.4004 6.96672 12.9667 8.43169 12.9667 10.4167C12.9667 12.4018 14.4004 13.8667 16 13.8667C17.5996 13.8667 19.0333 12.4018 19.0333 10.4167C19.0333 8.43169 17.5996 6.96672 16 6.96672ZM11.3667 10.4167C11.3667 7.70734 13.3654 5.36672 16 5.36672C18.6346 5.36672 20.6333 7.70734 20.6333 10.4167C20.6333 13.1261 18.6346 15.4667 16 15.4667C13.3654 15.4667 11.3667 13.1261 11.3667 10.4167ZM9.91579 21.1994C8.65548 22.3383 8.01768 23.7137 7.70973 24.6403L7.70593 24.6567L7.70738 24.659L7.709 24.6611C7.7181 24.6725 7.75003 24.7001 7.8159 24.7001H24.1841C24.25 24.7001 24.2819 24.6725 24.291 24.6611L24.2941 24.6567L24.2903 24.6403C23.9823 23.7137 23.3445 22.3383 22.0842 21.1994C20.8409 20.0757 18.9392 19.1334 16 19.1334C13.0609 19.1334 11.1592 20.0757 9.91579 21.1994ZM8.843 20.0123C10.3926 18.6119 12.6811 17.5334 16 17.5334C19.3189 17.5334 21.6074 18.6119 23.157 20.0123C24.6897 21.3974 25.4476 23.0493 25.8086 24.1357C26.1997 25.3124 25.2471 26.3001 24.1841 26.3001H7.8159C6.75296 26.3001 5.80034 25.3124 6.19138 24.1357C6.55243 23.0493 7.31034 21.3974 8.843 20.0123Z"/></svg>
      <span>Comunidades</span>
    </div>
    <button class="sidebar-bottom-tab" data-tab="calls">
      <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor"><path d="M22.246 27.236C18.8584 27.236 14.7666 25.0019 11.0269 21.2743C7.27502 17.5225 5.06519 13.4185 5.06519 10.0066C5.06519 8.08819 5.62371 6.67972 6.93504 5.46553C7.02004 5.39268 7.09289 5.31983 7.16574 5.25912C7.94282 4.5306 8.75633 4.16634 9.49699 4.17849C10.2862 4.20277 11.0147 4.62774 11.6461 5.55052L14.0745 9.07168C14.7666 10.0673 14.8759 11.2451 13.8438 12.3014L12.9696 13.1878C12.7025 13.4549 12.6539 13.7463 12.836 14.0742C13.3217 14.9241 14.1231 15.8347 15.2523 16.9639C16.2843 17.996 17.6321 19.1009 18.227 19.4652C18.5549 19.6473 18.8463 19.5987 19.1134 19.3316L19.9998 18.4574C21.0561 17.4253 22.2339 17.5346 23.2295 18.2267L26.7507 20.6551C27.6735 21.2865 28.1227 22.015 28.1227 22.8042C28.1227 23.5449 27.7706 24.3462 27.0421 25.1355C26.9814 25.2083 26.9085 25.2812 26.8357 25.3661C25.6093 26.6896 24.1887 27.236 22.246 27.236Z"/></svg>
      <span>Chamadas</span>
    </button>
  `;
  el.appendChild(bottomNav);
  bottomNav.querySelector('[data-tab="chats"]').addEventListener('click', () => onChats?.());
  bottomNav.querySelector('[data-tab="calls"]').addEventListener('click', () => onCalls?.());

  /**
   * Swap the list for the calls screen and back. The header, search and
   * filter tabs belong to the chat list; the calls panel brings its own.
   */
  el.showCalls = (panel) => {
    el.querySelector('.calls-panel')?.remove();
    el.insertBefore(panel, bottomNav);
    el.classList.add('sidebar--calls');
    for (const tab of bottomNav.querySelectorAll('.sidebar-bottom-tab')) tab.classList.toggle('active', tab.dataset.tab === 'calls');
  };
  /** The same menu, from wherever the button is — the list or the calls screen. */
  el.toggleMenu = () => toggleSidebarMenu();
  el.showChats = () => {
    el.classList.remove('sidebar--calls');
    for (const tab of bottomNav.querySelectorAll('.sidebar-bottom-tab')) tab.classList.toggle('active', tab.dataset.tab === 'chats');
  };

  // Sidebar 3-dot menu (mobile only, hidden on desktop via CSS)
  const menuBtn = el.querySelector('.sidebar-menu-btn');
  let sidebarMenuEl = null;

  function toggleSidebarMenu() {
    if (sidebarMenuEl) { closeSidebarMenu(); return; }
    sidebarMenuEl = document.createElement('div');
    sidebarMenuEl.className = 'sidebar-dropdown-menu';

    const items = [
      { label: 'Perfil', action: onProfile, enabled: !!onProfile },
      { label: 'Exportar tudo (.zip)', action: onExportAll, enabled: !!onExportAll },
      { label: 'API/MCP', action: onApi, enabled: !!onApi },
      { label: 'Aviso legal', action: onLegal, enabled: !!onLegal },
      { label: 'Sobre o MasterWhats', action: onAbout, enabled: !!onAbout },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'sidebar-dropdown-item';
      if (!item.enabled) btn.classList.add('disabled');
      // Static SVG icon + static label — safe innerHTML
      btn.innerHTML = item.icon ? `<span class="sidebar-dropdown-icon">${item.icon}</span><span>${item.label}</span>` : `<span>${item.label}</span>`;
      if (item.enabled && item.action) {
        btn.addEventListener('click', () => { closeSidebarMenu(); item.action(); });
      }
      sidebarMenuEl.appendChild(btn);
    }

    // In calls mode the list's header is hidden; the menu hangs off the calls header.
    (el.querySelector('.sidebar--calls .calls-header, .calls-header') && el.classList.contains('sidebar--calls')
      ? el.querySelector('.calls-header') : el.querySelector('.sidebar-header')).appendChild(sidebarMenuEl);

    setTimeout(() => {
      document.addEventListener('click', closeSidebarMenuOnOutside, true);
    }, 0);
  }

  function closeSidebarMenu() {
    if (sidebarMenuEl) { sidebarMenuEl.remove(); sidebarMenuEl = null; }
    document.removeEventListener('click', closeSidebarMenuOnOutside, true);
  }

  function closeSidebarMenuOnOutside(e) {
    if (sidebarMenuEl && !sidebarMenuEl.contains(e.target) && e.target !== menuBtn && !e.target.closest?.('.calls-header-btn[aria-label="Menu"]')) {
      closeSidebarMenu();
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebarMenu();
    });
  }

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
    item.classList.toggle('active', item.dataset.id === activeId);
  });
  // Badges and the unread tally follow the stored read state, repainted by
  // refreshReadState() once main.js has recorded the open.
}
