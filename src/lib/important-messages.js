/**
 * Messages the reader marked as important — the star of WhatsApp's "Mensagens
 * importantes" — kept in this browser.
 *
 * Each mark is a snapshot of the message (conversation, id, date, time, who
 * sent it, the text), so the list can be drawn without loading every
 * conversation. Saved in localStorage; storage can be unavailable (private
 * mode, blocked site data), in which case the marks last for the visit.
 * Whatever comes back from storage is validated: a corrupt or hand-edited
 * entry is dropped, never drawn.
 */

import { createStoredList } from './stored-list.js';

/**
 * @typedef {object} Mark
 * @property {string} conversationId
 * @property {string} messageId
 * @property {string} date - 'YYYY-MM-DD'
 * @property {string} time - 'HH:MM', or '' when the source has none
 * @property {string} sender
 * @property {string} content
 * @property {string} markedAt - ISO timestamp
 */

const keyOf = (conversationId, messageId) => `${conversationId}/${messageId}`;

function isMark(value) {
  return !!value
    && typeof value.conversationId === 'string' && /^[a-z0-9-]+$/.test(value.conversationId)
    && typeof value.messageId === 'string' && /^\d+$/.test(value.messageId)
    && typeof value.date === 'string'
    && typeof value.time === 'string'
    && typeof value.sender === 'string'
    && typeof value.content === 'string'
    && typeof value.markedAt === 'string';
}

const list = createStoredList('masterwhats:mensagens-importantes', (saved) => {
  const marks = [];
  const seen = new Set();
  for (const mark of saved) {
    if (!isMark(mark)) continue;
    const key = keyOf(mark.conversationId, mark.messageId);
    if (seen.has(key)) continue;
    seen.add(key);
    marks.push(mark);
  }
  return marks;
}, 'importantchange');

// conversation/message of every mark, one lookup per bubble drawn; rebuilt
// when the list is read again.
let keys = new Set();
let keysOf = null;
function load() {
  const marks = list.load();
  if (keysOf !== marks) {
    keys = new Set(marks.map(m => keyOf(m.conversationId, m.messageId)));
    keysOf = marks;
  }
  return marks;
}

/** @returns {Mark[]} newest first; the conversation's only when given one */
export function importantMessages(conversationId) {
  const all = load();
  return conversationId ? all.filter(m => m.conversationId === conversationId) : all.slice();
}

export function isImportant(conversationId, messageId) {
  load();
  return keys.has(keyOf(conversationId, String(messageId)));
}


/**
 * Mark or unmark a message.
 * @param {object} message - { conversationId, id, date, time, sender, content }
 * @returns {boolean} whether the message is now marked
 */
export function toggleImportant(message) {
  // As storage has it now: another tab may have changed it since.
  list.fresh();
  const all = load();
  const messageId = String(message.id);
  const key = keyOf(message.conversationId, messageId);
  const index = all.findIndex(m => keyOf(m.conversationId, m.messageId) === key);
  if (index >= 0) {
    all.splice(index, 1);
    keys.delete(key);
    list.save();
    list.announce({ conversationId: message.conversationId, messageId, marked: false });
    return false;
  }
  const mark = {
    conversationId: message.conversationId,
    messageId,
    date: message.date || '',
    time: message.time || '',
    sender: message.sender || '',
    content: message.content || '',
    markedAt: new Date().toISOString(),
  };
  if (!isMark(mark)) return false;
  all.unshift(mark);
  keys.add(key);
  list.save();
  list.announce({ conversationId: message.conversationId, messageId, marked: true });
  return true;
}

/** Forget the in-memory copy (for tests). */
export const resetImportantMessages = list.reset;
