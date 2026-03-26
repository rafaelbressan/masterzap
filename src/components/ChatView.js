/**
 * ChatView component — renders the chat header and message area.
 * Integrates with ScrollLoader for lazy day-chunk loading.
 *
 * Security note: innerHTML is used in two controlled scenarios:
 * 1. Static SVG icons (BACK_ICON, DEFAULT_AVATAR_SM) — no user data
 * 2. Message text — escapeHtml() runs FIRST to neutralize all HTML,
 *    then linkify() wraps plain-text URLs in <a> tags. This is safe
 *    because the input to linkify is already fully escaped.
 */
import { escapeHtml, formatTime, formatDateLong, linkify } from '../lib/utils.js';
import { ScrollLoader } from '../lib/scroll-loader.js';

const BACK_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;

const DEFAULT_AVATAR_SM = `<svg viewBox="0 0 212 212" width="40" height="40"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.251 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"/><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955 67.7 67.7 0 00-2.608-3.299 70.112 70.112 0 00-3.184-3.527 71.097 71.097 0 00-5.924-5.47 72.458 72.458 0 00-10.204-7.026 75.2 75.2 0 00-5.98-3.055c-.218-.095-.436-.19-.656-.28a78.436 78.436 0 00-10.457-3.467c-1.08-.282-2.163-.545-3.25-.783a79.975 79.975 0 00-4.083-.816 82.3 82.3 0 00-7.034-.856 87.82 87.82 0 00-11.373-.36 85.075 85.075 0 00-7.19.488 82.473 82.473 0 00-3.626.542c-1.388.239-2.771.508-4.148.815-1.084.238-2.165.501-3.241.783a78.41 78.41 0 00-10.467 3.467c-.219.09-.437.185-.654.28a75.37 75.37 0 00-5.986 3.055 72.56 72.56 0 00-10.198 7.027 71.168 71.168 0 00-5.924 5.47 69.933 69.933 0 00-3.187 3.527c-.906 1.076-1.776 2.176-2.608 3.299a63.105 63.105 0 00-2.065 2.955 56.961 56.961 0 00-1.86 3.211 28.89 28.89 0 0117.373-9.752c.462-.14.931-.268 1.404-.387 3.7-.915 7.533-1.373 11.444-1.373h.312c9.647.109 18.857 2.604 27.089 6.94a54.543 54.543 0 016.471 4.142c.327.244.65.494.971.748a60.49 60.49 0 012.354 2.037c.09.08.178.164.268.245a41.078 41.078 0 002.242-1.906c.321-.254.644-.503.971-.747a54.616 54.616 0 016.47-4.141c8.233-4.337 17.443-6.832 27.09-6.941h.312c3.91 0 7.744.459 11.444 1.373.474.117.941.248 1.404.387a28.88 28.88 0 0117.373 9.752 56.68 56.68 0 00-1.86-3.211z"/><path fill="#FFF" d="M106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 003.624-.896 37.124 37.124 0 005.12-2.023 36.413 36.413 0 006.15-4.02 37.172 37.172 0 005.088-5.088 36.483 36.483 0 004.02-6.15 37.318 37.318 0 002.023-5.12 38.689 38.689 0 00.896-3.624 39.321 39.321 0 00.737-7.68c0-20.933-17.006-37.939-37.938-37.939S68.064 69.63 68.064 90.562s17.006 37.938 37.938 37.938z"/></svg>`;

/**
 * Render a single day section with date badge + messages.
 * @param {string} date - ISO date string
 * @param {Array} messages
 * @returns {HTMLElement}
 */
function renderDaySection(date, messages) {
  const section = document.createElement('section');
  section.className = 'chat-day';
  section.dataset.date = date;

  // Date badge
  const badge = document.createElement('div');
  badge.className = 'chat-date-badge';
  badge.textContent = formatDateLong(date);
  section.appendChild(badge);

  // Messages
  for (const msg of messages) {
    section.appendChild(renderMessage(msg));
  }

  return section;
}

