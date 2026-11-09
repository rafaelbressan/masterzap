/**
 * Where the reader stopped in each conversation, for this browser session.
 *
 * Leaving a chat (back to the list on mobile, another contact on desktop) and
 * coming back should land where the reader was, not at the end — the way a
 * messaging app keeps each chat's place. Kept in sessionStorage so it also
 * survives a reload of the tab, and forgotten when the tab closes. Storage
 * can be unavailable (private mode, blocked site data); the in-memory copy
 * still works for the visit.
 */

const KEY = 'masterwhats:posicao';
const memory = new Map();

function readStore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    for (const [id, position] of Object.entries(saved)) if (!memory.has(id)) memory.set(id, position);
  } catch { /* storage unavailable: memory only */ }
}

function writeStore() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch { /* storage unavailable or full: memory only */ }
}

let loaded = false;

/**
 * @param {string} conversationId
 * @param {{date: string, id: string, offset: number, contiguous: boolean}|null} position
 *   null means "at the end": the next visit opens at the newest message.
 */
export function savePosition(conversationId, position) {
  if (!loaded) { readStore(); loaded = true; }
  if (position) memory.set(conversationId, position);
  else memory.delete(conversationId);
  writeStore();
}

/** @returns {{date: string, id: string, offset: number, contiguous: boolean}|null} */
export function getPosition(conversationId) {
  if (!loaded) { readStore(); loaded = true; }
  return memory.get(conversationId) || null;
}

/** For tests. */
export function clearPositions() {
  memory.clear();
  loaded = false;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
