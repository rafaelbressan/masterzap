#!/usr/bin/env node
// Smoke-test the MCP endpoint with a real Streamable HTTP client.
//   node scripts/mcp-smoke.mjs [url]   (default: the production URL)
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const url = process.argv[2] || 'https://www.masterwhats.com.br/api/mcp';
const client = new Client({ name: 'masterwhats-smoke', version: '1.0.0' });
const t0 = Date.now();
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
console.log(`connected ${url} in ${Date.now() - t0} ms · server:`, JSON.stringify(client.getServerVersion()));

const { tools } = await client.listTools();
console.log('tools:', tools.map(t => t.name).join(', '));
const { resources } = await client.listResources();
console.log('resources:', resources.map(r => r.uri).join(', '));

const text = (r) => r.content?.find(c => c.type === 'text')?.text ?? '';
const calls = [
  ['list_conversations', {}],
  ['search', { query: 'peleleca' }],
  ['get_conversation', { id: 'alexandre-de-moraes' }],
  ['get_calls', {}],
  ['get_person', { slug: 'alexandre-de-moraes' }],
];
for (const [name, args] of calls) {
  const t = Date.now();
  try {
    const r = await client.callTool({ name, arguments: args });
    const body = text(r);
    console.log(`✓ ${name} ${JSON.stringify(args)} · ${Date.now() - t} ms · ${body.length} chars · ${body.slice(0, 90).replace(/\s+/g, ' ')}…`);
  } catch (e) {
    console.log(`✗ ${name} ${JSON.stringify(args)} · ${e.message}`);
    process.exitCode = 1;
  }
}
await client.close();
