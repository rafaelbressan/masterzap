// @vitest-environment node
//
// The MCP through a real client over an in-memory transport, with the tools'
// fetch pointed at the built site. What is checked is what a model gets: the
// answer, and enough provenance to cite it.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { McpServer, InMemoryTransport } from '@modelcontextprotocol/server';
import { Client } from '@modelcontextprotocol/client';
import { registerMasterwhats } from '../../src/lib/mcp/server.js';
import { resolve, SITE_ORIGIN } from '../../src/lib/api-routes.js';

const ROOT = join(import.meta.dirname, '../..');
const DIST = join(ROOT, 'dist');

/** Serves the built site the way the CDN would: API routes through the table, anything else by path. */
const fetchDist = async (url) => {
  const { pathname } = new URL(url);
  const hit = resolve(pathname);
  const file = join(DIST, hit ? hit.file : pathname);
  if (!existsSync(file)) return new Response('not found', { status: 404 });
  return new Response(readFileSync(file), { status: 200 });
};

let client;
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  try { return JSON.parse(text); } catch { return text; }
};

beforeAll(async () => {
  const server = new McpServer({ name: 'masterwhats-test', version: '0' });
  registerMasterwhats(server, { fetch: fetchDist, origin: SITE_ORIGIN });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(b);
});

describe('tools', () => {
  it('lists the conversations with what a model needs to pick one', async () => {
    const list = await call('list_conversations');
    expect(list.length).toBe(24);
    const moraes = list.find(c => c.id === 'alexandre-de-moraes');
    expect(moraes).toMatchObject({ contact: 'Alexandre de Moraes BRASILIA', messages: 62 });
    expect(moraes.source).toMatch(/IPJ-A/);
  });

  it('reads messages of a day with page and figure of the report', async () => {
    const msgs = await call('get_messages', { id: 'alexandre-de-moraes', from: '2025-11-15' });
    const hit = msgs.find(m => m.content.includes('estar fora'));
    expect(hit).toMatchObject({ id: 39, laudo: { page: 109, figure: 108 }, view_once: true });
    expect(hit.link).toBe('https://www.masterwhats.com.br/#/chat/alexandre-de-moraes/msg/39');
  });

  it('refuses a range too big and points at the monthly Markdown', async () => {
    const out = await call('get_messages', { id: 'martha-graeff', from: '2024-03-01', to: '2024-12-31' });
    expect(out).toMatch(/masterwhats-martha-graeff-2024-03\.md/);
  });

  it('searches across conversations, accent-blind, in the connector shape', async () => {
    const { results } = await call('search', { query: 'GONET', limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => /gonet/i.test(r.text))).toBe(true);
    expect(new Set(results.map(r => r.id.split('/')[0])).size).toBeGreaterThan(1);
    expect(results[0]).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), text: expect.any(String), url: expect.any(String) }));
  });

  it('fetches one message with its neighbours and its citation', async () => {
    const doc = await call('fetch', { id: 'martha-graeff/35686' });
    expect(doc.text).toBe('Acredita que o presidente bacen ja falou da nossa casa');
    expect(doc.metadata.date).toBe('2024-12-04');
    expect(doc.metadata.after[0].content).toBe('Banco central');
    expect(doc.url).toBe('https://www.masterwhats.com.br/#/chat/martha-graeff/msg/35686');
  });

  it('lists calls, and only one conversation\'s when asked', async () => {
    const all = await call('get_calls', { limit: 5 });
    expect(all.total).toBeGreaterThan(1300);
    const fabio = await call('get_calls', { conversation: 'fabio-faria' });
    expect(fabio.total).toBe(4);
    expect(fabio.calls[0].link).toMatch(/#\/chat\/fabio-faria\/msg\/\d+$/);
  });

  it('knows the people, and every mention of one', async () => {
    const people = await call('get_person');
    expect(people.map(p => p.slug)).toContain('paulo-gonet');
    const gonet = await call('get_person', { slug: 'paulo-gonet' });
    expect(gonet.total).toBe(12);
    const ciro = gonet.conversations.find(c => c.id === 'ciro-soares');
    expect(ciro.mentions.find(m => m.id === 34)).toMatchObject({ laudo: { page: 207, figure: 219 } });
  });

  it('says so, rather than inventing, when something does not exist', async () => {
    expect(await call('get_conversation', { id: 'andre-esteves' })).toMatch(/Não existe/);
    expect(await call('fetch', { id: 'ciro-soares/99999' })).toMatch(/não existe/);
  });
});

describe('resources', () => {
  it('offers the site map for models', async () => {
    const { resources } = await client.listResources();
    expect(resources.map(r => r.name).sort()).toEqual(['api', 'llms', 'llms-full']);
    const { contents } = await client.readResource({ uri: 'https://www.masterwhats.com.br/llms.txt' });
    expect(contents[0].text).toContain('# MasterWhats');
  });
});
