/**
 * Conversations the reader pinned to the top of the list — up to three, as
 * WhatsApp — kept in this browser (see stored-list.js: validated on reading,
 * memory when storage fails, other tabs picked up).
 *
 * The most recently pinned goes first.
 */
import { createStoredList } from './stored-list.js';

export const MAX_PINNED = 3;
const ID = /^[a-z0-9-]+$/;

const list = createStoredList('masterwhats:conversas-fixadas', (saved) => {
  const pins = [];
  for (const id of saved) {
    if (typeof id === 'string' && ID.test(id) && !pins.includes(id)) pins.push(id);
    if (pins.length === MAX_PINNED) break;
  }
  return pins;
}, 'pinchange');

/** @returns {string[]} the pinned ids, most recently pinned first */
export function pinnedConversations() {
  return list.load().slice();
}

export function isPinned(conversationId) {
  return list.load().includes(conversationId);
}

/**
 * Pin or unpin a conversation.
 * @returns {'pinned'|'unpinned'|'limit'|'invalid'}
 */
export function togglePinned(conversationId) {
  if (typeof conversationId !== 'string' || !ID.test(conversationId)) return 'invalid';
  const pins = list.fresh();
  const index = pins.indexOf(conversationId);
  if (index >= 0) {
    pins.splice(index, 1);
    list.save();
    list.announce();
    return 'unpinned';
  }
  if (pins.length >= MAX_PINNED) return 'limit';
  pins.unshift(conversationId);
  list.save();
  list.announce();
  return 'pinned';
}

/**
 * The conversations in list order: the pinned ones first (most recently
 * pinned on top), then the rest as they were.
 * @param {Array<{id: string}>} conversations
 */
export function orderWithPinned(conversations) {
  const pinned = list.load();
  const byId = new Map(conversations.map(c => [c.id, c]));
  const top = pinned.map(id => byId.get(id)).filter(Boolean);
  return [...top, ...conversations.filter(c => !pinned.includes(c.id))];
}

/** Forget the in-memory copy (for tests). */
export const resetPinned = list.reset;
