// @vitest-environment node
//
// The build turns the site's highlights into citations. What is checked here is
// the promise those citations make: they point at a real message, they carry
// the date and the page of the report, and a highlight that matches nothing
// stops the build rather than shipping a quote that points nowhere.

import { describe, it, expect } from 'vitest';
import {
  createResolver, createLocator, loadEntries, normalize, citationOf, linksToMarkdown, linksToHtml, linksToText,
} from '../../scripts/lib/corpus.mjs';

const entries = loadEntries();
const resolve = createResolver(entries);

describe('resolving a highlight', () => {
  it('finds the message the app would scroll to', () => {
    const { msg } = resolve('alexandre-de-moraes', 'estar fora');
    expect(msg.content).toContain('Acha que segunda ja tenho que estar fora?');
    expect(msg.source_page).toBe(109);
  });

  it('ignores accents and case, like the app', () => {
    expect(normalize('Você')).toBe('voce');
    expect(resolve('martha-graeff', 'ANARQUIA DO SISTEMA').msg.content).toMatch(/anarquia do sistema/i);
  });

  it('fails the build on a highlight that matches nothing', () => {
    expect(() => resolve('alexandre-de-moraes', 'isto não está em lugar nenhum')).toThrow(/destaque sem mensagem/);
  });

  it('fails the build on a conversation that does not exist', () => {
    expect(() => resolve('ninguem', 'x')).toThrow(/inexistente/);
  });
});

describe('rendering', () => {
  const text = '"{Acha que segunda ja tenho que estar fora?}[action:search:estar fora]" e {Ciro}[action:contact:ciro-soares] e {fonte}[https://ex.am/ple]';
  const opts = { resolve, context: 'alexandre-de-moraes' };

  it('links the quote to the message and cites date and page', () => {
    const md = linksToMarkdown(text, opts);
    expect(md).toContain('](https://www.masterwhats.com.br/#/chat/alexandre-de-moraes/msg/39) ⟨15/11/2025 18:22 · laudo p. 109, fig. 108⟩');
    expect(md).toContain('[Ciro](https://www.masterwhats.com.br/chat/ciro-soares)');
    expect(md).toContain('[fonte](https://ex.am/ple)');
  });

  it('points at the static anchor when told where messages live', () => {
    const locate = createLocator(entries);
    expect(linksToMarkdown(text, { ...opts, hrefFor: locate }))
      .toContain('](https://www.masterwhats.com.br/chat/alexandre-de-moraes#msg-39) ⟨');
    expect(linksToMarkdown('{x}[action:search@martha-graeff:presidente bacen]', { resolve, hrefFor: locate }))
      .toContain('](https://www.masterwhats.com.br/chat/martha-graeff/2024-12#msg-35686)');
    expect(linksToHtml(text, { ...opts, hrefFor: locate, fromPath: '/chat/alexandre-de-moraes' }))
      .toContain('<a href="#msg-39">');
  });

  it('uses an anchor when the message is on the same page', () => {
    const html = linksToHtml(text, { ...opts, samePage: 'alexandre-de-moraes' });
    expect(html).toContain('<a href="#msg-39">');
    expect(html).toContain('<small>⟨15/11/2025 18:22 · laudo p. 109, fig. 108⟩</small>');
    expect(html).toContain('<a href="/chat/ciro-soares">Ciro</a>');
  });

  it('escapes the text but not the site\'s own links, in html', () => {
    expect(linksToHtml('a < b {x}[https://e.x/y?a=1&b=2]')).toBe('a &lt; b <a href="https://e.x/y?a=1&amp;b=2" rel="noopener">x</a>');
  });

  it('sets `code` apart in html, drops the ticks in text, keeps them in Markdown', () => {
    expect(linksToHtml('mande `X-Client` no header')).toBe('mande <code>X-Client</code> no header');
    expect(linksToText('mande `X-Client` no header')).toBe('mande X-Client no header');
    expect(linksToMarkdown('mande `X-Client` no header')).toBe('mande `X-Client` no header');
  });

  it('comes out as plain text when asked', () => {
    expect(linksToText(text)).toBe('"Acha que segunda ja tenho que estar fora?" e Ciro e fonte');
  });

  it('refuses a relative search with no conversation to run it in', () => {
    expect(() => linksToMarkdown('{x}[action:search:estar fora]', { resolve })).toThrow(/contexto/);
  });

  it('cites a message without a report page by date alone', () => {
    expect(citationOf({ date: '2024-12-04', time: '00:33:42' })).toBe('04/12/2024 00:33');
  });
});
