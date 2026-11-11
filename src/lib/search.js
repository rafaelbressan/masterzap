/**
 * Search module — loads the search index and provides fast text search.
 *
 * The search index is a pre-built array of { id, date, sender, content }
 * with content truncated to 80 chars. We do case-insensitive substring matching
 * and normalize accents for broader matching.
 */

import { dataUrl } from './data-url.js';

/**
 * Loaded indexes, by conversation, least recently used first.
 *
 * Every search names its conversation: there is no "current" index. A module
 * that kept one would answer a search in one chat with another chat's
 * messages as soon as two searches overlap (the chat's own and the sidebar's).
 *
 * Indexes are kept up to a total number of messages, the least recently used
 * dropped first, so going through every conversation does not keep them all.
 * Today the Martha conversation (65 thousand messages, 5 MB) is nearly all of
 * it; the limit is for the data still to come. Each index costs about twice
 * its file once its normalized text is made.
 */
const loaded = new Map(); // id → SearchIndex
const pending = new Map(); // id → Promise<SearchIndex>
const MAX_ENTRIES = 200_000;
let total = 0; // messages across `loaded`
let generation = 0; // bumped by resetSearchIndex: older loads may not fill the cache

/**
 * @typedef {object} SearchIndex
 * @property {string} conversationId
 * @property {Array<{id, date, sender, content}>} entries
 */

function remember(conversationId, index) {
  if (loaded.has(conversationId)) {
    loaded.delete(conversationId); // re-inserted below as the most recent
  } else {
    total += index.entries.length;
  }
  loaded.set(conversationId, index);
  for (const [id, i] of loaded) {
    if (total <= MAX_ENTRIES || id === conversationId) break;
    loaded.delete(id);
    total -= i.entries.length;
  }
}

/**
 * Load the search index for a conversation (cached).
 *
 * @param {string} conversationId
 * @param {string} [basePath='/data']
 * @returns {Promise<SearchIndex>}
 */
export function loadSearchIndex(conversationId, basePath = '/data') {
  const cached = loaded.get(conversationId);
  if (cached) {
    remember(conversationId, cached); // most recently used
    return Promise.resolve(cached);
  }
  if (pending.has(conversationId)) return pending.get(conversationId);

  const startedIn = generation;
  const promise = fetch(dataUrl(`${basePath}/${conversationId}/search-index.json`))
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(entries => {
      const index = { conversationId, entries };
      // Normalized here, with the download, rather than on the first key
      // pressed: for the Martha index it is a pass over 65 thousand messages.
      normalizedOf(entries);
      if (startedIn === generation) remember(conversationId, index);
      return index;
    })
    .finally(() => {
      if (pending.get(conversationId) === promise) pending.delete(conversationId);
    });
  pending.set(conversationId, promise);
  return promise;
}

/**
 * Normalize a string for search: lowercase + strip accents.
 * @param {string} str
 * @returns {string}
 */
export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** How much text to keep before a match, and in all. */
const EXCERPT_LEAD = 20;
const EXCERPT_LENGTH = 110;

/**
 * Trim content down to a window that starts just before the match.
 *
 * Result rows are a single ellipsized line, and on a 320px phone it holds
 * about 40 characters: a match further in would sit past the "…" and never
 * show, however short the message. So whenever the match is not near the
 * start, the text begins a few words before it. Offsets move to suit.
 *
 * @returns {{content: string, matchStart: number, matchEnd: number}}
 */
function excerptAround(content, matchStart, matchEnd) {
  if (matchStart <= EXCERPT_LEAD && content.length <= EXCERPT_LENGTH) {
    return { content, matchStart, matchEnd };
  }

  const start = Math.max(0, matchStart - EXCERPT_LEAD);
  // The whole match always fits, however long the query.
  const end = Math.min(content.length, Math.max(start + EXCERPT_LENGTH, matchEnd));

  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  const offset = prefix.length - start;

  return {
    content: prefix + content.slice(start, end) + suffix,
    matchStart: matchStart + offset,
    matchEnd: matchEnd + offset,
  };
}

// Each list of entries' content, normalized once: searching is then a plain
// indexOf per message.
const normalizedCache = new WeakMap();
function normalizedOf(entries) {
  let normalized = normalizedCache.get(entries);
  if (!normalized) {
    normalized = entries.map(e => normalize(e.content || ''));
    normalizedCache.set(entries, normalized);
  }
  return normalized;
}

/** The entries of a loaded index, or a bare array of them (tests, callers with their own data). */
function entriesOf(index) {
  if (!index) return null;
  return Array.isArray(index) ? index : index.entries;
}

/**
 * Search one conversation's index.
 * @param {SearchIndex|Array} index - from loadSearchIndex()
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.limit=50] - max results to return
 * @param {string} [options.sender] - filter by sender name
 * @returns {Array<{ id, date, sender, content, matchStart, matchEnd }>}
 */
export function searchIndex(index, query, { limit = 50, sender } = {}) {
  const entries = entriesOf(index);
  // Two letters at least, counted after accents go (a lone accent is nothing).
  const normalizedQuery = normalize(query || '');
  if (!entries || normalizedQuery.length < 2) return [];

  const normalized = normalizedOf(entries);
  const results = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (sender && entry.sender !== sender) continue;

    const matchStart = normalized[i].indexOf(normalizedQuery);
    if (matchStart !== -1) {
      results.push({
        ...entry,
        ...excerptAround(entry.content, matchStart, matchStart + normalizedQuery.length),
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/** Forget every loaded index (for tests). */
export function resetSearchIndex() {
  loaded.clear();
  pending.clear();
  total = 0;
  generation++;
}

/**
 * Check if an index is loaded — for a specific conversation when given one.
 * @param {string} [conversationId]
 */
export function isIndexLoaded(conversationId) {
  if (conversationId !== undefined) return loaded.has(conversationId);
  return loaded.size > 0;
}
