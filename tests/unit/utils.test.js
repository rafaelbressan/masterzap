import { describe, it, expect } from 'vitest';
import { slugify, formatDateLong, formatTime, linkify, escapeHtml, classifyMessage, truncate } from '../../src/lib/utils.js';

describe('slugify', () => {
  it('converts name to lowercase slug', () => {
    expect(slugify('Martha Graeff')).toBe('martha-graeff');
  });

  it('handles accented characters', () => {
    expect(slugify('João da Silva')).toBe('joao-da-silva');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('collapses multiple separators', () => {
    expect(slugify('a---b___c')).toBe('a-b-c');
  });
});

describe('formatDateLong', () => {
  it('formats date in pt-BR long format', () => {
    const result = formatDateLong('2024-02-10');
    expect(result).toContain('10');
    expect(result).toContain('2024');
    // pt-BR month name
    expect(result.toLowerCase()).toContain('fevereiro');
  });

  it('formats another date correctly', () => {
    const result = formatDateLong('2025-08-13');
    expect(result).toContain('13');
    expect(result).toContain('2025');
    expect(result.toLowerCase()).toContain('agosto');
  });
});

describe('formatTime', () => {
  it('extracts HH:MM from HH:MM:SS', () => {
    expect(formatTime('11:12:08')).toBe('11:12');
  });

  it('handles HH:MM input', () => {
    expect(formatTime('23:59')).toBe('23:59');
  });
});

describe('linkify', () => {
  it('wraps URLs in anchor tags', () => {
    const result = linkify('Visit https://example.com today');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('handles text without URLs', () => {
    expect(linkify('no links here')).toBe('no links here');
  });

  it('handles multiple URLs', () => {
    const result = linkify('see https://a.com and https://b.com');
    expect(result).toContain('href="https://a.com"');
    expect(result).toContain('href="https://b.com"');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML characters', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
  });

  it('handles normal text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('classifyMessage', () => {
  it('returns the message type', () => {
    expect(classifyMessage({ type: 'text' })).toBe('text');
    expect(classifyMessage({ type: 'image' })).toBe('image');
    expect(classifyMessage({ type: 'video' })).toBe('video');
    expect(classifyMessage({ type: 'audio' })).toBe('audio');
    expect(classifyMessage({ type: 'document' })).toBe('document');
    expect(classifyMessage({ type: 'deleted' })).toBe('deleted');
    expect(classifyMessage({ type: 'call' })).toBe('call');
    expect(classifyMessage({ type: 'system' })).toBe('system');
  });

  it('defaults to text for missing type', () => {
    expect(classifyMessage({})).toBe('text');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 80)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    const long = 'a'.repeat(100);
    const result = truncate(long, 80);
    expect(result.length).toBe(81); // 80 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles null/undefined', () => {
    expect(truncate(null)).toBe('');
    expect(truncate(undefined)).toBe('');
  });
});
