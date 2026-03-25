/**
 * SettingsDrawer — "Sobre o MasterWhats" panel.
 * Replaces the sidebar when opened from the nav rail settings icon.
 * Shows project description, context, and searchable conversation highlights.
 *
 * Security note: innerHTML used only for static SVG. All dynamic content
 * uses ProfileSections with parseLinks from static content files.
 */
import { SETTINGS_CONTENT, SETTINGS_CREDITS } from '../lib/settings-content.js';
import { SOURCES } from '../lib/profile-content.js';
import { renderProfileSections } from './ProfileSections.js';

const ICON_COG_64 = `<svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.66248 21.55C9.98748 21.85 10.375 22 10.825 22H13.175C13.625 22 14.0125 21.85 14.3375 21.55C14.6625 21.25 14.8583 20.8833 14.925 20.45L15.15 18.8C15.35 18.7167 15.55 18.6167 15.75 18.5C15.95 18.3833 16.1416 18.2583 16.325 18.125L17.825 18.775C18.2416 18.9583 18.6583 18.975 19.075 18.825C19.4916 18.675 19.8166 18.4083 20.05 18.025L21.25 15.975C21.4833 15.5917 21.55 15.1833 21.45 14.75C21.35 14.3167 21.125 13.9583 20.775 13.675L19.45 12.675C19.4833 12.5583 19.5 12.4458 19.5 12.3375V11.6625C19.5 11.5542 19.4916 11.4417 19.475 11.325L20.8 10.325C21.15 10.0417 21.375 9.68333 21.475 9.25C21.575 8.81667 21.5083 8.40833 21.275 8.025L20.1 5.975C19.8666 5.59167 19.5416 5.325 19.125 5.175C18.7083 5.025 18.2916 5.04167 17.875 5.225L16.325 5.875C16.1416 5.74167 15.9541 5.61667 15.7625 5.5C15.5708 5.38333 15.3666 5.28333 15.15 5.2L14.925 3.55C14.8583 3.11667 14.6625 2.75 14.3375 2.45C14.0125 2.15 13.625 2 13.175 2H10.825C10.375 2 9.98748 2.15 9.66248 2.45C9.33748 2.75 9.14165 3.11667 9.07498 3.55L8.84998 5.2C8.64998 5.28333 8.44998 5.38333 8.24998 5.5C8.04998 5.61667 7.85831 5.74167 7.67498 5.875L6.12498 5.225C5.70831 5.04167 5.29165 5.025 4.87498 5.175C4.45831 5.325 4.13331 5.59167 3.89998 5.975L2.72498 8.025C2.49165 8.40833 2.42498 8.81667 2.52498 9.25C2.62498 9.68333 2.84998 10.0417 3.19998 10.325L4.52498 11.325C4.50831 11.4417 4.49998 11.5542 4.49998 11.6625V12.3375C4.49998 12.4458 4.50831 12.5583 4.52498 12.675L3.19998 13.675C2.84998 13.9583 2.62498 14.3167 2.52498 14.75C2.42498 15.1833 2.49165 15.5917 2.72498 15.975L3.89998 18.025C4.13331 18.4083 4.45831 18.675 4.87498 18.825C5.29165 18.975 5.70831 18.9583 6.12498 18.775L7.67498 18.125C7.85831 18.2583 8.04581 18.3833 8.23748 18.5C8.42915 18.6167 8.63331 18.7167 8.84998 18.8L9.07498 20.45C9.14165 20.8833 9.33748 21.25 9.66248 21.55ZM12 15C12.8286 15 13.5357 14.7071 14.1214 14.1214C14.7071 13.5357 15 12.8286 15 12C15 11.1714 14.7071 10.4643 14.1214 9.87857C13.5357 9.29286 12.8286 9 12 9C11.1571 9 10.4464 9.29286 9.86786 9.87857C9.28929 10.4643 9 11.1714 9 12C9 12.8286 9.28929 13.5357 9.86786 14.1214C10.4464 14.7071 11.1571 15 12 15Z"/></svg>`;

/**
 * @param {HTMLElement} container - the .app-container element
 * @param {object} options
 * @param {function} options.onClose
 * @param {object} options.actions - { onSearch: (term) => void }
 * @returns {{ destroy: function }}
 */
export function showSettingsDrawer(container, { onClose, actions = {} } = {}) {
  const existing = container.querySelector('.settings-drawer');
  if (existing) existing.remove();

  const sidebar = container.querySelector('.sidebar');

  const drawer = document.createElement('div');
  drawer.className = 'settings-drawer profile-drawer';

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
  titleEl.textContent = 'Sobre o MasterWhats';
  header.appendChild(titleEl);

  drawer.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'profile-drawer-body';

  // Logo section
  const logoSection = document.createElement('div');
  logoSection.className = 'settings-logo-section';

  const logoImg = document.createElement('img');
  logoImg.src = '/assets/masterzap-logo.png';
  logoImg.alt = 'MasterWhats';
  logoImg.className = 'settings-logo-img';
  logoImg.width = 80;
  logoImg.height = 80;
  logoSection.appendChild(logoImg);

  const logoName = document.createElement('div');
  logoName.className = 'settings-logo-name';
  logoName.textContent = 'MasterWhats';
  logoSection.appendChild(logoName);

  const logoSub = document.createElement('div');
  logoSub.className = 'settings-logo-sub';
  logoSub.textContent = '65.772 mensagens · fev 2024 a ago 2025';
  logoSection.appendChild(logoSub);

  body.appendChild(logoSection);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'contact-info-divider';
  body.appendChild(divider);

  // Content sections with action links
  renderProfileSections(body, SETTINGS_CONTENT.sections, SOURCES, SETTINGS_CREDITS, actions);

  drawer.appendChild(body);

  // Insert replacing sidebar
  if (sidebar) sidebar.style.display = 'none';
  const navRail = container.querySelector('.nav-rail');
  if (navRail && navRail.nextSibling) {
    container.insertBefore(drawer, navRail.nextSibling);
  } else {
    container.appendChild(drawer);
  }

  requestAnimationFrame(() => {
    drawer.classList.add('open');
    body.scrollTop = 0;
  });

  function destroy() {
    drawer.remove();
    if (sidebar) sidebar.style.display = '';
    if (onClose) onClose();
  }

  return { destroy };
}
