/**
 * NavRail — far-left narrow icon bar like WhatsApp Web.
 * Shows user avatar at top, nav icons in middle, settings at bottom.
 *
 * Security note: innerHTML used only for static SVG icon literals.
 */

const ICON_CHAT = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;
const ICON_STATUS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;
const ICON_CHANNELS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.66248 21.55C9.98748 21.85 10.375 22 10.825 22H13.175C13.625 22 14.0125 21.85 14.3375 21.55C14.6625 21.25 14.8583 20.8833 14.925 20.45L15.15 18.8C15.35 18.7167 15.55 18.6167 15.75 18.5C15.95 18.3833 16.1416 18.2583 16.325 18.125L17.825 18.775C18.2416 18.9583 18.6583 18.975 19.075 18.825C19.4916 18.675 19.8166 18.4083 20.05 18.025L21.25 15.975C21.4833 15.5917 21.55 15.1833 21.45 14.75C21.35 14.3167 21.125 13.9583 20.775 13.675L19.45 12.675C19.4833 12.5583 19.5 12.4458 19.5 12.3375V11.6625C19.5 11.5542 19.4916 11.4417 19.475 11.325L20.8 10.325C21.15 10.0417 21.375 9.68333 21.475 9.25C21.575 8.81667 21.5083 8.40833 21.275 8.025L20.1 5.975C19.8666 5.59167 19.5416 5.325 19.125 5.175C18.7083 5.025 18.2916 5.04167 17.875 5.225L16.325 5.875C16.1416 5.74167 15.9541 5.61667 15.7625 5.5C15.5708 5.38333 15.3666 5.28333 15.15 5.2L14.925 3.55C14.8583 3.11667 14.6625 2.75 14.3375 2.45C14.0125 2.15 13.625 2 13.175 2H10.825C10.375 2 9.98748 2.15 9.66248 2.45C9.33748 2.75 9.14165 3.11667 9.07498 3.55L8.84998 5.2C8.64998 5.28333 8.44998 5.38333 8.24998 5.5C8.04998 5.61667 7.85831 5.74167 7.67498 5.875L6.12498 5.225C5.70831 5.04167 5.29165 5.025 4.87498 5.175C4.45831 5.325 4.13331 5.59167 3.89998 5.975L2.72498 8.025C2.49165 8.40833 2.42498 8.81667 2.52498 9.25C2.62498 9.68333 2.84998 10.0417 3.19998 10.325L4.52498 11.325C4.50831 11.4417 4.49998 11.5542 4.49998 11.6625V12.3375C4.49998 12.4458 4.50831 12.5583 4.52498 12.675L3.19998 13.675C2.84998 13.9583 2.62498 14.3167 2.52498 14.75C2.42498 15.1833 2.49165 15.5917 2.72498 15.975L3.89998 18.025C4.13331 18.4083 4.45831 18.675 4.87498 18.825C5.29165 18.975 5.70831 18.9583 6.12498 18.775L7.67498 18.125C7.85831 18.2583 8.04581 18.3833 8.23748 18.5C8.42915 18.6167 8.63331 18.7167 8.84998 18.8L9.07498 20.45C9.14165 20.8833 9.33748 21.25 9.66248 21.55ZM12 15C12.8286 15 13.5357 14.7071 14.1214 14.1214C14.7071 13.5357 15 12.8286 15 12C15 11.1714 14.7071 10.4643 14.1214 9.87857C13.5357 9.29286 12.8286 9 12 9C11.1571 9 10.4464 9.29286 9.86786 9.87857C9.28929 10.4643 9 11.1714 9 12C9 12.8286 9.28929 13.5357 9.86786 14.1214C10.4464 14.7071 11.1571 15 12 15Z"/></svg>`;

/**
 * Render the navigation rail.
 * @param {HTMLElement} container - the .app-container element
 * @param {object} [options]
 * @param {string} [options.avatarSrc] - user avatar image URL
 * @returns {HTMLElement}
 */
export function renderNavRail(container, { avatarSrc, onSettings } = {}) {
  const rail = document.createElement('nav');
  rail.className = 'nav-rail';
  rail.setAttribute('aria-label', 'Navegação');

  // Top section: nav icons
  const topSection = document.createElement('div');
  topSection.className = 'nav-rail-top';

  const navItems = [
    { icon: ICON_CHAT, label: 'Conversas', active: true, enabled: true },
    { icon: ICON_STATUS, label: 'Status', active: false, enabled: false },
    { icon: ICON_CHANNELS, label: 'Comunidades', active: false, enabled: false },
  ];

  for (const item of navItems) {
    const btn = document.createElement('button');
    btn.className = 'nav-rail-btn';
    if (item.active) btn.classList.add('active');
    if (!item.enabled) btn.classList.add('disabled');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('title', item.label);
    btn.innerHTML = item.icon; // Static SVG
    topSection.appendChild(btn);
  }

  rail.appendChild(topSection);

  // Bottom section: settings + avatar
  const bottomSection = document.createElement('div');
  bottomSection.className = 'nav-rail-bottom';

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nav-rail-btn';
  settingsBtn.setAttribute('aria-label', 'Sobre');
  settingsBtn.setAttribute('title', 'Sobre');
  settingsBtn.innerHTML = ICON_SETTINGS; // Static SVG
  if (onSettings) settingsBtn.addEventListener('click', onSettings);
  bottomSection.appendChild(settingsBtn);

  const avatar = document.createElement('div');
  avatar.className = 'nav-rail-avatar';
  if (avatarSrc) {
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.alt = 'Perfil';
    img.className = 'nav-rail-avatar-img';
    avatar.appendChild(img);
  }
  bottomSection.appendChild(avatar);

  rail.appendChild(bottomSection);

  // Insert as first child of container
  container.insertBefore(rail, container.firstChild);
  return rail;
}
