import { describe, it, expect } from 'vitest';
import { groupCalls, formatCallTime, filterCalls, CALL_FILTERS } from '../../src/components/CallsPanel.js';

describe('grouping', () => {
  const call = (o) => ({ conversation_id: 'a', date: '2025-01-01', outgoing: true, status: 'completed', message_id: 1, timestamp: '2025-01-01T10:00:00', ...o });

  it('folds consecutive calls with the same person on the same day', () => {
    const rows = groupCalls([call({ message_id: 3 }), call({ message_id: 2 }), call({ message_id: 1, date: '2024-12-31' })]);
    expect(rows.map(r => [r.call.message_id, r.count])).toEqual([[3, 2], [1, 1]]);
  });

  it('keeps a missed call apart from an answered one', () => {
    const rows = groupCalls([call({ message_id: 2, status: 'missed', outgoing: false }), call({ message_id: 1 })]);
    expect(rows).toHaveLength(2);
  });

  it('keeps different people apart', () => {
    expect(groupCalls([call({ conversation_id: 'a' }), call({ conversation_id: 'b' })])).toHaveLength(2);
  });
});

describe('formatCallTime', () => {
  it('reads like the phone: day, month, year, time', () => {
    expect(formatCallTime('2024-07-16T21:12:05')).toMatch(/^16 de jul\.? de 2024, 21:12$/);
  });
});

describe('filterCalls', () => {
  const calls = [
    { conversation_id: 'martha', status: 'completed' }, { conversation_id: 'martha', status: 'missed' },
    { conversation_id: 'fabio', status: 'no_answer' }, { conversation_id: 'ciro', status: 'completed' },
  ];
  const nameOf = (id) => ({ martha: 'Martha Graeff', fabio: 'Fábio Faria', ciro: 'Ciro Soares' })[id];

  it('shows everything by default', () => {
    expect(filterCalls(calls, { nameOf })).toHaveLength(4);
  });

  it('filters by chip', () => {
    expect(filterCalls(calls, { filter: 'perdida', nameOf }).map(c => c.conversation_id)).toEqual(['martha']);
    expect(filterCalls(calls, { filter: 'sem-resposta', nameOf }).map(c => c.conversation_id)).toEqual(['fabio']);
    expect(filterCalls(calls, { filter: 'atendida', nameOf })).toHaveLength(2);
  });

  it('searches the name without caring about accents, and combines with the chip', () => {
    expect(filterCalls(calls, { query: 'fabio', nameOf }).map(c => c.conversation_id)).toEqual(['fabio']);
    expect(filterCalls(calls, { query: 'MARTHA', filter: 'atendida', nameOf })).toHaveLength(1);
    expect(filterCalls(calls, { query: 'ninguém', nameOf })).toHaveLength(0);
  });

  it('offers the four chips', () => {
    expect(CALL_FILTERS.map(f => f.key)).toEqual(['todas', 'atendida', 'perdida', 'sem-resposta']);
  });
});
