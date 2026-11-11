// @vitest-environment node
//
// Two behaviours that only started mattering once there was more than one
// conversation, and that both bit in practice.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSearchIndex, isIndexLoaded, resetSearchIndex, searchIndex } from '../../src/lib/search.js';

const INDEXES = {
  'martha-graeff': [
    { id: 1, date: '2024-02-10', sender: 'DV', content: 'peleleca' },
  ],
  'alexandre-de-moraes': [
    { id: 1, date: '2025-11-15', sender: 'DV', content: 'Acha que segunda ja tenho que estar fora?' },
  ],
};

function mockFetch() {
  return vi.fn((url) => {
    const id = String(url).split('/').at(-2);
    const body = INDEXES[id];
    return Promise.resolve(
      body
        ? { ok: true, json: () => Promise.resolve(body) }
        : { ok: false, status: 404 }
    );
  });
}

describe('search index cache', () => {
  beforeEach(() => {
    resetSearchIndex();
    globalThis.fetch = mockFetch();
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads the index for a conversation', async () => {
    const index = await loadSearchIndex('martha-graeff');
    expect(searchIndex(index, 'peleleca')).toHaveLength(1);
  });

  it('serves the same conversation from cache', async () => {
    await loadSearchIndex('martha-graeff');
    await loadSearchIndex('martha-graeff');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  // The cache used to be a single module-level variable that ignored the id, so
  // the second conversation opened kept answering with the first one's messages.
  it('keeps each conversation to its own index', async () => {
    const martha = await loadSearchIndex('martha-graeff');
    const moraes = await loadSearchIndex('alexandre-de-moraes');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(searchIndex(moraes, 'peleleca')).toHaveLength(0);
    expect(searchIndex(moraes, 'estar fora')).toHaveLength(1);
    // Loading the second did not take the first one's place.
    expect(searchIndex(martha, 'peleleca')).toHaveLength(1);
  });

  // The fork kept an "active" index that every load overwrote: a search in
  // one chat, overlapping a load for another, answered from the other.
  it('answers overlapping searches from their own conversations', async () => {
    const [martha, moraes] = await Promise.all([
      loadSearchIndex('martha-graeff'),
      loadSearchIndex('alexandre-de-moraes'),
    ]);
    expect(searchIndex(martha, 'estar fora')).toHaveLength(0);
    expect(searchIndex(moraes, 'estar fora')).toHaveLength(1);
  });

  it('loads a conversation once even when asked twice at the same time', async () => {
    await Promise.all([loadSearchIndex('martha-graeff'), loadSearchIndex('martha-graeff')]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('reports loaded state per conversation', async () => {
    expect(isIndexLoaded('martha-graeff')).toBe(false);

    await loadSearchIndex('martha-graeff');

    expect(isIndexLoaded('martha-graeff')).toBe(true);
    expect(isIndexLoaded('alexandre-de-moraes')).toBe(false);
    expect(isIndexLoaded()).toBe(true);
  });

  it('propagates a failed fetch and stays unloaded', async () => {
    await expect(loadSearchIndex('nao-existe')).rejects.toThrow();
    expect(isIndexLoaded('nao-existe')).toBe(false);
  });
});

describe('search index limits', () => {
  beforeEach(() => resetSearchIndex());
  afterEach(() => vi.restoreAllMocks());

  // Kept up to 200 thousand messages in all, least recently used out first.
  it('drops the least recently used index past the limit, never the one just used', async () => {
    const sizes = { a: 90_000, b: 90_000, c: 90_000 };
    globalThis.fetch = vi.fn((url) => {
      const id = String(url).split('/').at(-2);
      const entries = Array.from({ length: sizes[id] }, (_, i) => ({ id: i, date: '2024-01-01', sender: 'DV', content: 'x' }));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(entries) });
    });
    await loadSearchIndex('a');
    await loadSearchIndex('b');
    await loadSearchIndex('a'); // a is now the more recent
    await loadSearchIndex('c');
    expect(isIndexLoaded('a')).toBe(true);
    expect(isIndexLoaded('b')).toBe(false);
    expect(isIndexLoaded('c')).toBe(true);
  });

  it('keeps an index bigger than the limit while it is the one in use', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(Array.from({ length: 250_000 }, (_, i) => ({ id: i, content: 'x' }))),
    }));
    await loadSearchIndex('enorme');
    expect(isIndexLoaded('enorme')).toBe(true);
  });
});

describe('searching an index', () => {
  const entries = [
    { id: 1, date: '2024-01-01', sender: 'DV', content: 'Amor, bom dia' },
    { id: 2, date: '2024-01-02', sender: 'Martha Graeff', content: 'Bom dia, amor!' },
    { id: 3, date: '2024-01-03', sender: 'DV', content: 'AMÔR da minha vida' },
  ];

  it('finds without case or accents, oldest first by default', () => {
    expect(searchIndex(entries, 'amor').map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('filters by sender', () => {
    expect(searchIndex(entries, 'amor', { sender: 'DV' }).map(r => r.id)).toEqual([1, 3]);
  });

  it('needs two letters once accents are gone', () => {
    expect(searchIndex(entries, '\u0301\u0301')).toEqual([]);
    expect(searchIndex(entries, 'á')).toEqual([]);
    expect(searchIndex(entries, 'am').length).toBe(3);
  });
});

describe('search result excerpts', () => {
  beforeEach(() => {
    resetSearchIndex();
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{
        id: 1,
        date: '2025-11-15',
        sender: 'DV',
        // A note long enough that a late match would sit off the right edge of
        // the single-line, ellipsized result row.
        content: 'Que loucura, bem na semana que estou resolvendo tudo. Aquele mesmo juiz Ricardo? '
          + 'E o Galipolo ta sabendo? Conseguimos fazer algo? Acha que segunda ja tenho que estar fora?',
      }]),
    }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('recentres long content on the match', async () => {
    const [hit] = searchIndex(await loadSearchIndex('alexandre-de-moraes'), 'estar fora');

    expect(hit.content.length).toBeLessThan(150);
    expect(hit.content).toContain('estar fora');
    expect(hit.content.startsWith('…')).toBe(true);
    // The offsets must still point at the match inside the trimmed string.
    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('estar fora');
  });

  it('leaves short content untouched', async () => {
    const [hit] = searchIndex(await loadSearchIndex('alexandre-de-moraes'), 'Que loucura');

    expect(hit.content.startsWith('Que loucura')).toBe(true);
    expect(hit.matchStart).toBe(0);
    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('Que loucura');
  });

  it('finds a match near the end and keeps the offsets valid', async () => {
    const [hit] = searchIndex(await loadSearchIndex('alexandre-de-moraes'), 'fora?');

    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('fora?');
  });
});

describe('excerpts on a narrow row', () => {
  it('starts a short message near its match, so the match is on screen', () => {
    const content = 'Nao conseguimos reverter isso com Paulo ou com ninguem em Brasilia';
    const [hit] = searchIndex([{ id: 1, date: '2025-11-15', sender: 'DV', content }], 'brasilia');
    expect(hit.content.startsWith('…')).toBe(true);
    expect(hit.matchStart).toBeLessThanOrEqual(21);
    expect(hit.content.slice(hit.matchStart, hit.matchEnd)).toBe('Brasilia');
  });
});
