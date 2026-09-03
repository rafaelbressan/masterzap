/**
 * EmptyState — what the main area shows when nothing is selected, in the
 * shape WhatsApp Web uses: a plain ground, a white card with an icon, a
 * title and a line of text, and a footer pinned to the bottom.
 *
 * The same card serves the calls screen (its own title and text) and the
 * Sobre/Perfil placeholders (icon and title only, no footer).
 *
 * Security note: innerHTML contains only static markup; titles and texts
 * come from the callers as constants and go in through textContent.
 */

const LOCK_ICON = `<svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>`;

const DEFAULT = {
  title: 'MasterWhats',
  text: 'Visualizador de conversas vazadas do Daniel Vorcaro. Selecione a conversa ao lado para começar.',
  footer: 'Suas mensagens são exibidas nacionalmente para todos do Brasil.',
};

/**
 * @param {HTMLElement} container
 * @param {object} [o]
 * @param {string} [o.title]
 * @param {string} [o.text] - omit for a card with icon and title only
 * @param {string} [o.iconSvg] - static SVG in place of the logo
 * @param {string|null} [o.footer] - null for no footer
 * @param {string} [o.className] - extra class on the root (e.g. profile-placeholder)
 * @returns {HTMLElement}
 */
export function renderEmptyState(container, { title = DEFAULT.title, text = DEFAULT.text, iconSvg = null, footer = DEFAULT.footer, className = '' } = {}) {
  const el = document.createElement('div');
  el.className = `empty-state${className ? ` ${className}` : ''}`;

  const card = document.createElement('div');
  card.className = 'empty-state-card';

  const icon = document.createElement('div');
  icon.className = 'empty-state-icon';
  if (iconSvg) icon.innerHTML = iconSvg; // static SVG from the caller
  else {
    const img = document.createElement('img');
    img.src = '/assets/masterzap-logo.png';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    icon.appendChild(img);
  }
  card.appendChild(icon);

  const h1 = document.createElement('h1');
  h1.className = 'empty-state-title';
  h1.textContent = title;
  card.appendChild(h1);

  if (text) {
    const p = document.createElement('p');
    p.className = 'empty-state-text';
    p.textContent = text;
    card.appendChild(p);
  }
  el.appendChild(card);

  if (footer) {
    const foot = document.createElement('div');
    foot.className = 'empty-state-footer';
    foot.innerHTML = LOCK_ICON;
    const span = document.createElement('span');
    span.textContent = footer;
    foot.appendChild(span);
    el.appendChild(foot);
  }

  container.appendChild(el);
  return el;
}
