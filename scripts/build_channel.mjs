/**
 * The MasterWhats channel ("Atualizações"): data/canal/posts.json →
 * public/data/canal.json, run after split_data.py.
 *
 * Adds what the app needs and the source does not say: how many messages
 * cite a flight's aircraft (counted with the app's own search, over the same
 * indexes, so the number is what "Ver as N mensagens" will list), and which
 * passengers have a conversation here (the link in the post).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchIndex } from '../src/lib/search.js';
import { conversationOfPerson } from '../src/lib/groups.js';
import { ownerName, DEFAULT_OWNER } from '../src/lib/participants.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The phone's owner as the site names him (src/lib/participants.js): his
// profile, not a chat. The channel is the site's, so the default owner.
const OWNER_NAMES = new Set([ownerName({}), DEFAULT_OWNER]);

const { channel, posts } = JSON.parse(readFileSync(join(ROOT, 'data/canal/posts.json'), 'utf8'));
const { conversations } = JSON.parse(readFileSync(join(ROOT, 'public/data/conversations.json'), 'utf8'));
const sources = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, 'data/sources.json'), 'utf8')).sources.map(s => [s.id, s]));

const indexes = conversations.map(c => {
  const path = join(ROOT, 'public/data', c.id, 'search-index.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
});

/** How many messages the app's search finds for a term, over every chat. */
function mentions(term) {
  if (!term) return 0;
  return indexes.reduce((n, index) => n + searchIndex(index, term, { limit: Infinity }).length, 0);
}

const out = posts.map(post => {
  if (!sources[post.source_id]) throw new Error(`canal: ${post.id}: fonte ${post.source_id} não existe em data/sources.json`);
  for (const leg of post.legs) {
    if (!Number.isFinite(leg.lat) || !Number.isFinite(leg.lng)) throw new Error(`canal: ${post.id}: ${leg.place} sem coordenadas`);
  }
  const { fork, ...rest } = post;
  return {
    ...rest,
    passengers: post.passengers.map(name => ({
      name,
      owner: OWNER_NAMES.has(name) || undefined,
      conversation_id: OWNER_NAMES.has(name) ? undefined : conversationOfPerson(name, conversations)?.id,
    })),
    mentions: mentions(post.prefix),
    context: fork?.section_note || null,
    source_label: sources[post.source_id].titulo,
  };
});

writeFileSync(join(ROOT, 'public/data/canal.json'), JSON.stringify({ channel, posts: out }));
console.log(`canal: ${out.length} publicações; ${out.filter(p => p.mentions).length} com mensagens que citam o avião`);
