/**
 * Search module — loads the search index and provides fast text search.
 *
 * The search index is a pre-built array of { id, date, sender, content }
 * with content truncated to 80 chars. We do case-insensitive substring matching
 * and normalize accents for broader matching.
 */

import { dataUrl } from './data-url.js';

let _index = null;
let _indexId = null;
let _loading = null;
let _loadingId = null;

/**
 * Load the search index for a conversation.
 *
 * The loaded index is cached, but keyed by conversation — switching chats has
 * to refetch, or a search in one conversation would return hits from another.
 *
 * @param {string} conversationId
 * @param {string} [basePath='/data']
 * @returns {Promise<Array>}
 */
export async function loadSearchIndex(conversationId, basePath = '/data') {
  if (_index && _indexId === conversationId) return _index;
  if (_loading && _loadingId === conversationId) return _loading;

  _loadingId = conversationId;
  _loading = fetch(dataUrl(`${basePath}/${conversationId}/search-index.json`))
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // A newer load may have started while this one was in flight; only the
      // most recent conversation's result may claim the cache.
      if (_loadingId === conversationId) {
        _index = data;
        _indexId = conversationId;
        _loading = null;
      }
      return data;
    })
    .catch(err => {
      if (_loadingId === conversationId) _loading = null;
      throw err;
    });

  return _loading;
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

/** How much context to keep on each side of a match in a long message. */
const EXCERPT_LEAD = 32;
const EXCERPT_LENGTH = 110;

/**
 * Trim long content down to a window around the match.
 *
 * Result rows are a single ellipsized line, so a match 300 characters into a
 * message would be scrolled off the right edge and invisible. Recentre the text
 * on the match and shift the offsets to suit. Short content is returned as-is.
 *
 * @returns {{content: string, matchStart: number, matchEnd: number}}
 */
function excerptAround(content, matchStart, matchEnd) {
  if (content.length <= EXCERPT_LENGTH) {
    return { content, matchStart, matchEnd };
  }

  let start = Math.max(0, matchStart - EXCERPT_LEAD);
  let end = Math.min(content.length, start + EXCERPT_LENGTH);
  // Near the end of the message, slide the window back so it stays full width.
  start = Math.max(0, Math.min(start, end - EXCERPT_LENGTH));

  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  const offset = prefix.length - start;

  return {
    content: prefix + content.slice(start, end) + suffix,
    matchStart: matchStart + offset,
    matchEnd: matchEnd + offset,
  };
}

/**
 * Search the index for a query string.
 * @param {string} query - search query
 * @param {object} [options]
 * @param {number} [options.limit=50] - max results to return
 * @param {string} [options.sender] - filter by sender name
 * @returns {Array<{ id, date, sender, content, matchStart, matchEnd }>}
 */
export function search(query, { limit = 50, sender } = {}) {
  if (!_index || !query || query.length < 2) return [];

  const normalizedQuery = normalize(query);
  const results = [];

  for (const entry of _index) {
    if (sender && entry.sender !== sender) continue;

    const normalizedContent = normalize(entry.content);
    const matchStart = normalizedContent.indexOf(normalizedQuery);

    if (matchStart !== -1) {
      results.push({
        ...entry,
        ...excerptAround(entry.content, matchStart, matchStart + query.length),
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

/** Clear the loaded index (for testing). */
export function resetSearchIndex() {
  _index = null;
  _indexId = null;
  _loading = null;
  _loadingId = null;
}

/**
 * Check if an index is loaded — for a specific conversation when given one.
 * @param {string} [conversationId]
 */
export function isIndexLoaded(conversationId) {
  if (_index === null) return false;
  return conversationId === undefined || _indexId === conversationId;
}
