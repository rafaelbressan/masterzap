// @vitest-environment node
//
// Ids are addresses (links, anchors, quotes in llms.txt and the <noscript>).
// The fixture pins each one to what the message says; see scripts/message-ids.mjs.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { FIXTURE, currentIds, compareIds } from '../../scripts/message-ids.mjs';

const pinned = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
const current = currentIds();
const result = compareIds(pinned, current);

describe('stable message ids', () => {
  it('pins every conversation', () => {
    expect(Object.keys(pinned).length).toBeGreaterThanOrEqual(24);
    expect(Object.keys(current).filter(c => !(c in pinned))).toEqual([]);
  });

  it('no pinned id disappears', () => {
    expect(result.missing).toEqual([]);
  });

  it('no pinned id changes what it says', () => {
    expect(result.changed).toEqual([]);
  });

  it('new messages only take ids above the old maximum', () => {
    expect(result.belowMax).toEqual([]);
  });
});

describe('compareIds', () => {
  const base = { a: { 1: 'x', 2: 'y' } };
  it('sees a renumbering', () => {
    const r = compareIds(base, { a: { 1: 'y', 2: 'z', 3: 'x' } });
    expect(r.changed).toEqual(['a#1', 'a#2']);
  });
  it('sees an insertion in the middle', () => {
    expect(compareIds({ a: { 1: 'x', 3: 'z' } }, { a: { 1: 'x', 2: 'n', 3: 'z' } }).belowMax).toEqual(['a#2']);
  });
  it('sees a removed message and a removed conversation', () => {
    expect(compareIds(base, { a: { 1: 'x' } }).missing).toEqual(['a#2']);
    expect(compareIds(base, {}).missing).toEqual(['a']);
  });
  it('accepts an append', () => {
    const r = compareIds(base, { a: { 1: 'x', 2: 'y', 3: 'n' }, b: { 1: 'q' } });
    expect(r).toEqual({ changed: [], missing: [], belowMax: [], added: ['a#3', 'b'] });
  });
});
