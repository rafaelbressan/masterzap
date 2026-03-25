import { describe, it, expect } from 'vitest';
import { SETTINGS_CONTENT, SETTINGS_CREDITS } from '../../src/lib/settings-content.js';
import { parseLinks } from '../../src/lib/profile-content.js';

describe('SETTINGS_CONTENT', () => {
  it('has sections array', () => {
    expect(Array.isArray(SETTINGS_CONTENT.sections)).toBe(true);
    expect(SETTINGS_CONTENT.sections.length).toBeGreaterThan(5);
  });

  it('each section has title and paragraphs', () => {
    for (const section of SETTINGS_CONTENT.sections) {
      expect(section).toHaveProperty('title');
      expect(Array.isArray(section.paragraphs)).toBe(true);
      expect(section.paragraphs.length).toBeGreaterThan(0);
      for (const para of section.paragraphs) {
        expect(para).toHaveProperty('text');
        expect(para.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('has credits string', () => {
    expect(typeof SETTINGS_CREDITS).toBe('string');
    expect(SETTINGS_CREDITS).toContain('Rafael Bressan');
  });
});

describe('parseLinks with action links', () => {
  it('converts action:search links to spans with data-action', () => {
    const result = parseLinks('{peleleca}[action:search:peleleca]');
    expect(result).toContain('data-action="action:search:peleleca"');
    expect(result).toContain('profile-action-link');
    expect(result).toContain('>peleleca<');
    expect(result).not.toContain('href=');
  });

  it('converts external links to <a> tags with target _blank', () => {
    const result = parseLinks('{test}[https://example.com]');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('>test<');
  });

  it('converts action:contact-martha to span', () => {
    const result = parseLinks('{Martha Graeff}[action:contact-martha]');
    expect(result).toContain('data-action="action:contact-martha"');
  });

  it('converts action:profile-dv to span', () => {
    const result = parseLinks('{Daniel Vorcaro}[action:profile-dv]');
    expect(result).toContain('data-action="action:profile-dv"');
  });

  it('handles multiple links in one string', () => {
    const result = parseLinks('see {a}[action:search:test] and {b}[https://x.com]');
    expect(result).toContain('data-action="action:search:test"');
    expect(result).toContain('href="https://x.com"');
  });

  it('returns plain text unchanged', () => {
    expect(parseLinks('no links here')).toBe('no links here');
  });
});
