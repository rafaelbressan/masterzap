/**
 * ContactInfo — slide-in drawer showing contact details.
 * Triggered by clicking the avatar or contact name in chat header.
 *
 * Matches WhatsApp's "Info do contato" panel.
 *
 * Security note: innerHTML used only with static SVG icon literals.
 * All dynamic text uses textContent.
 */

const ICON_MEDIA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
const ICON_STAR = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
const ICON_CLOCK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
const ICON_SEARCH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const DEFAULT_AVATAR_LG = `<svg viewBox="0 0 212 212" width="120" height="120"><path fill="#DFE5E7" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.251 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"/><path fill="#FFF" d="M173.561 171.615a62.767 62.767 0 00-2.065-2.955c-.832-1.123-1.702-2.223-2.608-3.299a70.112 70.112 0 00-3.184-3.527 71.097 71.097 0 00-5.924-5.47 72.458 72.458 0 00-10.204-7.026 75.2 75.2 0 00-5.98-3.055c-.218-.095-.436-.19-.656-.28a78.436 78.436 0 00-10.457-3.467c-1.08-.282-2.163-.545-3.25-.783a79.975 79.975 0 00-4.083-.816 82.3 82.3 0 00-7.034-.856 87.82 87.82 0 00-11.373-.36 85.075 85.075 0 00-7.19.488c-1.224.174-2.43.372-3.626.542-1.388.239-2.771.508-4.148.815-1.084.238-2.165.501-3.241.783a78.41 78.41 0 00-10.467 3.467c-.219.09-.437.185-.654.28a75.37 75.37 0 00-5.986 3.055 72.56 72.56 0 00-10.198 7.027 71.168 71.168 0 00-5.924 5.47 69.933 69.933 0 00-3.187 3.527c-.906 1.076-1.776 2.176-2.608 3.299a63.105 63.105 0 00-2.065 2.955 56.961 56.961 0 00-1.86 3.211 28.89 28.89 0 0117.373-9.752c.462-.14.931-.268 1.404-.387 3.7-.915 7.533-1.373 11.444-1.373h.312c9.647.109 18.857 2.604 27.089 6.94a54.543 54.543 0 016.471 4.142c.327.244.65.494.971.748a60.49 60.49 0 012.354 2.037c.09.08.178.164.268.245a41.078 41.078 0 002.242-1.906c.321-.254.644-.503.971-.747a54.616 54.616 0 016.47-4.141c8.233-4.337 17.443-6.832 27.09-6.941h.312c3.91 0 7.744.459 11.444 1.373.474.117.941.248 1.404.387a28.88 28.88 0 0117.373 9.752 56.68 56.68 0 00-1.86-3.211z"/><path fill="#FFF" d="M106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 003.624-.896 37.124 37.124 0 005.12-2.023 36.413 36.413 0 006.15-4.02 37.172 37.172 0 005.088-5.088 36.483 36.483 0 004.02-6.15 37.318 37.318 0 002.023-5.12 38.689 38.689 0 00.896-3.624 39.321 39.321 0 00.737-7.68c0-20.933-17.006-37.939-37.938-37.939S68.064 69.63 68.064 90.562s17.006 37.938 37.938 37.938z"/></svg>`;

/**
 * Show contact info drawer.
 * @param {HTMLElement} mainArea - the .main-area element
 * @param {object} conversation - conversation metadata
 * @param {object} [options]
 * @param {Record<string,number>} [options.mediaCounts] - { images, videos, documents }
 * @param {function} [options.onClose]
 * @returns {{ element: HTMLElement, destroy: function }}
 */
