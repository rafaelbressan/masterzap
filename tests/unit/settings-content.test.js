import { describe, it, expect } from 'vitest';
import { SETTINGS_CONTENT } from '../../src/lib/settings-content.js';
import { CREDITS, AUTHOR, REPO_URL, DISCLAIMER, LEGAL_CHANNEL, withUtm, authorPlaceholders } from '../../src/config/site.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLinks } from '../../src/lib/profile-content.js';

describe('SETTINGS_CONTENT', () => {
  it('has sections array', () => {
    expect(Array.isArray(SETTINGS_CONTENT.sections)).toBe(true);
    expect(SETTINGS_CONTENT.sections.length).toBeGreaterThan(5);
  });

  it('each section has a title and some text: paragraphs, a list, or both', () => {
    for (const section of SETTINGS_CONTENT.sections) {
      expect(section).toHaveProperty('title');
      expect(Array.isArray(section.paragraphs)).toBe(true);
      expect(section.paragraphs.length + (section.list?.length ?? 0)).toBeGreaterThan(0);
      for (const para of section.paragraphs) {
        expect(para).toHaveProperty('text');
        expect(para.text.length).toBeGreaterThan(0);
      }
      for (const item of section.list ?? []) expect(item.length).toBeGreaterThan(0);
    }
  });

});

describe('site config: credits and legal channel', () => {
  it('the credits name the author, link the code and carry the disclaimer', () => {
    expect(CREDITS).toContain(`{${AUTHOR.name}}[${withUtm(AUTHOR.url, 'app')}]`);
    expect(CREDITS).toContain(`[${withUtm(REPO_URL, 'app')}]`);
    expect(CREDITS.endsWith(DISCLAIMER)).toBe(true);
    // Not every conversation came from a court record: the Martha chat was leaked.
    expect(DISCLAIMER).toContain('reportagens jornalísticas, de fontes abertas e de documentos');
  });

  it('the legal channel closes the "Sobre": the form, then the three deadlines as a list', () => {
    const titles = SETTINGS_CONTENT.sections.map(s => s.title);
    expect(titles.slice(-2)).toEqual(['Canal Jurídico', 'Prazos de atendimento']);
    const [channel, deadlines] = SETTINGS_CONTENT.sections.slice(-2);
    expect(channel.paragraphs.map(p => p.text).join(' ')).toContain(`{formulário}[${LEGAL_CHANNEL.formUrl}]`);
    expect(LEGAL_CHANNEL.formUrl).toMatch(/^https:\/\//);
    expect(deadlines.list).toEqual(LEGAL_CHANNEL.deadlines);
    expect(deadlines.list.join(' ')).toMatch(/24 horas.*48 horas.*72 horas/);
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

describe('author links: UTM and the static files', () => {
  it('tags a credits link with where the click was', () => {
    const url = new URL(withUtm(AUTHOR.url, 'noscript'));
    expect(url.origin + url.pathname).toBe(AUTHOR.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'masterwhats', utm_medium: 'referral', utm_campaign: 'creditos', utm_content: 'noscript',
    });
    expect(withUtm('https://example.com/?a=1')).toBe('https://example.com/?a=1&utm_source=masterwhats&utm_medium=referral&utm_campaign=creditos');
    // A fragment stays last; a tag already there is replaced, not repeated.
    expect(withUtm('https://example.com/p#readme', 'app')).toBe('https://example.com/p?utm_source=masterwhats&utm_medium=referral&utm_campaign=creditos&utm_content=app#readme');
    expect(withUtm('https://example.com/?utm_source=x').match(/utm_source/g)).toHaveLength(1);
  });

  it('fills the static files: escaped in HTML, plain in text; identity without UTM', () => {
    const html = authorPlaceholders({ html: true });
    const text = authorPlaceholders();
    expect(html['%AUTHOR_LINK%']).toContain('&amp;utm_medium=referral');
    expect(html['%AUTHOR_LINK%']).toContain('utm_content=noscript');
    expect(text['%AUTHOR_LINK%']).toBe(withUtm(AUTHOR.url, 'llms'));
    expect(text['%AUTHOR_URL%']).toBe(AUTHOR.url);
    expect(text['%AUTHOR_NAME%']).toBe(AUTHOR.name);
    // The JSON-LD placeholders are replaced, quotes and all, by JSON strings.
    expect(JSON.parse(html['"%AUTHOR_NAME_JSON%"'])).toBe(AUTHOR.name);
    expect(JSON.parse(html['"%AUTHOR_URL_JSON%"'])).toBe(AUTHOR.url);
    // Where the click came from is its own choice, apart from the escaping.
    expect(authorPlaceholders({ html: true, where: 'quem' })['%AUTHOR_LINK%']).toContain('utm_content=quem');
  });

  it('index.html and llms.txt carry the placeholders, not a hand copy of the author', () => {
    for (const file of ['index.html', 'public/llms.txt']) {
      const content = readFileSync(resolve(__dirname, '../..', file), 'utf8');
      expect(content).not.toContain(AUTHOR.name);
      expect(content).not.toContain(AUTHOR.url);
      expect(content).toContain('%AUTHOR_NAME');
      // The credits link to the code is the tagged one, not a hand copy.
      expect(content).toContain('%REPO_LINK%');
    }
  });
});

