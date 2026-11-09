/**
 * Message ids are addresses: /#/chat/<id>/msg/<n>, the #msg-<n> anchors of the
 * static pages, the quotes in public/llms.txt and in index.html's <noscript>
 * all point at a number. Renumbering a conversation silently sends every one
 * of those links to a different message.
 *
 * tests/fixtures/message-ids.json pins, for every conversation, each id to a
 * short hash of what the message says (sender, timestamp, content). The test
 * in tests/unit/message-ids.test.js fails when an id changes content, when an
 * id disappears, or when a new message takes an id below the old maximum.
 *
 *   node scripts/message-ids.mjs                    add new conversations and new
 *                                                   ids (appended, above the max);
 *                                                   refuse anything else
 *   node scripts/message-ids.mjs --accept-changes   also rewrite ids whose content
 *                                                   changed — only for a correction
 *                                                   to an existing message (a fixed
 *                                                   sender, a typo in the source),
 *                                                   never for a renumbering
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = join(ROOT, 'tests/fixtures/message-ids.json');

const slugify = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** 8 hex characters: enough to notice a change, small enough for 66k messages. */
export const hashMessage = (m) => createHash('sha256')
  .update(`${m.sender}\u0000${m.timestamp ?? `${m.date} ${m.time ?? ''}`}\u0000${m.content ?? ''}`)
  .digest('hex').slice(0, 8);

/** Every conversation in data/, as { id: { messageId: hash } }. */
export function currentIds() {
  const out = {};
  const add = (convId, messages) => {
    out[convId] = Object.fromEntries(messages.map(m => [m.id, hashMessage(m)]));
  };
  const martha = JSON.parse(readFileSync(join(ROOT, 'data/messages.json'), 'utf-8'));
  add(slugify(martha.metadata.participants.find(p => p !== 'DV')), martha.messages);
  const dir = join(ROOT, 'data/conversations');
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    add(file.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, file), 'utf-8')).messages);
  }
  return out;
}

/**
 * What changed between the pinned ids and the current ones.
 * @returns {{ changed: string[], missing: string[], belowMax: string[], added: string[] }}
 *   each entry "<conversation>#<id>"; `missing` also lists whole conversations
 */
export function compareIds(pinned, current) {
  const changed = [], missing = [], belowMax = [], added = [];
  for (const [conv, ids] of Object.entries(pinned)) {
    const now = current[conv];
    if (!now) { missing.push(conv); continue; }
    const max = Math.max(0, ...Object.keys(ids).map(Number));
    for (const [id, hash] of Object.entries(ids)) {
      if (!(id in now)) missing.push(`${conv}#${id}`);
      else if (now[id] !== hash) changed.push(`${conv}#${id}`);
    }
    for (const id of Object.keys(now)) {
      if (id in ids) continue;
      if (Number(id) <= max) belowMax.push(`${conv}#${id}`);
      else added.push(`${conv}#${id}`);
    }
  }
  for (const conv of Object.keys(current)) if (!(conv in pinned)) added.push(conv);
  return { changed, missing, belowMax, added };
}

/** One conversation per block, one id per line: appends diff as appended lines. */
function serialise(ids) {
  const convs = Object.keys(ids).sort();
  const blocks = convs.map(conv => {
    const rows = Object.keys(ids[conv]).map(Number).sort((a, b) => a - b)
      .map(id => `    "${id}": "${ids[conv][id]}"`);
    return `  "${conv}": {\n${rows.join(',\n')}\n  }`;
  });
  return `{\n${blocks.join(',\n')}\n}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const accept = process.argv.includes('--accept-changes');
  const pinned = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf-8')) : {};
  const current = currentIds();
  const { changed, missing, belowMax, added } = compareIds(pinned, current);
  const show = (label, list) => list.length && console.error(`${label} (${list.length}): ${list.slice(0, 15).join(', ')}${list.length > 15 ? ', …' : ''}`);
  if (missing.length || belowMax.length) {
    show('ids que sumiram', missing);
    show('ids novos abaixo do máximo (renumeração?)', belowMax);
    console.error('Nada foi gravado. Mensagem nova recebe id novo, no fim; nunca renumere.');
    process.exit(1);
  }
  if (changed.length && !accept) {
    show('ids com conteúdo diferente', changed);
    console.error('Nada foi gravado. Se for correção de uma mensagem existente, rode com --accept-changes.');
    process.exit(1);
  }
  // Keep the pinned hashes unless the change was accepted; add what is new.
  const next = {};
  for (const conv of Object.keys(current)) {
    next[conv] = { ...current[conv] };
    if (!accept && pinned[conv]) Object.assign(next[conv], pinned[conv]);
  }
  writeFileSync(FIXTURE, serialise(next));
  console.log(`${FIXTURE}: ${Object.keys(next).length} conversas; ${added.length} novos, ${accept ? changed.length : 0} corrigidos`);
}
