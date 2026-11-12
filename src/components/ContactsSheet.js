/**
 * The list behind "Ver todos" on a contact card that carries more than one
 * entry — the way WhatsApp opens a screen for a card with several contacts.
 *
 * Only the message button does anything, and only for a number Vorcaro had a
 * chat with; call and video are drawn disabled, as on the reference. A number
 * with no chat is copied instead.
 *
 * Security note: names and numbers come from the transcription and go in as
 * textContent; the only innerHTML is static SVG.
 */

import { ICON_ARROW_BACK } from '../lib/icons.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { conversationForPhone } from '../lib/media.js';

const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
export const ICON_MESSAGE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
export const ICON_CALL = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
export const ICON_VIDEOCALL = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`;

/**
 * @param {HTMLElement} container
 * @param {{ name: string, phone: string|null, org: string|null }[]} contacts
 * @param {object} o
 * @param {object[]} o.conversations - to know which numbers have a chat
 * @param {function} o.avatarFor - conversation id → image URL or null
 * @param {function} o.onOpenChat - conversation id
 * @param {function} o.onCopy - (text, label)
 */
export function showContactsSheet(container, contacts, { conversations, avatarFor, onOpenChat, onCopy }) {
  const sheet = document.createElement('div');
  sheet.className = 'contacts-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Contatos compartilhados');

  const bar = document.createElement('div');
  bar.className = 'contacts-sheet-bar';
  const back = document.createElement('button');
  back.className = 'contacts-sheet-back';
  back.setAttribute('aria-label', 'Fechar');
  // A back arrow on the phone, an X on the web; CSS shows one per width.
  back.innerHTML = `<span class="is-back">${ICON_ARROW_BACK}</span><span class="is-close">${ICON_CLOSE}</span>`;
  bar.appendChild(back);
  const title = document.createElement('span');
  title.className = 'contacts-sheet-title';
  title.textContent = 'Ver contatos';
  bar.appendChild(title);
  sheet.appendChild(bar);

  const list = document.createElement('div');
  list.className = 'contacts-sheet-list';
  for (const contact of contacts) {
    list.appendChild(renderRow(contact, { conversations, avatarFor, onOpenChat, onCopy, close }));
  }
  sheet.appendChild(list);

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    sheet.remove();
  }
  function onKeydown(e) { if (e.key === 'Escape') close(); }
  back.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown, true);
  // On a wide screen the sheet is a dialog over a dimmed chat; clicking the
  // dim closes it. On the phone it fills the screen and there is nothing to hit.
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });

  container.appendChild(sheet);
  return { element: sheet, close };
}

function renderRow(contact, { conversations, avatarFor, onOpenChat, onCopy, close }) {
  const match = conversationForPhone(contact.phone, conversations);
  const row = document.createElement('div');
  row.className = 'contacts-sheet-item';

  const head = document.createElement('div');
  head.className = 'contacts-sheet-head';
  const avatar = document.createElement('span');
  avatar.className = 'contacts-sheet-avatar';
  const src = match ? avatarFor(match.id) : null;
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = contact.name;
    avatar.appendChild(img);
  } else {
    avatar.innerHTML = defaultAvatarSvg(contact.name, 48);
  }
  head.appendChild(avatar);
  const name = document.createElement('span');
  name.className = 'contacts-sheet-name';
  name.textContent = contact.name;
  head.appendChild(name);
  row.appendChild(head);

  if (contact.phone) {
    const line = document.createElement('div');
    line.className = 'contacts-sheet-phone';
    const msgBtn = document.createElement('button');
    msgBtn.className = 'contacts-sheet-action';
    msgBtn.setAttribute('aria-label', match ? 'Enviar mensagem' : 'Copiar número');
    msgBtn.innerHTML = ICON_MESSAGE;
    msgBtn.addEventListener('click', () => {
      if (match) { close(); onOpenChat(match.id); } else onCopy(contact.phone, 'Número copiado');
    });
    line.appendChild(msgBtn);
    const text = document.createElement('div');
    text.className = 'contacts-sheet-phone-text';
    const num = document.createElement('span');
    num.textContent = contact.phone;
    text.appendChild(num);
    const kind = document.createElement('small');
    kind.textContent = contact.org || 'Celular';
    text.appendChild(kind);
    line.appendChild(text);
    for (const [icon, label] of [[ICON_CALL, 'Ligar'], [ICON_VIDEOCALL, 'Chamada de vídeo']]) {
      const b = document.createElement('button');
      b.className = 'contacts-sheet-action';
      b.disabled = true;
      b.setAttribute('aria-label', label);
      b.innerHTML = icon;
      line.appendChild(b);
    }
    row.appendChild(line);
  }
  return row;
}