export function showContactInfo(mainArea, conversation, { mediaCounts = {}, onClose } = {}) {
  // Remove existing drawer if any
  const existing = mainArea.querySelector('.contact-info-drawer');
  if (existing) existing.remove();

  const displayName = conversation.participants.find(p => p !== 'DV') || conversation.participants[0];
  const totalMedia = (mediaCounts.images || 0) + (mediaCounts.videos || 0) + (mediaCounts.documents || 0);

  const drawer = document.createElement('div');
  drawer.className = 'contact-info-drawer';

  // Header
  const header = document.createElement('div');
  header.className = 'contact-info-header';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'contact-info-close';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    destroy();
    if (onClose) onClose();
  });
  header.appendChild(closeBtn);

  const titleEl = document.createElement('span');
  titleEl.className = 'contact-info-title';
  titleEl.textContent = 'Info do contato';
  header.appendChild(titleEl);

  drawer.appendChild(header);

  // Scrollable body
  const body = document.createElement('div');
  body.className = 'contact-info-body';

  // Avatar + name section
  const profile = document.createElement('div');
  profile.className = 'contact-info-profile';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'contact-info-avatar';
  if (conversation.avatar) {
    const img = document.createElement('img');
    img.src = conversation.avatar;
    img.alt = displayName;
    img.className = 'contact-info-avatar-img';
    avatarEl.appendChild(img);
  } else {
    // Static SVG — safe innerHTML
    avatarEl.innerHTML = DEFAULT_AVATAR_LG;
  }
  profile.appendChild(avatarEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'contact-info-name';
  nameEl.textContent = displayName;
  profile.appendChild(nameEl);

  const phoneEl = document.createElement('div');
  phoneEl.className = 'contact-info-phone';
  phoneEl.textContent = `${conversation.total_messages.toLocaleString('pt-BR')} mensagens`;
  profile.appendChild(phoneEl);

  // Search button
  const searchBtn = document.createElement('div');
  searchBtn.className = 'contact-info-search-btn';
  // Static SVG icon — safe innerHTML
  searchBtn.innerHTML = `${ICON_SEARCH} <span>Pesquisar</span>`;
  profile.appendChild(searchBtn);

  body.appendChild(profile);
  body.appendChild(createDivider());

  // Recado / About section
  const aboutSection = document.createElement('div');
  aboutSection.className = 'contact-info-section';

  const aboutLabel = document.createElement('div');
  aboutLabel.className = 'contact-info-section-label';
  aboutLabel.textContent = 'Recado';
  aboutSection.appendChild(aboutLabel);

  const aboutValue = document.createElement('div');
  aboutValue.className = 'contact-info-section-value';
  aboutValue.textContent = '💕';
  aboutSection.appendChild(aboutValue);

  body.appendChild(aboutSection);
  body.appendChild(createDivider());

  // Action items
  const actions = document.createElement('div');
  actions.className = 'contact-info-actions';

  actions.appendChild(createActionItem(ICON_MEDIA, 'Mídias, links e documentos', totalMedia.toLocaleString('pt-BR')));
  actions.appendChild(createActionItem(ICON_STAR, 'Mensagens importantes', ''));
  actions.appendChild(createActionItem(ICON_BELL, 'Modo silencioso', '', true));
  actions.appendChild(createActionItem(ICON_CLOCK, 'Mensagens temporárias', 'Não'));
  actions.appendChild(createActionItem(ICON_LOCK, 'Privacidade avançada da conversa', 'Desativada'));
  actions.appendChild(createActionItem(ICON_SHIELD, 'Criptografia', 'As mensagens são protegidas com criptografia de ponta a ponta.'));

  body.appendChild(actions);
  drawer.appendChild(body);
  mainArea.appendChild(drawer);

  // Trigger open animation
  requestAnimationFrame(() => drawer.classList.add('open'));

  function destroy() {
    drawer.remove();
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      destroy();
      if (onClose) onClose();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  return { element: drawer, destroy };
}

function createDivider() {
  const div = document.createElement('div');
  div.className = 'contact-info-divider';
  return div;
}

function createActionItem(iconSvg, label, detail, hasToggle = false) {
  const item = document.createElement('div');
  item.className = 'contact-info-action-item';

  const icon = document.createElement('span');
  icon.className = 'contact-info-action-icon';
  // Static SVG icon — safe innerHTML
  icon.innerHTML = iconSvg;
  item.appendChild(icon);

  const textWrapper = document.createElement('div');
  textWrapper.className = 'contact-info-action-text';

  const labelEl = document.createElement('span');
  labelEl.className = 'contact-info-action-label';
  labelEl.textContent = label;
  textWrapper.appendChild(labelEl);

  if (detail) {
    const detailEl = document.createElement('span');
    detailEl.className = 'contact-info-action-detail';
    detailEl.textContent = detail;
    textWrapper.appendChild(detailEl);
  }

  item.appendChild(textWrapper);

  if (hasToggle) {
    const toggle = document.createElement('div');
    toggle.className = 'contact-info-toggle';
    item.appendChild(toggle);
  }

  return item;
}
