// @vitest-environment node
//
// The call log the build writes. Two grammars go in — the Martha export's
// English, the police report's Portuguese — and one record comes out.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '../..');
const calls = JSON.parse(readFileSync(join(ROOT, 'public/data/calls.json'), 'utf-8')).calls;
const conversations = JSON.parse(readFileSync(join(ROOT, 'public/data/conversations.json'), 'utf-8')).conversations;

describe('calls.json', () => {
  it('holds every call from both sources', () => {
    expect(calls.length).toBeGreaterThan(1300);
    expect(new Set(calls.map(c => c.conversation_id)).size).toBeGreaterThan(5);
  });

  it('is newest first', () => {
    // A call with no known time sorts by its date, as split_data.py does.
    const stamps = calls.map(c => c.timestamp || c.date);
    expect(stamps).toEqual([...stamps].sort().reverse());
  });

  it('names a conversation the site has, and a message in it', () => {
    const ids = new Set(conversations.map(c => c.id));
    for (const c of calls) {
      expect(ids.has(c.conversation_id), c.conversation_id).toBe(true);
      expect(c.message_id).toBeGreaterThan(0);
    }
  });

  it('reads the Portuguese of the report', () => {
    const c = calls.find(x => x.conversation_id === 'fabio-faria' && x.message_id === 134);
    expect(c).toMatchObject({ kind: 'voice', status: 'completed', duration: '04:34', outgoing: false });
    const missed = calls.find(x => x.conversation_id === 'fabio-faria' && x.message_id === 88);
    expect(missed).toMatchObject({ kind: 'voice', status: 'missed', outgoing: false });
  });

  it('reads the English of the export', () => {
    const kinds = new Set(calls.map(c => c.kind));
    expect(kinds).toEqual(new Set(['voice', 'video']));
    const statuses = new Set(calls.map(c => c.status));
    for (const s of ['completed', 'missed', 'no_answer', 'ended']) expect(statuses.has(s), s).toBe(true);
    expect(calls.filter(c => c.status === 'completed' && !c.duration)).toHaveLength(0);
  });

  it('knows who called', () => {
    expect(calls.some(c => c.outgoing)).toBe(true);
    expect(calls.some(c => !c.outgoing)).toBe(true);
  });
});
