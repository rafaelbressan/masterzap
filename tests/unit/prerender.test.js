// @vitest-environment node
//
// Guards on what the build hands to crawlers: a real page per conversation,
// the whole corpus as text, and a sitemap that lists them. Read from dist, so
// `npm run build` comes first.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { API_ROUTES, MCP_URL, MCP_LIMITS } from '../../src/lib/api-routes.js';
import { LEGAL_SECTIONS } from '../../src/lib/legal-content.js';

const ROOT = join(import.meta.dirname, '../..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.masterwhats.com.br';

const conversations = JSON.parse(
  readFileSync(join(ROOT, 'public/data/conversations.json'), 'utf-8')
).conversations;

const page = (id) => readFileSync(join(DIST, 'chat', id, 'index.html'), 'utf-8');
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m => JSON.parse(m[1]));

describe('one page per conversation', () => {
  it('exists for every conversation the site lists', () => {
    for (const conv of conversations) {
      expect(existsSync(join(DIST, 'chat', conv.id, 'index.html')), conv.id).toBe(true);
    }
  });

  it('is titled and canonical for that conversation, not the home page', () => {
    for (const conv of conversations) {
      const html = page(conv.id);
      expect(html, conv.id).toContain(`<link rel="canonical" href="${SITE}/chat/${conv.id}">`);
      expect(html, conv.id).toContain(`<meta property="og:url" content="${SITE}/chat/${conv.id}">`);
      expect(html, conv.id).toMatch(/<title>Daniel Vorcaro ↔ .+ — MasterWhats<\/title>/);
    }
  });

  it('gives every message an anchor and links the highlights to them', () => {
    const html = page('alexandre-de-moraes');
    expect(html).toContain('<p id="msg-39">');
    expect(html).toContain('<a href="#msg-39">Acha que segunda ja tenho que estar fora?</a>');
    expect(html).toContain('<small>⟨15/11/2025 18:22 · laudo p. 109, fig. 108⟩</small>');
  });

  it('names the report by pages and hash', () => {
    const html = page('ciro-soares');
    expect(html).toContain('218 páginas');
    expect(html).toMatch(/<dt>sha256 do documento<\/dt><dd><code>[0-9a-f]{64}<\/code><\/dd>/);
    // The path is the repository's; a crawler must not fetch it from the site.
    expect(html).toContain('href="https://github.com/rafaelbressan/masterzap/blob/main/data/source/');
    expect(html).toContain('o site não serve o PDF');
    const [ld] = ldBlocks(html);
    expect(ld.isBasedOn.numberOfPages).toBe(218);
    expect(ld.isBasedOn.identifier.value).toMatch(/^[0-9a-f]{64}$/);
  });

  it('carries the conversation as plain HTML, with the contact named', () => {
    const html = page('ciro-soares');
    expect(html).toContain('<article id="prerender">');
    expect(html).toContain('<h1>Daniel Vorcaro ↔ Ciro Soares</h1>');
    expect(html).toContain('<h2>Quem é Ciro Soares</h2>');
    expect(html).toContain('<h2>Proveniência</h2>');
    expect(html).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00">/);
    expect(html).toContain('laudo p. ');
  });

  it('shows only a preview of the big one and says where the rest is', () => {
    const html = page('martha-graeff');
    expect(html).toContain('(primeiras 200 mensagens)');
    expect(html).toContain('/export/masterwhats-martha-graeff.md');
    expect(html.length).toBeLessThan(400_000);
  });

  it('describes itself as a Conversation in the dataset', () => {
    for (const conv of conversations) {
      const blocks = ldBlocks(page(conv.id));
      expect(blocks, conv.id).toHaveLength(1);
      const [ld] = blocks;
      expect(ld['@type']).toBe('Conversation');
      expect(ld['@id']).toBe(`${SITE}/chat/${conv.id}`);
      expect(ld.isPartOf['@id']).toBe(`${SITE}/#dataset`);
      expect(ld.encoding.map(e => e.contentUrl)).toContain(`${SITE}/export/masterwhats-${conv.id}.md`);
      if (conv.source?.startsWith('IPJ-A')) expect(ld.isBasedOn['@type'], conv.id).toBe('DigitalDocument');
    }
  });

  it('opens that chat in the app', () => {
    for (const conv of conversations) {
      expect(page(conv.id), conv.id).toContain(`location.replace('#/chat/${conv.id}')`);
    }
  });

  it('loads the same bundle the home page does', () => {
    const home = readFileSync(join(DIST, 'index.html'), 'utf-8');
    const [bundle] = home.match(/\/assets\/index-[\w-]+\.js/);
    expect(existsSync(join(DIST, bundle))).toBe(true);
    for (const conv of conversations) expect(page(conv.id), conv.id).toContain(bundle);
  });

  it('leaves no site-only markup in the article', () => {
    for (const conv of conversations) {
      const [article] = page(conv.id).match(/<article id="prerender">[\s\S]*?<\/article>/);
      expect(article, conv.id).not.toMatch(/\{[^}]+\}\[[^\]]+\]/);
      expect(article, conv.id).not.toContain('[action:');
    }
  });
});

