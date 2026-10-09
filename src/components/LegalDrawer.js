/**
 * LegalDrawer — the legal notice, in the shape of "Sobre o MasterWhats":
 * beside the rail on a wide screen, the whole screen on a phone. Lives at
 * #/legal. The text is legal-content.js; nothing here is content.
 *
 * Security note: innerHTML is used for static SVG and for parseLinks over
 * static content.
 */

import { renderProfileSections } from './ProfileSections.js';
import { LEGAL_INTRO, LEGAL_SECTIONS, LEGAL_CREDITS } from '../lib/legal-content.js';

export const ICON_LEGAL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>`;
const ICON_LEGAL_64 = ICON_LEGAL.replace('width="20" height="20"', 'width="40" height="40"').replace('stroke-width="2"', 'stroke-width="2.4"');

export function showLegalDrawer(container, { onClose } = {}) {
  container.querySelector('.legal-drawer')?.remove();
  const sidebar = container.querySelector('.sidebar');

  const drawer = document.createElement('div');
  drawer.className = 'legal-drawer settings-drawer profile-drawer';

  const header = document.createElement('div');
  header.className = 'profile-drawer-header';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'profile-drawer-close';
  closeBtn.setAttribute('aria-label', 'Voltar');
  closeBtn.innerHTML = `<span class="drawer-close-x">✕</span><span class="drawer-close-arrow"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></span>`;
  closeBtn.addEventListener('click', destroy);
  header.appendChild(closeBtn);
  const titleEl = document.createElement('span');
  titleEl.className = 'profile-drawer-title';
  titleEl.textContent = LEGAL_INTRO.title;
  header.appendChild(titleEl);
  drawer.appendChild(header);

  const body = document.createElement('div');
  body.className = 'profile-drawer-body';
  const top = document.createElement('div');
  top.className = 'settings-logo-section';
  const icon = document.createElement('div');
  icon.className = 'api-hero-icon';
  icon.innerHTML = ICON_LEGAL_64;
  top.appendChild(icon);
  const name = document.createElement('div');
  name.className = 'settings-logo-name';
  name.textContent = LEGAL_INTRO.title;
  top.appendChild(name);
  const sub = document.createElement('div');
  sub.className = 'settings-logo-sub';
  sub.textContent = LEGAL_INTRO.sub;
  top.appendChild(sub);
  body.appendChild(top);
  const divider = document.createElement('div');
  divider.className = 'contact-info-divider';
  body.appendChild(divider);
  renderProfileSections(body, LEGAL_SECTIONS, [], LEGAL_CREDITS, {});
  drawer.appendChild(body);

  if (sidebar) sidebar.style.display = 'none';
  const navRail = container.querySelector('.nav-rail');
  if (navRail && navRail.nextSibling) container.insertBefore(drawer, navRail.nextSibling);
  else container.appendChild(drawer);
  requestAnimationFrame(() => { drawer.classList.add('open'); body.scrollTop = 0; });

  function destroy() {
    drawer.remove();
    if (sidebar) sidebar.style.display = '';
    if (onClose) onClose();
  }
  return { destroy, element: drawer };
}
