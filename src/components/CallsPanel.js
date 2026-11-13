/**
 * The Calls screen: every call Vorcaro made or received that the material
 * records, newest first, the way WhatsApp lists them.
 *
 * A row is a contact, an arrow saying who called whom (red when a call came
 * in and was missed), the date and time, and the kind of call at the right.
 * Consecutive calls with the same person on the same day fold into one row
 * with a count, as on the phone. Tapping the row or the icon goes to the
 * message in the chat where that call is — there is nothing to call back.
 *
 * The buttons across the top are drawn for fidelity and disabled: this is a
 * record, not a phone.
 *
 * Security note: names come from the data and go in as textContent; the only
 * innerHTML is static SVG.
 */

import { contactOf } from '../lib/participants.js';
import { defaultAvatarSvg } from '../lib/avatar.js';
import { formatDateShort } from '../lib/utils.js';
import { ICON_SEARCH, ICON_MEETBALL } from '../lib/icons.js';

const ICON_PHONE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const ICON_VIDEO = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_KEYPAD = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`;
const ICON_HEART = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const ICON_OUT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`;
const ICON_IN = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17"/><path d="M16 17H7V8"/></svg>`;

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 de jul. de 2024, 15:42" */
export function formatCallTime(timestamp, date) {
  // A call whose time the source could not read has a date and nothing else.
  if (!timestamp) return formatDateShort(date);
  const d = new Date(timestamp);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dayFmt.format(d)}, ${time}`;
}

/**
 * Fold consecutive calls with the same contact on the same day into one row.
 * @returns {{ call: object, count: number }[]} newest first, `call` the latest
 */
export function groupCalls(calls) {
  const rows = [];
  for (const call of calls) {
    const last = rows[rows.length - 1];
    if (last && last.call.conversation_id === call.conversation_id && last.call.date === call.date
      && last.call.outgoing === call.outgoing && last.call.status === call.status) {
      last.count += 1;
      last.oldest = call;
    } else {
      rows.push({ call, count: 1, oldest: call });
    }
  }
  return rows;
}

/** What the row says under the name. */
function describe(call) {
  const parts = [];
  if (call.status === 'missed') parts.push(call.outgoing ? 'Não atendida' : 'Perdida');
  else if (call.status === 'no_answer') parts.push('Sem resposta');
  else if (call.duration) parts.push(call.duration.includes(':') ? `duração ${call.duration}` : call.duration);
  return parts.join(' · ');
}

/**
 * @param {object} o
 * @param {object[]} o.calls - from calls.json, newest first
 * @param {object[]} o.conversations
 * @param {function} o.avatarFor - conversation id → image URL or null
 * @param {function} o.onOpen - (conversationId, messageId)
 * @returns {HTMLElement}
 */
export function renderCallsPanel({ calls, conversations, avatarFor, onOpen }) {
  const byId = new Map(conversations.map(c => [c.id, c]));
  const nameOf = (id) => (byId.has(id) ? contactOf(byId.get(id)) : id);

  const panel = document.createElement('section');
  panel.className = 'calls-panel';
  panel.setAttribute('aria-label', 'Chamadas');

  const header = document.createElement('div');
  header.className = 'calls-header';
  const title = document.createElement('h2');
  title.className = 'calls-title';
  title.textContent = 'Chamadas';
  header.appendChild(title);
  for (const [icon, label] of [[ICON_SEARCH, 'Pesquisar chamadas'], [ICON_MEETBALL, 'Menu']]) {
    const b = document.createElement('button');
    b.className = 'calls-header-btn';
    b.disabled = true;
    b.setAttribute('aria-label', label);
    b.innerHTML = icon;
    header.appendChild(b);
  }
  panel.appendChild(header);

  // The row of actions WhatsApp puts on top. None of them can do anything
  // here, and they say so.
  const actions = document.createElement('div');
  actions.className = 'calls-actions';
  for (const [icon, label] of [[ICON_PHONE, 'Ligar'], [ICON_CALENDAR, 'Agendar'], [ICON_KEYPAD, 'Teclado'], [ICON_HEART, 'Favoritos']]) {
    const b = document.createElement('button');
    b.className = 'calls-action';
    b.disabled = true;
    b.setAttribute('aria-label', label);
    b.innerHTML = `<span class="calls-action-icon">${icon}</span><span class="calls-action-label">${label}</span>`;
    actions.appendChild(b);
  }
  panel.appendChild(actions);

  const heading = document.createElement('h3');
  heading.className = 'calls-recent';
  heading.textContent = 'Recentes';
  panel.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'calls-list';
  list.setAttribute('role', 'list');
  for (const { call, count } of groupCalls(calls)) {
    list.appendChild(renderRow(call, count, nameOf(call.conversation_id), avatarFor(call.conversation_id), onOpen));
  }
  panel.appendChild(list);

  const foot = document.createElement('p');
  foot.className = 'calls-foot';
  foot.textContent = `${calls.length} chamadas registradas no material. Tocar numa chamada abre a conversa no ponto em que ela aconteceu.`;
  panel.appendChild(foot);
  return panel;
}

function renderRow(call, count, name, avatar, onOpen) {
  const row = document.createElement('div');
  row.className = `calls-item${call.status === 'missed' && !call.outgoing ? ' missed' : ''}`;
  row.setAttribute('role', 'listitem');
  row.dataset.conversation = call.conversation_id;
  row.dataset.message = call.message_id;
  const open = () => onOpen(call.conversation_id, call.message_id);

  const main = document.createElement('button');
  main.className = 'calls-item-main';
  main.addEventListener('click', open);

  const av = document.createElement('span');
  av.className = 'calls-item-avatar';
  if (avatar) {
    const img = document.createElement('img');
    img.src = avatar;
    img.alt = name;
    av.appendChild(img);
  } else {
    av.innerHTML = defaultAvatarSvg(name, 48);
  }
  main.appendChild(av);

  const text = document.createElement('span');
  text.className = 'calls-item-text';
  const who = document.createElement('span');
  who.className = 'calls-item-name';
  who.textContent = count > 1 ? `${name} (${count})` : name;
  text.appendChild(who);
  const meta = document.createElement('span');
  meta.className = 'calls-item-meta';
  const arrow = document.createElement('span');
  arrow.className = `calls-item-arrow ${call.outgoing ? 'out' : 'in'}`;
  arrow.setAttribute('aria-label', call.outgoing ? 'Chamada feita' : 'Chamada recebida');
  arrow.innerHTML = call.outgoing ? ICON_OUT : ICON_IN;
  meta.appendChild(arrow);
  const when = document.createElement('span');
  const detail = describe(call);
  when.textContent = detail ? `${formatCallTime(call.timestamp, call.date)} · ${detail}` : formatCallTime(call.timestamp, call.date);
  meta.appendChild(when);
  text.appendChild(meta);
  main.appendChild(text);
  row.appendChild(main);

  const kind = document.createElement('button');
  kind.className = 'calls-item-kind';
  kind.setAttribute('aria-label', call.kind === 'video' ? 'Chamada de vídeo — ver na conversa' : 'Chamada de voz — ver na conversa');
  kind.innerHTML = call.kind === 'video' ? ICON_VIDEO : ICON_PHONE;
  kind.addEventListener('click', open);
  row.appendChild(kind);
  return row;
}