// ── SVG Icons for message types ──────────────────

const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const ICON_VIDEO = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;

const ICON_MIC = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

const ICON_DOC = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

const ICON_PHONE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;

const ICON_BLOCK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

/**
 * Render a media placeholder (image/video/sticker).
 */
function renderMediaPlaceholder(type, msg) {
  const el = document.createElement('div');
  el.className = `chat-media-placeholder chat-media-${type}`;

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-media-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = type === 'video' ? ICON_VIDEO : ICON_CAMERA;
  el.appendChild(iconEl);

  const label = document.createElement('span');
  label.className = 'chat-media-label';
  const labels = { image: 'Foto', video: 'Vídeo', sticker: 'Sticker' };
  label.textContent = labels[type] || type;
  el.appendChild(label);

  if (msg.content) {
    const caption = document.createElement('div');
    caption.className = 'chat-media-caption';
    caption.textContent = msg.content;
    el.appendChild(caption);
  }

  return el;
}

/**
 * Render an audio message placeholder with waveform bars.
 */
function renderAudioPlaceholder(msg) {
  const el = document.createElement('div');
  el.className = 'chat-audio-placeholder';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-audio-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_MIC;
  el.appendChild(iconEl);

  // Waveform bars
  const waveform = document.createElement('div');
  waveform.className = 'chat-audio-waveform';
  for (let i = 0; i < 40; i++) {
    const bar = document.createElement('span');
    bar.className = 'chat-audio-bar';
    bar.style.height = `${4 + Math.floor(Math.random() * 16)}px`;
    waveform.appendChild(bar);
  }
  el.appendChild(waveform);

  const duration = document.createElement('span');
  duration.className = 'chat-audio-duration';
  duration.textContent = msg.content || '0:00';
  el.appendChild(duration);

  return el;
}

/**
 * Render a document attachment card.
 */
function renderDocumentCard(msg) {
  const el = document.createElement('div');
  el.className = 'chat-document-card';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-document-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_DOC;
  el.appendChild(iconEl);

  const info = document.createElement('div');
  info.className = 'chat-document-info';

  const name = document.createElement('span');
  name.className = 'chat-document-name';
  name.textContent = msg.attachment || 'Documento';
  info.appendChild(name);

  if (msg.content) {
    const desc = document.createElement('span');
    desc.className = 'chat-document-desc';
    desc.textContent = msg.content;
    info.appendChild(desc);
  }

  el.appendChild(info);
  return el;
}

/**
 * Render a call notification card.
 */
function renderCallCard(msg) {
  const el = document.createElement('div');
  el.className = 'chat-call-card';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-call-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_PHONE;
  el.appendChild(iconEl);

  const label = document.createElement('span');
  label.className = 'chat-call-label';
  label.textContent = msg.content || 'Chamada';
  el.appendChild(label);

  return el;
}

/**
 * Render a deleted message indicator.
 */
function renderDeletedMessage() {
  const el = document.createElement('div');
  el.className = 'chat-deleted-msg';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-deleted-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_BLOCK;
  el.appendChild(iconEl);

  const label = document.createElement('span');
  label.textContent = 'Mensagem apagada';
  el.appendChild(label);

  return el;
}

/**
 * Render a single message bubble.
 * @param {object} msg
 * @returns {HTMLElement}
 */