describe('discovery', () => {
  // A crawler should not have to guess that llms.txt exists.
  it('the home page and robots.txt point at llms.txt', () => {
    const home = readFileSync(join(DIST, 'index.html'), 'utf-8');
    expect(home).toContain('<link rel="alternate" type="text/plain" href="/llms.txt"');
    expect(home).toContain('href="/llms-full.txt"');
    const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf-8');
    expect(robots).toContain('/llms.txt');
  });
});

describe('a conversation too big for one page', () => {
  const months = readdirSync(join(DIST, 'chat', 'martha-graeff')).filter(n => /^\d{4}-\d{2}$/.test(n)).sort();

  it('gets one page per month, and the main page lists them', () => {
    expect(months.length).toBeGreaterThan(12);
    const main = page('martha-graeff');
    expect(main).toContain('<h2>Meses</h2>');
    for (const ym of months) expect(main, ym).toContain(`<a href="/chat/martha-graeff/${ym}">`);
  });

  it('holds only that month, in order, chained to its neighbours', () => {
    const html = readFileSync(join(DIST, 'chat/martha-graeff/2024-12/index.html'), 'utf-8');
    expect(html).toContain('<link rel="canonical" href="https://www.masterwhats.com.br/chat/martha-graeff/2024-12">');
    expect(html).toContain('<link rel="prev" href="https://www.masterwhats.com.br/chat/martha-graeff/2024-11">');
    expect(html).toContain('<link rel="next" href="https://www.masterwhats.com.br/chat/martha-graeff/2025-01">');
    const stamps = [...html.matchAll(/<time datetime="(\d{4}-\d{2})-\d{2}T/g)].map(m => m[1]);
    expect(stamps.length).toBeGreaterThan(100);
    expect(new Set(stamps)).toEqual(new Set(['2024-12']));
    const [ld] = ldBlocks(html);
    expect(ld['@type']).toBe('Conversation');
    expect(ld.isPartOf['@id']).toBe(`${SITE}/chat/martha-graeff`);
    expect(html).toContain("location.replace('#/chat/martha-graeff/msg/");
  });

  // The famous quote lives in December 2024, not among the first 200. Its
  // anchor is on the month page, and the home page's highlight points there.
  it('anchors the message on its month page, where the home page points', () => {
    expect(readFileSync(join(DIST, 'chat/martha-graeff/2024-12/index.html'), 'utf-8')).toContain('<p id="msg-35686">');
    expect(readFileSync(join(DIST, 'index.html'), 'utf-8')).toContain('href="/chat/martha-graeff/2024-12#msg-35686"');
  });

  // A static anchor link must work for a browser too: the page opens the app
  // at that message instead of at the top of the chat.
  it('turns a #msg-N fragment into the app route for that message', () => {
    expect(page('alexandre-de-moraes')).toContain("location.replace('#/chat/alexandre-de-moraes/msg/'+m[1])");
  });
});

describe('people', () => {
  const person = (slug) => readFileSync(join(DIST, 'quem', slug, 'index.html'), 'utf-8');

  it('has an index and a page per person', () => {
    const index = readFileSync(join(DIST, 'quem/index.html'), 'utf-8');
    expect(index).toContain('<a href="/quem/paulo-gonet">Paulo Gonet</a>');
    expect(index).toContain('<a href="/quem/andre-esteves">André Esteves</a>');
  });

  it('lists every mention by conversation, dated, pointing at the message', () => {
    const html = person('paulo-gonet');
    expect(html).toContain('<h1>Paulo Gonet</h1>');
    // Counts say which alias found what; a hit by an alias is marked.
    expect(html).toMatch(/\d+ por «gonet», \d+ por «paulo»/);
    expect(html).toContain('· por «paulo»</small>');
    // The son is not the father.
    expect(html).not.toContain('Pedro Gonet');
    expect(html).toContain('Daniel Vorcaro ↔ Ciro Soares</a>');
    expect(html).toContain('href="/chat/ciro-soares#msg-34"');
    expect(html).toContain('href="https://www.masterwhats.com.br/#/chat/ciro-soares/msg/34"');
    expect(html).toContain('laudo p. 207, fig. 219');
    expect(html).toMatch(/<time datetime="2025-03-29T13:58:\d{2}-03:00">29\/03\/2025 13:58<\/time>/);
  });

  it('says how it read the names, so an ambiguous alias is not a hidden guess', () => {
    expect(person('paulo-gonet')).toContain('<code>paulo</code> (só em Alexandre de Moraes');
  });

  it('points a mention in the big conversation at its month page', () => {
    expect(person('andre-esteves')).toMatch(/href="\/chat\/martha-graeff\/\d{4}-\d{2}#msg-\d+"/);
  });

  it('describes the page as being about a Person', () => {
    const [ld] = ldBlocks(person('paulo-gonet'));
    expect(ld['@type']).toBe('WebPage');
    expect(ld.about).toEqual({ '@type': 'Person', name: 'Paulo Gonet', jobTitle: 'Procurador-geral da República' });
  });

  it('is in the sitemap and in llms-full.txt', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
    expect(xml).toContain(`<loc>${SITE}/quem</loc>`);
    expect(xml).not.toContain(`<loc>${SITE}/quem/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/quem/paulo-gonet</loc>`);
    expect(xml).toContain(`<loc>${SITE}/chat/martha-graeff/2024-12</loc>`);
    const t = readFileSync(join(DIST, 'llms-full.txt'), 'utf-8');
    expect(t).toContain('## Pessoas citadas (');
    expect(t).toContain(`[Paulo Gonet](${SITE}/quem/paulo-gonet)`);
    expect(t).toContain(`${SITE}/chat/martha-graeff/2024-12`);
  });
});

describe('the API page', () => {
  it('documents every route of the table, and the MCP, without the app', () => {
    const html = readFileSync(join(DIST, 'api/index.html'), 'utf-8');
    for (const r of API_ROUTES) {
      expect(html, r.route).toContain(`<code>${r.route}</code>`);
      expect(html, r.example).toContain(`href="/api/v1${r.example}"`);
    }
    expect(html).toContain(MCP_URL);
    expect(html).toContain(`${MCP_LIMITS.perDay}/dia`);
    expect(html).toContain('claude mcp add --transport http masterwhats');
    expect(html).toContain('>Exemplos com a API</h2>');
    expect(html).toContain('curl -s https://www.masterwhats.com.br/api/v1/calls');
    expect(html).toContain('<link rel="canonical" href="https://www.masterwhats.com.br/api">');
  });

  it('is announced in llms.txt, route by route', () => {
    const t = readFileSync(join(DIST, 'llms.txt'), 'utf-8');
    expect(t).toContain('## API e MCP');
    for (const r of API_ROUTES) expect(t, r.route).toContain(`${SITE}/api/v1${r.route}`);
    expect(t).toContain(MCP_URL);
  });

  it('serves the people as data for the API', () => {
    const { people } = JSON.parse(readFileSync(join(DIST, 'data/people.json'), 'utf-8'));
    const gonet = people.find(p => p.slug === 'paulo-gonet');
    expect(gonet.total).toBe(12);
    expect(gonet.conversations.find(c => c.id === 'ciro-soares').mentions.find(m => m.id === 34).laudo).toEqual({ page: 207, figure: 219 });
  });
});

describe('the legal notice', () => {
  it('has a page of its own, with every section, and is on the sitemap', () => {
    const html = readFileSync(join(DIST, 'legal/index.html'), 'utf-8');
    expect(html).toContain('<link rel="canonical" href="https://www.masterwhats.com.br/legal">');
    for (const s of LEGAL_SECTIONS) expect(html, s.title).toContain(`>${s.title}</h2>`);
    expect(html).toContain('não atesta a veracidade');
    expect(readFileSync(join(DIST, 'sitemap.xml'), 'utf-8')).toContain(`<loc>${SITE}/legal</loc>`);
  });

  it('travels with everything the site hands out', () => {
    expect(readFileSync(join(DIST, 'llms.txt'), 'utf-8')).toContain('## Aviso legal');
    expect(readFileSync(join(DIST, 'api/index.html'), 'utf-8')).toContain('não atesta a veracidade');
    expect(readFileSync(join(DIST, 'quem/paulo-gonet/index.html'), 'utf-8')).toContain('não atesta a veracidade');
    expect(readFileSync(join(DIST, 'index.html'), 'utf-8')).toContain('href="/legal"');
  });
});

describe('the home page', () => {
  it('describes the corpus as a Dataset with downloads', () => {
    const blocks = ldBlocks(readFileSync(join(DIST, 'index.html'), 'utf-8'));
    const dataset = blocks.find(b => b['@type'] === 'Dataset');
    expect(dataset['@id']).toBe(`${SITE}/#dataset`);
    expect(dataset.distribution.map(d => d.contentUrl)).toContain('https://github.com/rafaelbressan/masterzap/releases/latest/download/masterwhats-export.zip');
  });
});

describe('llms.txt', () => {
  it('quotes the real size of the big files', () => {
    const t = readFileSync(join(DIST, 'llms.txt'), 'utf-8');
    const real = (statSync(join(ROOT, 'release/masterwhats.md')).size / 1e6).toFixed(1);
    expect(t).toContain(`masterwhats.md (${real} MB)`);
  });
});

describe('llms-full.txt', () => {
  const text = () => readFileSync(join(DIST, 'llms-full.txt'), 'utf-8');

  it('names every conversation and points at its Markdown', () => {
    const t = text();
    expect(t).toContain(`## Conversas (${conversations.length})`);
    for (const conv of conversations) {
      expect(t, conv.id).toContain(`${SITE}/chat/${conv.id}`);
      expect(t, conv.id).toContain(`${SITE}/export/masterwhats-${conv.id}.md`);
    }
  });

  it('cites every highlight with a link, a date and a page', () => {
    const t = text();
    expect(t).toContain('/chat/alexandre-de-moraes#msg-39) ⟨15/11/2025 18:22 · laudo p. 109, fig. 108⟩');
    // The famous quote lives in December 2024, on that month's page.
    expect(t).toContain('/chat/martha-graeff/2024-12#msg-35686) ⟨04/12/2024 00:33⟩');
    expect(t).toContain('## Documento-fonte do relatório da PF');
  });

  it('carries the profiles with their sources as links, and nothing site-only', () => {
    const t = text();
    expect(t).toContain('## Quem é Daniel Vorcaro');
    expect(t).toMatch(/\[[^\]]+\]\(https?:\/\/[^)]+\)/);
    expect(t).not.toMatch(/\{[^}]+\}\[[^\]]+\]/);
    expect(t).not.toContain('[action:');
  });
});

describe('sitemap.xml', () => {
  it('lists home, every page and every Markdown', () => {
    const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf-8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    expect(locs).toContain(`${SITE}/`);
    expect(locs).toContain(`${SITE}/llms.txt`);
    expect(locs).toContain(`${SITE}/llms-full.txt`);
    for (const conv of conversations) {
      expect(locs, conv.id).toContain(`${SITE}/chat/${conv.id}`);
      expect(locs, conv.id).toContain(`${SITE}/export/masterwhats-${conv.id}.md`);
    }
    expect(locs.some(l => l.includes('#'))).toBe(false);
  });
});
