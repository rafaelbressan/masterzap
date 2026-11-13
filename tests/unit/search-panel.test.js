// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { matchConversations, matchMessages } from '../../src/components/SearchPanel.js';

const conv = (id, name) => ({ id, participants: ['DV', name] });

describe('matchConversations()', () => {
  const list = [conv('vivi', 'Vivi Moraes'), conv('ale', 'Alexandre de Moraes'), conv('mor', 'Moraes Filho'), conv('x', 'Outro')];

  it('finds by any part of the name, without accents, names that start with it first', () => {
    const found = matchConversations(list, 'moraes').map(m => m.conv.id);
    expect(found).toEqual(['mor', 'ale', 'vivi']);
  });

  it('marks where the name matches', () => {
    const [m] = matchConversations([conv('j', 'João Sérgio')], 'serg');
    expect(m.name.slice(m.start, m.end)).toBe('Sérg');
  });
});

describe('matchMessages() and the owner', () => {
  it("marks as sent (the double tick) what the conversation owner's phone sent", () => {
    const loaded = [
      { conv: conv('a', 'Ana'), index: [{ id: 1, date: '2024-01-01', sender: 'DV', content: 'amor' }, { id: 2, date: '2024-01-02', sender: 'Ana', content: 'amor' }] },
      { conv: { id: 'b', owner: 'Bia', participants: ['Bia', 'DV'] }, index: [{ id: 3, date: '2024-01-03', sender: 'Bia', content: 'amor' }, { id: 4, date: '2024-01-04', sender: 'DV', content: 'amor' }] },
    ];
    const sent = Object.fromEntries(matchMessages(loaded, 'amor').map(h => [h.id, h.outgoing]));
    expect(sent).toEqual({ 1: true, 2: false, 3: true, 4: false });
  });
});

describe('matchMessages()', () => {
  it('merges every chat, newest first, naming the contact', () => {
    const loaded = [
      { conv: conv('a', 'Ana'), index: [{ id: 1, date: '2024-01-01', content: 'amor' }, { id: 2, date: '2024-03-01', content: 'amor' }] },
      { conv: conv('b', 'Bia'), index: [{ id: 9, date: '2024-02-01', content: 'Amor!' }, { id: 10, date: '2024-02-01', content: 'nada' }] },
    ];
    const hits = matchMessages(loaded, 'amor');
    expect(hits.map(h => [h.conversationId, h.id])).toEqual([['a', 2], ['b', 9], ['a', 1]]);
    expect(hits[1].contact).toBe('Bia');
  });

  it('keeps every match, not a first page', () => {
    const index = Array.from({ length: 500 }, (_, i) => ({ id: i, date: '2024-01-01', content: 'amor' }));
    expect(matchMessages([{ conv: conv('a', 'Ana'), index }], 'amor')).toHaveLength(500);
  });
});

// The panel itself, in jsdom: a sidebar with the search field and the list.
import { vi, afterEach } from 'vitest';
import { attachSearch } from '../../src/components/SearchPanel.js';
import { resetSearchIndex } from '../../src/lib/search.js';

describe('attachSearch()', () => {
  const INDEXES = {
    ana: [{ id: 1, date: '2024-01-01', sender: 'DV', content: 'amor enviado' },
      { id: 2, date: '2024-01-02', sender: 'Ana', content: 'amor recebido' }],
    bia: [{ id: 5, date: '2024-01-03', sender: 'Bia', content: 'amor da Bia' }],
  };
  const conversations = [conv('ana', 'Ana'), conv('bia', 'Bia')];

  function setup({ fail = [], hold = false } = {}) {
    vi.useFakeTimers();
    resetSearchIndex();
    const held = [];
    globalThis.fetch = vi.fn((url) => {
      const id = String(url).split('/').at(-2);
      const answer = () => (fail.includes(id)
        ? { ok: false, status: 500 }
        : { ok: true, json: () => Promise.resolve(INDEXES[id]) });
      return hold ? new Promise(r => held.push(() => r(answer()))) : Promise.resolve(answer());
    });
    const sidebar = document.createElement('div');
    sidebar.innerHTML = '<input class="sidebar-search-input"><div class="conversation-list"></div>';
    document.body.appendChild(sidebar);
    const panel = attachSearch(sidebar, conversations, { onConversationClick() {}, onMessageClick() {} });
    const input = sidebar.querySelector('input');
    const type = async (text) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(300);
    };
    return { sidebar, panel, input, type, release: () => held.splice(0).forEach(f => f()) };
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("marks DV's own messages with the double tick, and only those", async () => {
    const { sidebar, type } = setup();
    await type('amor');
    const rows = [...sidebar.querySelectorAll('.search-result-item')];
    const ticked = rows.filter(r => r.querySelector('.search-result-ticks')).map(r => r.textContent);
    expect(rows).toHaveLength(3);
    expect(ticked).toHaveLength(1);
    expect(ticked[0]).toContain('amor enviado');
  });

  it('draws nothing when Escape comes before the indexes', async () => {
    const { sidebar, input, type, release } = setup({ hold: true });
    await type('amor');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    release();
    await vi.runAllTimersAsync();
    expect(sidebar.querySelector('.search-results')).toBeNull();
  });

  it('says when a conversation could not be searched, and tries again', async () => {
    const { sidebar, type } = setup({ fail: ['bia'] });
    await type('amor');
    expect(sidebar.querySelector('.search-results').textContent).toContain('Não foi possível pesquisar todas as mensagens');
    expect(sidebar.querySelectorAll('.search-result-item')).toHaveLength(2);
    const calls = globalThis.fetch.mock.calls.length;
    await type('amor ');
    await type('amor');
    expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(calls);
  });

  it('clearing the field goes back to the list at once', async () => {
    const { sidebar, input, type } = setup();
    await type('amor');
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(sidebar.querySelector('.search-results')).toBeNull();
  });
});