function renderMessage(msg) {
  const isOutgoing = msg.sender === 'DV';
  const isSystem = msg.type === 'system';

  const row = document.createElement('div');
  row.className = `chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}${isSystem ? ' system' : ''}`;
  row.dataset.id = msg.id;

  if (isSystem) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-system';
    bubble.textContent = msg.content;
    row.appendChild(bubble);
    return row;
  }

  const bubble = document.createElement('div');
  bubble.className = `chat-msg-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  const content = document.createElement('div');
  content.className = 'chat-msg-content';

  switch (msg.type) {
    case 'image':
      content.appendChild(renderMediaPlaceholder('image', msg));
      break;
    case 'video':
      content.appendChild(renderMediaPlaceholder('video', msg));
      break;
    case 'audio':
      content.appendChild(renderAudioPlaceholder(msg));
      break;
    case 'sticker':
      content.appendChild(renderMediaPlaceholder('sticker', msg));
      break;
    case 'document':
      content.appendChild(renderDocumentCard(msg));
      break;
    case 'deleted':
      content.appendChild(renderDeletedMessage());
      break;
    case 'call':
      content.appendChild(renderCallCard(msg));
      break;
    default: {
      // Text: escapeHtml first (neutralizes ALL HTML), then linkify wraps URLs in <a>
      const escaped = escapeHtml(msg.content || '');
      content.innerHTML = linkify(escaped);
      break;
    }
  }

  bubble.appendChild(content);

  // Metadata row (time + edited flag)
  const meta = document.createElement('span');
  meta.className = 'chat-msg-meta';
  meta.textContent = formatTime(msg.time);
  if (msg.is_edited) {
    const edited = document.createElement('span');
    edited.className = 'chat-msg-edited';
    edited.textContent = 'editada';
    meta.prepend(edited);
  }
  bubble.appendChild(meta);

  // Tail (the little triangle on the bubble)
  const tail = document.createElement('span');
  tail.className = 'chat-msg-tail';
  bubble.appendChild(tail);

  // Chevron dropdown trigger (visible on hover)
  const chevron = document.createElement('button');
  chevron.className = 'chat-msg-chevron';
  chevron.setAttribute('aria-label', 'Menu da mensagem');
  chevron.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.475 14.475L7.85001 10.85C7.80001 10.8 7.76251 10.7458 7.73751 10.6875C7.71251 10.6292 7.70001 10.5667 7.70001 10.5C7.70001 10.3667 7.74585 10.25 7.83751 10.15C7.92918 10.05 8.05001 10 8.20001 10H15.8C15.95 10 16.0708 10.05 16.1625 10.15C16.2542 10.25 16.3 10.3667 16.3 10.5C16.3 10.5333 16.25 10.65 16.15 10.85L12.525 14.475C12.4417 14.5583 12.3583 14.6167 12.275 14.65C12.1917 14.6833 12.1 14.7 12 14.7C11.9 14.7 11.8083 14.6833 11.725 14.65C11.6417 14.6167 11.5583 14.5583 11.475 14.475Z"/></svg>`;
  bubble.appendChild(chevron);

  row.appendChild(bubble);
  return row;
}

/**
 * Render the full chat view for a conversation.
 * @param {HTMLElement} container - the main-area element
 * @param {object} options
 * @param {object} options.conversation - conversation metadata
 * @param {Array} options.dateIndex - date index from DataStore
 * @param {function} options.loadMessages - async (date) => messages[]
 * @param {function} [options.onBack] - back button callback
 * @returns {{ element: HTMLElement, loader: ScrollLoader }}
 */
const ICON_DOTS = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

