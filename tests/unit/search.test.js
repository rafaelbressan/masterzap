import { describe, it, expect, beforeEach } from 'vitest';
import { searchIndex, normalize } from '../../src/lib/search.js';

// We can't easily load the full search index in unit tests (it's fetched via HTTP),
// so we'll test the pure functions and mock the internal index.

describe('normalize()', () => {
  it('lowercases text', () => {
    expect(normalize('Hello World')).toBe('hello world');
  });

  it('strips accents', () => {
    expect(normalize('café')).toBe('cafe');
    expect(normalize('São Paulo')).toBe('sao paulo');
    expect(normalize('Zürich')).toBe('zurich');
  });

  it('handles Portuguese characters', () => {
    expect(normalize('ação')).toBe('acao');
    expect(normalize('coração')).toBe('coracao');
    expect(normalize('você')).toBe('voce');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('preserves emojis', () => {
    expect(normalize('Bom dia☀️')).toBe('bom dia☀️');
  });
});

describe('searchIndex()', () => {
  const entries = [{ id: 1, date: '2024-01-01', sender: 'DV', content: 'hello world' }];

  it('returns empty array when query is too short', () => {
    expect(searchIndex(entries, 'h')).toEqual([]);
    expect(searchIndex(entries, '')).toEqual([]);
  });

  it('returns empty array when there is no index', () => {
    expect(searchIndex(null, 'hello')).toEqual([]);
  });
});
