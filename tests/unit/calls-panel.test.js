import { describe, it, expect } from 'vitest';
import { groupCalls, formatCallTime } from '../../src/components/CallsPanel.js';

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

describe('a call without a known time', () => {
  it('shows its date and no made-up hour', () => {
    expect(formatCallTime(null, '2024-07-02')).toBe('02/07/2024');
    expect(formatCallTime(null, 'sem-data')).toBe('Data não informada');
  });
});
