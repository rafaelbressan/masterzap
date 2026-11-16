/**
 * A reply's quote: the message it answers, as the bubble shows it on top.
 *
 * The data carries the quoted excerpt (`quoted`), who wrote it
 * (`quoted_sender`), the quoted message's id when it is in the conversation
 * too (`quoted_id`) and, when that message is a card, its kind (`quoted_type`:
 * document, contact). scripts/build_ipj_data.py fills them in, and
 * scripts/message_schema.py refuses a reply without its author.
 *
 * No DOM here: the export and the static pages read it too.
 */
import { ownerOf, contactOf } from './participants.js';
import { parseContacts } from './media.js';

/**
 * @returns {null | {id: number|null, fromOwner: boolean, author: string,
 *   sender: string, kind: string, text: string, excerpt: string}}
 *   `author` as WhatsApp labels it ("Você" for the phone's owner, the contact
 *   as saved); `sender` as the messages sign it, for text read outside the
 *   app. `text` is what the bubble shows (a quoted card by its name);
 *   `excerpt` the quote whole, number and all. Null when the message quotes
 *   nothing, or was deleted (WhatsApp drops the quote with it).
 */
export function quoteOf(msg, conversation) {
  if (!msg?.quoted || msg.type === 'deleted') return null;
  const fromOwner = msg.quoted_sender === ownerOf(conversation);
  const kind = msg.quoted_type || 'text';
  const card = kind === 'contact'
    ? parseContacts(msg.quoted.replace(/^\[contato\]/i, '[cartão de contato]').replace(/\s+(\+\d)/, ' — $1'))[0]
    : null;
  return {
    id: msg.quoted_id ?? null,
    fromOwner,
    // In a group the quoted member, not the group's name.
    author: fromOwner ? 'Você' : (conversation?.is_group && msg.quoted_sender) || contactOf(conversation),
    sender: msg.quoted_sender,
    kind,
    text: card?.name || msg.quoted,
    excerpt: msg.quoted,
  };
}
