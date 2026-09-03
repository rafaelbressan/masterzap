/**
 * The MasterWhats MCP: what a model needs to answer about the conversations,
 * with the provenance to cite them.
 *
 * Every tool is an adapter over the public API — it fetches the same files
 * the site serves and shapes them for a model. Nothing here reads the data
 * another way, so the MCP can never disagree with the site. The one piece of
 * logic is search, and it borrows the app's own normalisation.
 *
 * Two tools are named for OpenAI's connector contract, `search` and `fetch`,
 * so ChatGPT's deep research can use this server unchanged; the rest carry
 * the names that describe them.
 */

import { z } from 'zod';
import { API_ROUTES, apiUrl, SITE_ORIGIN, MCP_LIMITS, BULK_RELEASE } from '../api-routes.js';
import { normalize } from '../search.js';

const MAX_DAYS_PER_CALL = 31;

/**
 * @param {McpServer} server
 * @param {object} [o]
 * @param {function} [o.fetch] - a fetch to use instead of the global one
 * @param {string} [o.origin] - where the API lives
 */
export function registerMasterwhats(server, { fetch: fetchImpl = globalThis.fetch, origin = SITE_ORIGIN } = {}) {
  const get = async (route, params = {}) => {
    const url = apiUrl(route, params, origin);
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  };
  const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) }] });
  const messageLink = (id, msg) => `${origin}/#/chat/${id}/msg/${msg.id}`;
  const cite = (id, msg) => ({
    id: msg.id, date: msg.date, time: msg.time, sender: msg.sender, type: msg.type, content: msg.content,
    ...(msg.source_page ? { laudo: { page: msg.source_page, figure: msg.source_figure } } : {}),
    ...(msg.view_once ? { view_once: true } : {}),
    link: messageLink(id, msg),
  });

  server.registerTool('list_conversations', {
    title: 'Listar conversas',
    description: 'Todas as conversas dos celulares apreendidos de Daniel Vorcaro: id, contato, período, número de mensagens, fonte. Comece por aqui para saber os ids.',
    inputSchema: z.object({}),
  }, async () => {
    const { conversations } = await get('/conversations');
    return text(conversations.map(c => ({
      id: c.id, contact: c.contact, messages: c.total_messages, from: c.date_range.start, to: c.date_range.end, source: c.source || 'Vazamento das conversas com Martha Graeff (março de 2026)',
    })));
  });

  server.registerTool('get_conversation', {
    title: 'Ver uma conversa',
    description: 'Metadados de uma conversa e a lista de dias com mensagens, para escolher o que pedir em get_messages.',
    inputSchema: z.object({ id: z.string().describe('id da conversa, de list_conversations') }),
  }, async ({ id }) => {
    const { conversations } = await get('/conversations');
    const conv = conversations.find(c => c.id === id);
    if (!conv) return text(`Não existe conversa com id "${id}". Veja list_conversations.`);
    const index = await get('/conversations/:id', { id });
    return text({ ...conv, days: index.dates, page: `${origin}/chat/${id}`, markdown: `${origin}/export/masterwhats-${id}.md` });
  });

  server.registerTool('get_messages', {
    title: 'Ler mensagens',
    description: `As mensagens de uma conversa entre duas datas (AAAA-MM-DD), com página e figura do laudo quando há, e o link de cada uma. Até ${MAX_DAYS_PER_CALL} dias por chamada.`,
    inputSchema: z.object({
      id: z.string(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('primeiro dia, inclusive'),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('último dia, inclusive; padrão = from'),
    }),
  }, async ({ id, from, to = from }) => {
    const index = await get('/conversations/:id', { id });
    const days = index.dates.map(d => d.date).filter(d => d >= from && d <= to);
    if (!days.length) return text(`Nenhuma mensagem entre ${from} e ${to}. Dias com mensagens perto daí: ${index.dates.map(d => d.date).filter(d => d >= from.slice(0, 7)).slice(0, 10).join(', ')}`);
    if (days.length > MAX_DAYS_PER_CALL) return text(`${days.length} dias com mensagens nesse intervalo; peça no máximo ${MAX_DAYS_PER_CALL} por chamada, ou use o Markdown do mês em ${origin}/export/masterwhats-${id}-${from.slice(0, 7)}.md`);
    const chunks = await Promise.all(days.map(date => get('/conversations/:id/days/:date', { id, date })));
    return text(chunks.flatMap(c => c.messages).map(m => cite(id, m)));
  });

  server.registerTool('search', {
    title: 'Buscar',
    description: 'Busca uma expressão nas mensagens (sem diferenciar acentos ou maiúsculas), numa conversa ou em todas. Devolve ids que fetch abre. Formato do conector do ChatGPT.',
    inputSchema: z.object({
      query: z.string().min(2),
      conversation: z.string().optional().describe('id de uma conversa; sem ele, busca em todas'),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  }, async ({ query, conversation, limit }) => {
    const needle = normalize(query);
    const { conversations } = await get('/conversations');
    const targets = conversation ? conversations.filter(c => c.id === conversation) : conversations;
    const results = [];
    for (const conv of targets) {
      const idx = await get('/conversations/:id/search-index', { id: conv.id });
      for (const entry of idx.messages || idx) {
        if (results.length >= limit) break;
        if (normalize(entry.content || entry.c || '').includes(needle)) {
          results.push({
            id: `${conv.id}/${entry.id ?? entry.i}`,
            title: `${conv.contact} — ${entry.date ?? entry.d} ${entry.sender ?? entry.s ?? ''}`.trim(),
            text: entry.content ?? entry.c,
            url: `${origin}/#/chat/${conv.id}/msg/${entry.id ?? entry.i}`,
          });
        }
      }
      if (results.length >= limit) break;
    }
    return text({ results });
  });

  server.registerTool('fetch', {
    title: 'Abrir uma mensagem',
    description: 'Uma mensagem com tudo que a cita: data, hora, remetente, página e figura do laudo, link estático e link do app. O id é "<conversa>/<n>", como search devolve. Formato do conector do ChatGPT.',
    inputSchema: z.object({ id: z.string().describe('"<conversa>/<n>"') }),
  }, async ({ id }) => {
    const [conv, n] = id.split('/');
    const messageId = Number(n);
    const index = await get('/conversations/:id', { id: conv });
    const day = index.dates.find(d => messageId >= d.first_message_id && messageId <= d.last_message_id);
    if (!day) return text(`Mensagem ${n} não existe em ${conv}.`);
    const { messages } = await get('/conversations/:id/days/:date', { id: conv, date: day.date });
    const i = messages.findIndex(m => m.id === messageId);
    if (i < 0) return text(`Mensagem ${n} não existe em ${conv}.`);
    const m = messages[i];
    return text({
      id, title: `${conv} · ${m.date} ${m.time} · ${m.sender}`,
      text: m.content,
      url: messageLink(conv, m),
      metadata: { ...cite(conv, m), before: messages.slice(Math.max(0, i - 2), i).map(x => cite(conv, x)), after: messages.slice(i + 1, i + 3).map(x => cite(conv, x)) },
    });
  });

  server.registerTool('get_calls', {
    title: 'Chamadas',
    description: 'As chamadas registradas — quem ligou, tipo, como terminou, duração — e a mensagem onde cada uma está. Opcionalmente só de uma conversa.',
    inputSchema: z.object({ conversation: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }),
  }, async ({ conversation, limit }) => {
    const { calls } = await get('/calls');
    const picked = (conversation ? calls.filter(c => c.conversation_id === conversation) : calls).slice(0, limit);
    return text({ total: conversation ? calls.filter(c => c.conversation_id === conversation).length : calls.length, calls: picked.map(c => ({ ...c, link: `${origin}/#/chat/${c.conversation_id}/msg/${c.message_id}` })) });
  });

  server.registerTool('get_person', {
    title: 'Pessoa citada',
    description: 'Toda menção a uma pessoa (Gonet, Moraes, Esteves…) por conversa, datada, com página do laudo e link. Sem slug, lista as pessoas.',
    inputSchema: z.object({ slug: z.string().optional().describe('ex.: paulo-gonet') }),
  }, async ({ slug }) => {
    const { people } = await get('/people');
    if (!slug) return text(people.map(p => ({ slug: p.slug, name: p.name, role: p.role, mentions: p.total })));
    const p = people.find(x => x.slug === slug);
    if (!p) return text(`Não há pessoa "${slug}". Slugs: ${people.map(x => x.slug).join(', ')}`);
    return text(p);
  });

  for (const [name, path, title] of [['llms', '/llms.txt', 'Mapa do site para modelos'], ['llms-full', '/llms-full.txt', 'Todo o texto do site: sobre, perfis, destaques, pessoas']]) {
    server.registerResource(name, `${origin}${path}`, { title, mimeType: 'text/plain' }, async (uri) => {
      const res = await fetchImpl(uri.href);
      return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: await res.text() }] };
    });
  }

  server.registerResource('api', `${origin}/api`, { title: 'A API estática, seus limites e o bulk', mimeType: 'text/plain' }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/plain', text: [
      `API estática (CDN, sem limite): ${origin}/api/v1/…`,
      ...API_ROUTES.map(r => `  ${r.route} → ${r.description}`),
      `Bulk (tudo num arquivo): ${BULK_RELEASE}/masterwhats-export.zip`,
      `Limites deste MCP por cliente: ${MCP_LIMITS.perMinute}/min, ${MCP_LIMITS.perDay}/dia. Para volume, use a API estática.`,
    ].join('\n') }],
  }));
}
