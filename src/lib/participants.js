/**
 * Who is who in a conversation: the phone's owner (whose messages are the
 * green, outgoing ones) and the contact on the other side.
 *
 * conversations.json carries both (scripts/split_data.py: `owner` from the
 * source's metadata, "DV" by default; `contact` named outright or the other
 * participant). Everything that needs them asks here, so a leak from another
 * person's phone needs no change but its data.
 */

/** The owner every source so far comes from: Daniel Vorcaro's phones. */
export const DEFAULT_OWNER = 'DV';

/** Owners' full names, for the "you" side of a message. */
export const OWNER_NAMES = { DV: 'Daniel Vorcaro' };

/** @returns {string} the sender id of the phone's owner */
export function ownerOf(conversation) {
  return conversation?.owner || DEFAULT_OWNER;
}

/** @returns {string} the name of the other side */
export function contactOf(conversation) {
  if (!conversation) return '';
  const owner = ownerOf(conversation);
  return conversation.contact
    || conversation.participants?.find(p => p !== owner)
    || conversation.participants?.[0]
    || conversation.id
    || '';
}

/** Whether a message was sent from the owner's phone (the green bubble). */
export function isOutgoing(message, conversation) {
  return !!message && message.sender === ownerOf(conversation);
}
