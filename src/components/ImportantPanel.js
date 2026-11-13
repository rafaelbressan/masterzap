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
import { isOutgoing as isOwnerMessage } from '../lib/participants.js';
import { formatDateShort } from '../lib/utils.js';
import { importantMessages, toggleImportant } from '../lib/important-messages.js';
import { ICON_STAR, ICON_ARROW_BACK, ICON_TICKS } from '../lib/icons.js';


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
  // Star, then the note's ⓘ if any, then the time (as ChatView draws them).
  meta.insertBefore(el, meta.querySelector('.chat-msg-note-flag') || meta.querySelector('.chat-msg-time'));
}

/**
 * @param {object} options
 * @param {string|null} [options.conversationId] - only this conversation's marks
 * @param {function} options.nameOf - (conversationId) => the name the list shows
 * @param {function} [options.isOutgoing] - (mark) => whether the phone's owner sent it
 * @param {function} options.onOpen - (conversationId, messageId) => void
 * @param {function} options.onBack - () => void
 * @returns {HTMLElement}
 */
export function renderImportantPanel({ conversationId = null, nameOf, isOutgoing = (mark) => isOwnerMessage(mark), onOpen, onBack }) {
  const panel = document.createElement('section');
  panel.className = 'important-panel';
  panel.setAttribute('aria-label', 'Mensagens importantes');

  const header = document.createElement('header');
  header.className = 'important-header';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'important-back';
  back.setAttribute('aria-label', 'Voltar');
  back.innerHTML = ICON_ARROW_BACK; // Static SVG
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
    // The double tick marks the owner's own messages, as in the search results.
    if (isOutgoing(mark)) content.insertAdjacentHTML('afterbegin', ICON_TICKS); // Static SVG
    content.append(mark.content.trim() || 'Mensagem sem texto');

    const unmark = document.createElement('button');
    unmark.type = 'button';
    unmark.className = 'important-unmark';
    unmark.setAttribute('aria-label', 'Desmarcar como importante');
    unmark.title = 'Desmarcar como importante';
    unmark.innerHTML = ICON_STAR; // Static SVG
    unmark.addEventListener('click', (e) => {
      e.stopPropagation();
      // The keyboard stays in the list: on the row that takes this one's
      // place, the one before at the end, the back arrow when none is left.
      const index = [...list.children].indexOf(item);
      const hadFocus = item.contains(document.activeElement);
      toggleImportant({ conversationId: mark.conversationId, id: mark.messageId });
      draw();
      if (!hadFocus) return;
      const rows = list.querySelectorAll('.important-item');
      (rows[Math.min(index, rows.length - 1)] || back).focus();
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
  // Where the keyboard starts when the list opens.
  panel.focusStart = () => back.focus({ preventScroll: true });
  return panel;
}
