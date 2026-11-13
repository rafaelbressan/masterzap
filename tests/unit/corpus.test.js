// @vitest-environment node
//
// The build turns the site's highlights into citations. What is checked here is
// the promise those citations make: they point at a real message, they carry
// the date and the page of the report, and a highlight that matches nothing
// stops the build rather than shipping a quote that points nowhere.

import { describe, it, expect } from 'vitest';
import { SITE_URL } from '../../src/config/site.js';
import {
  createResolver, createLocator, loadEntries, normalize, citationOf, linksToMarkdown, linksToHtml, linksToText,
  brDate, longDate, monthOf, zonedTimestamp, contactOf, whoIs, messageText, pageOf,
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
    expect(md).toContain(`](${SITE_URL}/#/chat/alexandre-de-moraes/msg/39) ⟨15/11/2025 18:22 · laudo p. 109, fig. 108⟩`);
    expect(md).toContain(`[Ciro](${SITE_URL}/chat/ciro-soares)`);
    expect(md).toContain('[fonte](https://ex.am/ple)');
  });

  it('points at the static anchor when told where messages live', () => {
    const locate = createLocator(entries);
    expect(linksToMarkdown(text, { ...opts, hrefFor: locate }))
      .toContain(`](${SITE_URL}/chat/alexandre-de-moraes#msg-39) ⟨`);
    expect(linksToMarkdown('{x}[action:search@martha-graeff:presidente bacen]', { resolve, hrefFor: locate }))
      .toContain(`](${SITE_URL}/chat/martha-graeff/2024-12#msg-35686)`);
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

describe('partial dates and unknown times in the build', () => {
  it('writes only what the source knows', () => {
    expect(brDate('2024-07-02')).toBe('02/07/2024');
    expect(brDate('2024-07')).toBe('07/2024');
    expect(brDate('sem-data')).toBe('Data não informada');
    expect(longDate('2024-07')).toBe('julho de 2024');
    expect(longDate('sem-data')).toBe('Data não informada');
  });

  it('cites a message with no time without inventing one', () => {
    expect(citationOf({ date: '2024-07', time: null, source_page: 3 }, 'alexandre-de-moraes')).toBe('07/2024, horário não informado · laudo p. 3');
    expect(zonedTimestamp({ timestamp: null })).toBeNull();
    expect(zonedTimestamp({ timestamp: '2024-07-02T10:00:00' })).toBe('2024-07-02T10:00:00-03:00');
  });

  it('puts undated messages on a page of their own', () => {
    expect(monthOf('2024-07-02')).toBe('2024-07');
    expect(monthOf('2024-07')).toBe('2024-07');
    expect(monthOf('sem-data')).toBe('sem-data');
  });

  it('prefers the contact the build recorded', () => {
    expect(contactOf({ contact: 'Fulano', participants: ['DV', 'Apelido'] })).toBe('Fulano');
    expect(contactOf({ participants: ['DV', 'Apelido'] })).toBe('Apelido');
  });
});

describe('whoIs', () => {
  // A conversation with no profile falls back to its contact (the binding
  // corpus.mjs re-exports from src/lib/participants.js must exist locally).
  it('names a conversation without a profile after its contact', () => {
    expect(whoIs({ id: 'x', participants: ['DV', 'Fulano'] }, null)).toBe('Fulano');
  });
});


describe('messageText', () => {
  it('puts the editorial note after the message, named as such', () => {
    expect(messageText({ type: 'text', content: 'Oi', note: ' Hora estimada. ' }))
      .toBe('Oi (Nota do MasterWhats: Hora estimada.)');
    expect(messageText({ type: 'image', content: '', note: 'Figura cortada.' }))
      .toBe('[Foto] (Nota do MasterWhats: Figura cortada.)');
    expect(messageText({ type: 'text', content: 'Oi' })).toBe('Oi');
  });
});

describe('pageOf', () => {
  it("names the message's document: the report's laudo, the Inq 5.026 representação", () => {
    expect(pageOf({ source_page: 109, source_figure: 108 }, 'alexandre-de-moraes')).toBe('laudo p. 109, fig. 108');
    expect(pageOf({ source_page: 63 }, 'berg')).toBe('representação p. 63');
    // A message carrying its own source wins over its conversation's.
    expect(pageOf({ source_page: 5, source_id: 'inq-5026-representacao-pf-2026-06-09' }, 'alexandre-de-moraes')).toBe('representação p. 5');
    expect(pageOf({ source_page: null }, 'berg')).toBe('');
  });
});
