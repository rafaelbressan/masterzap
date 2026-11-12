// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pinnedConversations, isPinned, togglePinned, orderWithPinned, resetPinned, MAX_PINNED } from '../../src/lib/pinned-conversations.js';

const KEY = 'masterwhats:conversas-fixadas';
const convs = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id }));

beforeEach(() => {
  localStorage.clear();
  resetPinned();
  vi.restoreAllMocks();
});

describe('pinned conversations', () => {
  it('pins up to three, the newest on top, and refuses a fourth', () => {
    expect(togglePinned('c')).toBe('pinned');
    expect(togglePinned('a')).toBe('pinned');
    expect(togglePinned('e')).toBe('pinned');
    expect(togglePinned('b')).toBe('limit');
    expect(MAX_PINNED).toBe(3);
    expect(pinnedConversations()).toEqual(['e', 'a', 'c']);
    expect(orderWithPinned(convs).map(c => c.id)).toEqual(['e', 'a', 'c', 'b', 'd']);
  });

  it('unpins, and the conversation goes back to its place', () => {
    togglePinned('d');
    expect(togglePinned('d')).toBe('unpinned');
    expect(isPinned('d')).toBe(false);
    expect(orderWithPinned(convs).map(c => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('survives a reload: saved in this browser', () => {
    togglePinned('b');
    resetPinned();
    expect(isPinned('b')).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual(['b']);
  });

  it('keeps from storage only conversation ids, three at most', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', '../x', 7, 'a', '<b>', 'b', 'c', 'd']));
    expect(pinnedConversations()).toEqual(['a', 'b', 'c']);
    localStorage.setItem(KEY, '{not json');
    resetPinned();
    expect(pinnedConversations()).toEqual([]);
  });

  it('refuses what is not a conversation id', () => {
    expect(togglePinned('../x')).toBe('invalid');
    expect(togglePinned(undefined)).toBe('invalid');
  });

  it('ignores a pinned id that is not in the list', () => {
    togglePinned('gone');
    expect(orderWithPinned(convs).map(c => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('another tab pinning in between is not undone', () => {
    togglePinned('a');
    localStorage.setItem(KEY, JSON.stringify(['b', 'a']));
    togglePinned('c');
    expect(pinnedConversations()).toEqual(['c', 'b', 'a']);
  });

  it('without storage, the pins last for the visit', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    togglePinned('a');
    togglePinned('b');
    expect(pinnedConversations()).toEqual(['b', 'a']);
  });
});
