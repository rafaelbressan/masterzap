/**
 * Group chats: who is in them and how each member is drawn.
 *
 * conversations.json marks a group with `is_group`, its name in `contact`,
 * and everyone but the phone's owner in `members` (scripts/split_data.py).
 * A member who also has a conversation of their own here ("Fábio Faria") is
 * drawn with that conversation's photo and colour, and opens it.
 */

import { ownerOf } from './participants.js';

const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** @returns {boolean} */
export const isGroup = (conversation) => conversation?.is_group === true;

/**
 * The conversation of a person by name, matching the name the list shows,
 * the one the phone saved, or any other name the data gives them.
 * @returns {object|null}
 */
export function conversationOfPerson(name, conversations) {
  const want = fold(name);
  if (!want) return null;
  return (conversations || []).find(c => !isGroup(c)
    && [c.contact, c.saved_as, ...(c.aliases || [])].some(n => fold(n) === want)) || null;
}

/**
 * Who a member is drawn as: the seed of their default photo and colour (their
 * conversation's id when they have one, else their name), and that
 * conversation's id to open.
 * @returns {{ seed: string, conversationId: string|null }}
 */
export function memberIdentity(name, conversations) {
  const own = conversationOfPerson(name, conversations);
  return { seed: own?.id || name, conversationId: own?.id || null };
}

/** The members besides the owner, as the data lists them. */
export function membersOf(conversation) {
  if (!isGroup(conversation)) return [];
  const owner = ownerOf(conversation);
  return (conversation.members || conversation.participants || []).filter(m => m && m !== owner);
}
