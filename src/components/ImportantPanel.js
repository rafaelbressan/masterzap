/**
 * "Mensagens importantes": the messages the reader starred, newest mark
 * first, in the sidebar's place (as the calls screen). One conversation's
 * only when opened from its contact info.
 *
 * A row is the conversation, the date and the message, with a star that
 * unmarks it; tapping the row opens the chat at that message.
 *
 * Security note: every text is set with textContent; the only innerHTML is
 * static SVG.
 */
import { formatDateShort } from '../lib/utils.js';
import { importantMessages, toggleImportant } from '../lib/important-messages.js';

export const ICON_STAR = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3-4.58-4.46 6.33-.92L12 2.8Z"/></svg>`;
const ICON_BACK = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`;
const ICON_TICKS = `<svg class="search-result-ticks" viewBox="0 0 16 11" width="16" height="11" aria-hidden="true"><path fill="currentColor" d="M11.07.65a.46.46 0 0 0-.65.08L4.8 7.8 2.07 5.13a.46.46 0 0 0-.65.01.46.46 0 0 0 0 .65l3.08 3.02a.46.46 0 0 0 .69-.05l5.96-7.46a.46.46 0 0 0-.08-.65Zm3.5 0a.46.46 0 0 0-.65.08L8.3 7.8l-.6-.58a.46.46 0 0 0-.64.66l.94.92a.46.46 0 0 0 .69-.05l5.96-7.46a.46.46 0 0 0-.08-.65Z"/></svg>`;

/**
 * Show or hide the star by a bubble's time (its .chat-msg-meta), as WhatsApp
 * marks an important message.
 * @param {HTMLElement} meta
 * @param {boolean} on
 */
export function setBubbleStar(meta, on) {
  const star = meta.querySelector('.chat-msg-star');
  if (!on) { star?.remove(); return; }
  if (star) return;
  const el = document.createElement('span');
  el.className = 'chat-msg-star';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Importante');
  el.title = 'Importante';
  el.innerHTML = ICON_STAR; // Static SVG
  meta.insertBefore(el, meta.querySelector('.chat-msg-time'));
}

/**
 * @param {object} options
 * @param {string|null} [options.conversationId] - only this conversation's marks
 * @param {function} options.nameOf - (conversationId) => the name the list shows
 * @param {function} options.onOpen - (conversationId, messageId) => void
 * @param {function} options.onBack - () => void
 * @returns {HTMLElement}
 */
export function renderImportantPanel({ conversationId = null, nameOf, onOpen, onBack }) {
  const panel = document.createElement('section');
  panel.className = 'important-panel';
  panel.setAttribute('aria-label', 'Mensagens importantes');

  const header = document.createElement('header');
  header.className = 'important-header';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'important-back';
  back.setAttribute('aria-label', 'Voltar');
  back.innerHTML = ICON_BACK; // Static SVG
  back.addEventListener('click', () => onBack?.());
  const title = document.createElement('h1');
  title.className = 'important-title';
  title.textContent = 'Mensagens importantes';
  header.append(back, title);

  const list = document.createElement('div');
  list.className = 'important-list';
  list.setAttribute('role', 'list');

  function row(mark) {
    const item = document.createElement('div');
    item.className = 'search-result-item important-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.conversationId = mark.conversationId;
    item.dataset.messageId = mark.messageId;

    const top = document.createElement('div');
    top.className = 'search-result-top';
    const contact = document.createElement('span');
    contact.className = 'search-result-sender';
    contact.textContent = nameOf(mark.conversationId);
    const date = document.createElement('span');
    date.className = 'search-result-date';
    date.textContent = formatDateShort(mark.date);
    top.append(contact, date);

    const bottom = document.createElement('div');
    bottom.className = 'important-item-bottom';
    const content = document.createElement('div');
    content.className = 'search-result-content';
    // The double tick marks DV's own messages, as in the search results.
    if (mark.sender === 'DV') content.insertAdjacentHTML('afterbegin', ICON_TICKS); // Static SVG
    content.append(mark.content.trim() || 'Mensagem sem texto');

    const unmark = document.createElement('button');
    unmark.type = 'button';
    unmark.className = 'important-unmark';
    unmark.setAttribute('aria-label', 'Desmarcar como importante');
    unmark.title = 'Desmarcar como importante';
    unmark.innerHTML = ICON_STAR; // Static SVG
    unmark.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleImportant({ conversationId: mark.conversationId, id: mark.messageId });
      draw();
    });
    bottom.append(content, unmark);

    item.append(top, bottom);
    const open = () => onOpen?.(mark.conversationId, mark.messageId);
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => {
      if (e.target !== item) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    return item;
  }

  function draw() {
    const marks = importantMessages(conversationId);
    list.replaceChildren();
    if (!marks.length) {
      const empty = document.createElement('div');
      empty.className = 'important-empty';
      const icon = document.createElement('div');
      icon.className = 'important-empty-icon';
      icon.innerHTML = ICON_STAR; // Static SVG
      const text = document.createElement('p');
      text.textContent = 'Nenhuma mensagem importante';
      const hint = document.createElement('p');
      hint.className = 'important-empty-hint';
      hint.textContent = 'Toque e segure uma mensagem, ou clique com o botão direito, e escolha "Marcar como importante" para encontrá-la aqui depois.';
      empty.append(icon, text, hint);
      list.appendChild(empty);
      return;
    }
    for (const mark of marks) list.appendChild(row(mark));
  }

  draw();
  panel.append(header, list);
  panel.refresh = draw;
  return panel;
}
