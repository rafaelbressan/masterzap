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

const KEY = 'masterwhats:mensagens-importantes';

let marks = null; // Array<Mark>, newest first
let keys = new Set(); // conversation/message of every mark: one lookup per bubble drawn
let stored = true; // false once saving fails: then memory is the only copy

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

function load() {
  if (marks) return marks;
  marks = [];
  keys = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(saved)) {
      for (const mark of saved) {
        if (!isMark(mark)) continue;
        const key = keyOf(mark.conversationId, mark.messageId);
        if (keys.has(key)) continue;
        keys.add(key);
        marks.push(mark);
      }
    }
  } catch { /* storage unavailable or unreadable: start empty */ }
  return marks;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(marks));
    stored = true;
  } catch {
    stored = false; // storage unavailable or full: the marks last for the visit
  }
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

/** Tell whoever shows marks (the bubble's star, the list, a count). */
function announce(conversationId, messageId, marked) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('importantchange', { detail: { conversationId, messageId, marked } }));
}

/**
 * Mark or unmark a message.
 * @param {object} message - { conversationId, id, date, time, sender, content }
 * @returns {boolean} whether the message is now marked
 */
export function toggleImportant(message) {
  // Read storage afresh: another tab may have marked or unmarked since, and
  // saving a stale copy would undo what it did. Not when saving fails: then
  // the copy in memory is the only one.
  if (stored) marks = null;
  const all = load();
  const messageId = String(message.id);
  const key = keyOf(message.conversationId, messageId);
  const index = all.findIndex(m => keyOf(m.conversationId, m.messageId) === key);
  if (index >= 0) {
    all.splice(index, 1);
    keys.delete(key);
    save();
    announce(message.conversationId, messageId, false);
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
  save();
  announce(message.conversationId, messageId, true);
  return true;
}

// Another tab changed the marks: read them again, and let the screen follow
// (stars, the list, counts).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY && e.key !== null) return;
    marks = null;
    load();
    window.dispatchEvent(new CustomEvent('importantchange', { detail: { all: true } }));
  });
}

/** Forget the in-memory copy (for tests). */
export function resetImportantMessages() {
  marks = null;
  stored = true;
}
