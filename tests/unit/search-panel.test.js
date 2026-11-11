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
