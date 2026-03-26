import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataStore, LRUCache, resetDataStore, getDataStore } from '../../src/lib/data-store.js';

// ── LRU Cache ──────────────────────────────────────

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache(3);
    expect(cache.get('x')).toBeUndefined();
  });

  it('evicts least recently used when full', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('accessing a key refreshes its position', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // refresh 'a'
    cache.set('c', 3); // evicts 'b' (not 'a')
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('overwriting a key updates value and refreshes position', () => {
    const cache = new LRUCache(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 10); // update 'a'
    cache.set('c', 3); // evicts 'b'
    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBeUndefined();
  });

  it('reports size correctly', () => {
    const cache = new LRUCache(5);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
  });

  it('clears all entries', () => {
    const cache = new LRUCache(5);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});

// ── DataStore ──────────────────────────────────────

describe('DataStore', () => {
  const mockConversations = {
    conversations: [
      {
        id: 'martha-graeff',
        participants: ['DV', 'Martha Graeff'],
        date_range: { start: '2024-02-10', end: '2025-08-13' },
        total_messages: 65772,
        last_message: { content: '♥️', timestamp: '2025-08-13T23:27:25', sender: 'DV' },
      },
    ],
  };

  const mockIndex = {
    dates: [
      { date: '2024-02-10', message_count: 82, first_message_id: 1, last_message_id: 82 },
      { date: '2024-02-11', message_count: 49, first_message_id: 83, last_message_id: 131 },
    ],
  };

  const mockChunk = {
    messages: [
      { id: 1, timestamp: '2024-02-10T11:12:08', date: '2024-02-10', time: '11:12:08', sender: 'DV', content: 'Bom dia', type: 'text', is_edited: false, attachment: null, urls: [] },
      { id: 2, timestamp: '2024-02-10T11:13:00', date: '2024-02-10', time: '11:13:00', sender: 'Martha Graeff', content: 'Oi!', type: 'text', is_edited: false, attachment: null, urls: [] },
    ],
  };

  function createMockFetcher(responses = {}) {
    return vi.fn((url) => {
      const match = Object.entries(responses).find(([pattern]) => url.includes(pattern));
      if (match) return Promise.resolve(match[1]);
      return Promise.reject(new Error(`No mock for ${url}`));
    });
  }

  let store;
  let fetcher;

  beforeEach(() => {
    fetcher = createMockFetcher({
      'conversations.json': mockConversations,
      'martha-graeff/index.json': mockIndex,
      'martha-graeff/2024-02-10.json': mockChunk,
      'martha-graeff/2024-02-11.json': { messages: [{ id: 83, content: 'Day 2' }] },
    });
    store = new DataStore({ cacheSize: 3, fetcher });
    resetDataStore();
  });

  describe('init()', () => {
    it('loads conversations', async () => {
      await store.init();
      expect(store.getConversations()).toHaveLength(1);
      expect(store.getConversations()[0].id).toBe('martha-graeff');
    });

    it('is idempotent — only fetches once', async () => {
      await store.init();
      await store.init();
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversation()', () => {
    it('returns conversation by id', async () => {
      await store.init();
      const conv = store.getConversation('martha-graeff');
      expect(conv.total_messages).toBe(65772);
    });

    it('returns undefined for unknown id', async () => {
      await store.init();
      expect(store.getConversation('nonexistent')).toBeUndefined();
    });
  });

  describe('getConversationIndex()', () => {
    it('loads and returns dates array', async () => {
      const dates = await store.getConversationIndex('martha-graeff');
      expect(dates).toHaveLength(2);
      expect(dates[0].date).toBe('2024-02-10');
    });

    it('caches the index — only fetches once', async () => {
      await store.getConversationIndex('martha-graeff');
      await store.getConversationIndex('martha-graeff');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessages()', () => {
    it('loads messages for a date', async () => {
      const msgs = await store.getMessages('martha-graeff', '2024-02-10');
      expect(msgs).toHaveLength(2);
      expect(msgs[0].content).toBe('Bom dia');
    });

    it('returns cached messages on second call', async () => {
      await store.getMessages('martha-graeff', '2024-02-10');
      await store.getMessages('martha-graeff', '2024-02-10');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent requests', async () => {
      const [a, b] = await Promise.all([
        store.getMessages('martha-graeff', '2024-02-10'),
        store.getMessages('martha-graeff', '2024-02-10'),
      ]);
      expect(a).toBe(b);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('evicts old entries when cache is full', async () => {
      // Cache size is 3
      const extra = createMockFetcher({
        'martha-graeff/day-a.json': { messages: [{ id: 'a' }] },
        'martha-graeff/day-b.json': { messages: [{ id: 'b' }] },
        'martha-graeff/day-c.json': { messages: [{ id: 'c' }] },
        'martha-graeff/day-d.json': { messages: [{ id: 'd' }] },
      });
      const s = new DataStore({ cacheSize: 2, fetcher: extra });

      await s.getMessages('martha-graeff', 'day-a');
      await s.getMessages('martha-graeff', 'day-b');
      expect(s.cacheSize).toBe(2);

      await s.getMessages('martha-graeff', 'day-c'); // evicts day-a
      expect(s.cacheSize).toBe(2);

      // day-a should be evicted, needs re-fetch
      await s.getMessages('martha-graeff', 'day-a');
      expect(extra).toHaveBeenCalledTimes(4); // a, b, c, a-again
    });
  });

  describe('getMessagesForDates()', () => {
    it('loads and flattens multiple dates', async () => {
      const msgs = await store.getMessagesForDates('martha-graeff', ['2024-02-10', '2024-02-11']);
      expect(msgs).toHaveLength(3);
      expect(msgs[0].id).toBe(1);
      expect(msgs[2].id).toBe(83);
    });
  });

  describe('clearCache()', () => {
    it('clears all cached chunks', async () => {
      await store.getMessages('martha-graeff', '2024-02-10');
      expect(store.cacheSize).toBe(1);
      store.clearCache();
      expect(store.cacheSize).toBe(0);
    });
  });

  describe('findDateForMessage()', () => {
    it('finds date for first message', async () => {
      const date = await store.findDateForMessage('martha-graeff', 1);
      expect(date).toBe('2024-02-10');
    });

    it('finds date for last message of first day', async () => {
      const date = await store.findDateForMessage('martha-graeff', 82);
      expect(date).toBe('2024-02-10');
    });

    it('finds date for message in second day', async () => {
      const date = await store.findDateForMessage('martha-graeff', 83);
      expect(date).toBe('2024-02-11');
    });

    it('returns null for message ID out of range', async () => {
      const date = await store.findDateForMessage('martha-graeff', 999999);
      expect(date).toBeNull();
    });

    it('handles string message IDs', async () => {
      const date = await store.findDateForMessage('martha-graeff', '1');
      expect(date).toBe('2024-02-10');
    });
  });

  describe('getDataStore() singleton', () => {
    it('returns the same instance', () => {
      const a = getDataStore({ cacheSize: 5 });
      const b = getDataStore({ cacheSize: 99 });
      expect(a).toBe(b);
    });

    it('resets with resetDataStore()', () => {
      const a = getDataStore();
      resetDataStore();
      const b = getDataStore();
      expect(a).not.toBe(b);
    });
  });
});
