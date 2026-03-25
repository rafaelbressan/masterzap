/**
 * ProfileDrawer — shows DV's profile when clicking his avatar on the nav rail.
 * Replaces the sidebar area like WhatsApp's profile view.
 *
 * Security note: innerHTML used for parseLinks() which processes our own
 * static content from profile-content.js (not user input).
 */
import { VORCARO_PROFILE, SOURCES, CREDITS, parseLinks } from '../lib/profile-content.js';
import { renderProfileSections } from './ProfileSections.js';

/**
 * @param {HTMLElement} container - the .app-container element
 * @param {object} [options]
 * @param {function} [options.onClose]
 * @returns {{ destroy: function }}
 */
export function showProfileDrawer(container, { onClose } = {}) {
  const existing = container.querySelector('.profile-drawer');
  if (existing) existing.remove();

  const sidebar = container.querySelector('.sidebar');

  const drawer = document.createElement('div');
  drawer.className = 'profile-drawer';

  // Header
  const header = document.createElement('div');
  header.className = 'profile-drawer-header';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'profile-drawer-close';
  closeBtn.setAttribute('aria-label', 'Fechar');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', destroy);
  header.appendChild(closeBtn);

  const titleEl = document.createElement('span');
  titleEl.className = 'profile-drawer-title';
  titleEl.textContent = 'Perfil';
  header.appendChild(titleEl);

  drawer.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'profile-drawer-body';

  // Avatar
  const avatarSection = document.createElement('div');
  avatarSection.className = 'profile-drawer-avatar-section';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'profile-drawer-avatar';
  const img = document.createElement('img');
  img.src = VORCARO_PROFILE.avatar;
  img.alt = VORCARO_PROFILE.name;
  img.className = 'profile-drawer-avatar-img';
  avatarEl.appendChild(img);
  avatarSection.appendChild(avatarEl);

  body.appendChild(avatarSection);

  // Name field
  const nameSection = document.createElement('div');
  nameSection.className = 'profile-drawer-field';
  const nameLabel = document.createElement('div');
  nameLabel.className = 'profile-drawer-field-label';
  nameLabel.textContent = 'Nome';
  nameSection.appendChild(nameLabel);
  const nameValue = document.createElement('div');
  nameValue.className = 'profile-drawer-field-value';
  nameValue.textContent = VORCARO_PROFILE.name;
  nameSection.appendChild(nameValue);
  body.appendChild(nameSection);

  // Phone field
  const phoneSection = document.createElement('div');
  phoneSection.className = 'profile-drawer-field';
  const phoneLabel = document.createElement('div');
  phoneLabel.className = 'profile-drawer-field-label';
  phoneLabel.textContent = 'Telefone';
  phoneSection.appendChild(phoneLabel);
  const phoneValue = document.createElement('div');
  phoneValue.className = 'profile-drawer-field-value';
  phoneValue.textContent = VORCARO_PROFILE.phone;
  phoneSection.appendChild(phoneValue);
  body.appendChild(phoneSection);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'contact-info-divider';
  body.appendChild(divider);

  // Investigation sections
  renderProfileSections(body, VORCARO_PROFILE.sections, SOURCES, CREDITS);

  drawer.appendChild(body);

  // Insert replacing sidebar
  if (sidebar) sidebar.style.display = 'none';
  const navRail = container.querySelector('.nav-rail');
  if (navRail && navRail.nextSibling) {
    container.insertBefore(drawer, navRail.nextSibling);
  } else {
    container.appendChild(drawer);
  }

  requestAnimationFrame(() => drawer.classList.add('open'));

  function destroy() {
    drawer.remove();
    if (sidebar) sidebar.style.display = '';
    if (onClose) onClose();
  }

  return { destroy };
}