export function renderChatView(container, { conversation, dateIndex, loadMessages, onBack, onContactClick, onSearch, onCloseChat }) {
  // Clear container
  while (container.firstChild) container.removeChild(container.firstChild);

  const el = document.createElement('div');
  el.className = 'chat-view';

  // Header
  const displayName = conversation.participants.find(p => p !== 'DV') || conversation.participants[0];

  const header = document.createElement('header');
  header.className = 'chat-header';

  // Back button (useful for mobile, hidden on desktop via CSS)
  const backBtn = document.createElement('button');
  backBtn.className = 'chat-header-back';
  backBtn.setAttribute('aria-label', 'Voltar');
  // Static SVG icon — safe innerHTML
  backBtn.innerHTML = BACK_ICON;
  if (onBack) backBtn.addEventListener('click', onBack);
  header.appendChild(backBtn);

  const avatarEl = document.createElement('div');
  avatarEl.className = 'chat-header-avatar';
  if (conversation.avatar) {
    const img = document.createElement('img');
    img.src = conversation.avatar;
    img.alt = displayName;
    img.className = 'chat-header-avatar-img';
    avatarEl.appendChild(img);
  } else {
    // Static SVG icon — safe innerHTML
    avatarEl.innerHTML = DEFAULT_AVATAR_SM;
  }
  if (onContactClick) {
    avatarEl.style.cursor = 'pointer';
    avatarEl.addEventListener('click', onContactClick);
  }
  header.appendChild(avatarEl);

  const infoEl = document.createElement('div');
  infoEl.className = 'chat-header-info-wrapper';
  if (onContactClick) {
    infoEl.style.cursor = 'pointer';
    infoEl.addEventListener('click', onContactClick);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'chat-header-name';
  nameEl.textContent = displayName;
  infoEl.appendChild(nameEl);

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'chat-header-info';
  subtitleEl.textContent = `${conversation.total_messages.toLocaleString('pt-BR')} mensagens`;
  infoEl.appendChild(subtitleEl);

  header.appendChild(infoEl);

  // Search button in header
  const searchBtn = document.createElement('button');
  searchBtn.className = 'chat-header-menu-btn';
  searchBtn.setAttribute('aria-label', 'Pesquisar');
  searchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  if (onSearch) searchBtn.addEventListener('click', onSearch);
  header.appendChild(searchBtn);

  // 3-dot menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'chat-header-menu-btn';
  menuBtn.setAttribute('aria-label', 'Menu');
  // Static SVG — safe innerHTML
  menuBtn.innerHTML = ICON_DOTS;
  header.appendChild(menuBtn);

  // Dropdown menu (hidden by default)
  let menuOpen = false;
  let menuEl = null;

  function toggleMenu() {
    if (menuOpen) { closeMenu(); return; }
    menuEl = document.createElement('div');
    menuEl.className = 'chat-dropdown-menu';

    const items = [
      { label: 'Info do contato', action: onContactClick, enabled: !!onContactClick },
      { label: 'Pesquisar', action: onSearch, enabled: !!onSearch },
      { label: 'Selecionar mensagens', action: null, enabled: false },
      { label: 'Modo silencioso', action: null, enabled: false },
      { label: 'Mensagens temporárias', action: null, enabled: false },
      { label: 'Fechar conversa', action: onCloseChat || onBack, enabled: !!(onCloseChat || onBack) },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'chat-dropdown-item';
      if (!item.enabled) btn.classList.add('disabled');
      btn.textContent = item.label;
      if (item.enabled && item.action) {
        btn.addEventListener('click', () => { closeMenu(); item.action(); });
      }
      menuEl.appendChild(btn);
    }

    header.appendChild(menuEl);
    menuOpen = true;

    // Close on outside click (delayed to avoid immediate close)
    setTimeout(() => {
      document.addEventListener('click', onOutsideClick, true);
    }, 0);
  }

  function closeMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    menuOpen = false;
    document.removeEventListener('click', onOutsideClick, true);
  }

  function onOutsideClick(e) {
    if (menuEl && !menuEl.contains(e.target) && e.target !== menuBtn) {
      closeMenu();
    }
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });


  el.appendChild(header);

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'chat-messages';
  messagesArea.setAttribute('role', 'log');
  messagesArea.setAttribute('aria-label', `Mensagens com ${displayName}`);
  el.appendChild(messagesArea);

  // Right-click on chat background (not on bubbles) opens the header dropdown
  messagesArea.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble, .chat-msg-system, .context-menu');
    if (bubble) return;
    e.preventDefault();
    toggleMenu();
  });

  container.appendChild(el);

  // Set up scroll loader
  const loader = new ScrollLoader({
    container: messagesArea,
    dateIndex,
    loadMessages,
    renderDay: (date, messages) => renderDaySection(date, messages),
  });

  return { element: el, loader };
}

// Export for testing
export { renderDaySection, renderMessage };
