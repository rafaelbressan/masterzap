/**
 * Search module — loads the search index and provides fast text search.
 *
 * The search index is a pre-built array of { id, date, sender, content }
 * with content truncated to 80 chars. We do case-insensitive substring matching
 * and normalize accents for broader matching.
 */

let _index = null;
let _loading = null;

/**
 * Load the search index for a conversation.
 * @param {string} conversationId
 * @param {string} [basePath='/data']
 * @returns {Promise<Array>}
 */
export async function loadSearchIndex(conversationId, basePath = '/data') {
  if (_index) return _index;
  if (_loading) return _loading;

  _loading = fetch(`${basePath}/${conversationId}/search-index.json`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      _index = data;
      _loading = null;
      return _index;
    })
    .catch(err => {
      _loading = null;
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
        matchStart,
        matchEnd: matchStart + query.length,
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

/** Clear the loaded index (for testing). */
export function resetSearchIndex() {
  _index = null;
  _loading = null;
}

/** Check if the index is loaded. */
export function isIndexLoaded() {
  return _index !== null;
}
