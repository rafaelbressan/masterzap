/**
 * NavRail — far-left narrow icon bar like WhatsApp Web.
 * Shows user avatar at top, nav icons in middle, settings at bottom.
 *
 * Security note: innerHTML used only for static SVG icon literals.
 */

const ICON_CHAT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
const ICON_STATUS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;
const ICON_CHANNELS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;

/**
 * Render the navigation rail.
 * @param {HTMLElement} container - the .app-container element
 * @param {object} [options]
 * @param {string} [options.avatarSrc] - user avatar image URL
 * @returns {HTMLElement}
 */
export function renderNavRail(container, { avatarSrc } = {}) {
  const rail = document.createElement('nav');
  rail.className = 'nav-rail';
  rail.setAttribute('aria-label', 'Navegação');

  // Top section: avatar
  const topSection = document.createElement('div');
  topSection.className = 'nav-rail-top';

  const avatar = document.createElement('div');
  avatar.className = 'nav-rail-avatar';
  if (avatarSrc) {
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.alt = 'Perfil';
    img.className = 'nav-rail-avatar-img';
    avatar.appendChild(img);
  }
  topSection.appendChild(avatar);
  rail.appendChild(topSection);

  // Middle section: nav icons
  const midSection = document.createElement('div');
  midSection.className = 'nav-rail-mid';

  const navItems = [
    { icon: ICON_CHAT, label: 'Conversas', active: true },
    { icon: ICON_STATUS, label: 'Status', active: false },
    { icon: ICON_CHANNELS, label: 'Comunidades', active: false },
  ];

  for (const item of navItems) {
    const btn = document.createElement('button');
    btn.className = 'nav-rail-btn';
    if (item.active) btn.classList.add('active');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('title', item.label);
    btn.innerHTML = item.icon; // Static SVG
    midSection.appendChild(btn);
  }

  rail.appendChild(midSection);

  // Bottom section: settings
  const bottomSection = document.createElement('div');
  bottomSection.className = 'nav-rail-bottom';

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nav-rail-btn';
  settingsBtn.setAttribute('aria-label', 'Configurações');
  settingsBtn.setAttribute('title', 'Configurações');
  settingsBtn.innerHTML = ICON_SETTINGS; // Static SVG
  bottomSection.appendChild(settingsBtn);

  rail.appendChild(bottomSection);

  // Insert as first child of container
  container.insertBefore(rail, container.firstChild);
  return rail;
}
