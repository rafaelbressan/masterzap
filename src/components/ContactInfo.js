/**
 * ContactInfo — slide-in drawer showing contact details.
 * Triggered by clicking the avatar or contact name in chat header.
 *
 * Matches WhatsApp's "Info do contato" panel.
 *
 * Security note: innerHTML used only with static SVG icon literals.
 * All dynamic text uses textContent.
 */

import { getContactProfile, SOURCES, CREDITS } from '../lib/profile-content.js';
import { renderProfileSections } from './ProfileSections.js';
import { defaultAvatarSvg } from '../lib/avatar.js';

const ICON_MEDIA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
const ICON_STAR = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
const ICON_CLOCK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
import { ICON_SEARCH } from '../lib/icons.js';
import { SEALS, SEAL_ICONS, sourceById } from '../lib/provenance.js';


/**
 * Show contact info drawer.
 * @param {HTMLElement} mainArea - the .main-area element
 * @param {object} conversation - conversation metadata
 * @param {object} [options]
 * @param {Record<string,number>} [options.mediaCounts] - { images, videos, documents }
 * @param {function} [options.onClose]
 * @param {string} [options.at] - selector of a row to bring into view once open
 * @returns {{ element: HTMLElement, destroy: function }}
 */
export function showContactInfo(mainArea, conversation, { mediaCounts = {}, onClose, onSearch, actions = {}, at = null } = {}) {
  // Remove existing drawer if any
  const existing = mainArea.querySelector('.contact-info-drawer');
  if (existing) existing.remove();

  const displayName = conversation.participants.find(p => p !== 'DV') || conversation.participants[0];
  const contactProfile = getContactProfile(conversation.id);
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
    // Generated SVG — no user data, safe innerHTML
    avatarEl.innerHTML = defaultAvatarSvg(conversation.id, 120);
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
  searchBtn.style.cursor = 'pointer';
  // Static SVG icon — safe innerHTML
  searchBtn.innerHTML = `${ICON_SEARCH} <span>Pesquisar</span>`;
  if (onSearch) searchBtn.addEventListener('click', onSearch);
  profile.appendChild(searchBtn);

  body.appendChild(profile);
  body.appendChild(createDivider());

  // Recado / About section
  if (contactProfile?.about) {
    const aboutSection = document.createElement('div');
    aboutSection.className = 'contact-info-section';

    const aboutLabel = document.createElement('div');
    aboutLabel.className = 'contact-info-section-label';
    aboutLabel.textContent = 'Recado';
    aboutSection.appendChild(aboutLabel);

    const aboutValue = document.createElement('div');
    aboutValue.className = 'contact-info-section-value';
    aboutValue.textContent = contactProfile.about;
    aboutSection.appendChild(aboutValue);

    body.appendChild(aboutSection);
    body.appendChild(createDivider());
  }

  // Action items
  const actionsEl = document.createElement('div');
  actionsEl.className = 'contact-info-actions';

  actionsEl.appendChild(createActionItem(ICON_MEDIA, 'Mídias, links e documentos', totalMedia.toLocaleString('pt-BR'), false, true));
  actionsEl.appendChild(createActionItem(ICON_STAR, 'Mensagens importantes', '', false, true));
  actionsEl.appendChild(createActionItem(ICON_BELL, 'Modo silencioso', '', true, true));
  actionsEl.appendChild(createActionItem(ICON_CLOCK, 'Mensagens temporárias', contactProfile?.ephemeral || 'Não', false, true));
  actionsEl.appendChild(createActionItem(ICON_LOCK, 'Privacidade avançada da conversa', 'Desativada', false, true));
  actionsEl.appendChild(createActionItem(ICON_SHIELD, 'Criptografia', 'As mensagens são protegidas com criptografia de ponta a ponta.', false, true));
  const sourceItem = createSourceItem(conversation);
  if (sourceItem) actionsEl.appendChild(sourceItem);

  body.appendChild(actionsEl);
  body.appendChild(createDivider());

  // Investigation section, when this contact has a profile written for them
  if (contactProfile) {
    renderProfileSections(body, contactProfile.sections, SOURCES, CREDITS, actions);
  }

  drawer.appendChild(body);
  mainArea.appendChild(drawer);

  // Trigger open animation and reset scroll
  requestAnimationFrame(() => {
    drawer.classList.add('open');
    body.scrollTop = 0;
  });

  // Opened to show one row (the seal notice opens it at "Fonte"). Only once
  // the drawer has its width: it opens by growing, and while narrow its text
  // wraps into a column many times taller, so a row found then is somewhere
  // else by the time the drawer settles.
  if (at) {
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      body.querySelector(at)?.scrollIntoView({ block: 'center' });
    };
    drawer.addEventListener('transitionend', (e) => { if (e.target === drawer && e.propertyName === 'width') show(); });
    // No transition (reduced motion, a width already set by the layout): go anyway.
    setTimeout(show, 400);
  }

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

function createActionItem(iconSvg, label, detail, hasToggle = false, disabled = false) {
  const item = document.createElement('div');
  item.className = 'contact-info-action-item';
  if (disabled) item.classList.add('disabled');

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

/**
 * "Fonte": where this conversation's messages came from and their seal, in
 * the shape of the rows above it, with the document's links and hash below.
 */
function createSourceItem(conversation) {
  const seal = SEALS[conversation.verification];
  if (!seal) return null;
  const source = sourceById(conversation.source_id);
  const doc = conversation.source_document || null;
  const detail = [source?.orgao_ou_veiculo, source?.data && formatSourceDate(source.data), seal.label].filter(Boolean).join(' · ');

  // Static SVG literal from provenance.js, scaled to the row's 20px icons
  const item = createActionItem(SEAL_ICONS[conversation.verification].replace(/width="14" height="14"/, 'width="20" height="20"'), 'Fonte', detail);
  item.classList.add('contact-info-source');
  const text = item.querySelector('.contact-info-action-text');

  const lines = [source?.titulo || conversation.source, seal.explanation];
  for (const line of lines.filter(Boolean)) {
    const p = document.createElement('span');
    p.className = 'contact-info-action-detail';
    p.textContent = line;
    text.appendChild(p);
  }

  const links = [
    [doc?.url || source?.url, doc ? 'Abrir documento' : 'Abrir a matéria'],
    [source?.archive_url, 'Cópia arquivada'],
  ].filter(([href]) => href && /^https:\/\//.test(href));
  if (links.length) {
    const row = document.createElement('span');
    row.className = 'contact-info-source-links';
    for (const [href, label] of links) {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label;
      row.appendChild(a);
    }
    text.appendChild(row);
  }

  if (doc?.sha256) {
    const hash = document.createElement('code');
    hash.className = 'contact-info-source-hash';
    hash.textContent = `SHA-256 ${doc.sha256}`;
    text.appendChild(hash);
  }
  return item;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-08-27" → "27/08/2026"; "2026-03" → "março de 2026". */
function formatSourceDate(date) {
  const [y, m, d] = date.split('-');
  if (d) return `${d}/${m}/${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} de ${y}`;
  return y;
}
