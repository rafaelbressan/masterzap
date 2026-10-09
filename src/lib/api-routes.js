/**
 * The public API, as one table.
 *
 * There is no API code. Every route below is a `rewrite` in vercel.json to a
 * file the build already writes, served from the CDN. This table is the one
 * place that says which route means which file; it feeds the page that
 * documents the API, the MCP server that calls it, the section in llms.txt,
 * and a test that holds vercel.json to it. Change a route here and everything
 * follows — or the test fails.
 *
 * `route` and `file` use the same `:name` placeholders. Keep them Vercel-
 * rewrite compatible: one segment per placeholder, no regex.
 */

export const API_BASE = '/api/v1';
export const SITE_ORIGIN = 'https://www.masterwhats.com.br';
export const BULK_RELEASE = 'https://github.com/rafaelbressan/masterzap/releases/latest/download';

export const API_ROUTES = [
  {
    route: '/conversations',
    file: '/data/conversations.json',
    description: 'Todas as conversas: id, contato, período, contagens, fonte e, para as do laudo, o documento de origem.',
    example: '/conversations',
  },
  {
    route: '/conversations/:id',
    file: '/data/:id/index.json',
    description: 'Uma conversa: os dias que ela tem e quantas mensagens em cada um. É o índice para pedir os dias.',
    example: '/conversations/alexandre-de-moraes',
  },
  {
    route: '/conversations/:id/days/:date',
    file: '/data/:id/:date.json',
    description: 'As mensagens de um dia (AAAA-MM-DD), com os campos originais — e página e figura do laudo quando há.',
    example: '/conversations/alexandre-de-moraes/days/2025-11-15',
  },
  {
    route: '/conversations/:id/months/:month',
    file: '/export/masterwhats-:id-:month.json',
    description: 'Um mês inteiro (AAAA-MM) de uma conversa grande, com metadados e perfil. Só a conversa com Martha Graeff é grande o bastante para ter meses.',
    example: '/conversations/martha-graeff/months/2024-12',
  },
  {
    route: '/conversations/:id/full',
    file: '/export/masterwhats-:id.json',
    description: 'A conversa inteira num arquivo: metadados, perfil do contato com fontes, todas as mensagens. Pesado para a Martha (17 MB); prefira os meses.',
    example: '/conversations/ciro-soares/full',
  },
  {
    route: '/conversations/:id/search-index',
    file: '/data/:id/search-index.json',
    description: 'O índice de busca da conversa. Baixe e busque do seu lado — é o que o site faz; não há busca no servidor.',
    example: '/conversations/ciro-soares/search-index',
  },
  {
    route: '/calls',
    file: '/data/calls.json',
    description: 'Todas as chamadas registradas, mais recente primeiro: quem ligou, tipo, como terminou, duração, e a mensagem onde ela está.',
    example: '/calls',
  },
  {
    route: '/people',
    file: '/data/people.json',
    description: 'As pessoas citadas nas conversas, com toda menção por conversa, datada, com página do laudo e link para a mensagem.',
    example: '/people',
  },
];

/** Fill the placeholders of a route or file pattern. */
export function fill(pattern, params) {
  return pattern.replace(/:([a-z]+)/g, (_, name) => {
    if (!(name in params)) throw new Error(`falta o parâmetro :${name}`);
    return encodeURIComponent(params[name]);
  });
}

/**
 * The file an API path maps to, or null if no route matches.
 * @param {string} path - e.g. "/api/v1/conversations/ciro-soares/days/2024-04-14"
 */
export function resolve(path) {
  if (!path.startsWith(API_BASE + '/')) return null;
  const rest = path.slice(API_BASE.length);
  for (const r of API_ROUTES) {
    const names = [];
    const re = new RegExp('^' + r.route.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
    const m = rest.match(re);
    if (!m) continue;
    const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    return { route: r, params, file: fill(r.file, params) };
  }
  return null;
}

/** The vercel.json rewrites this table implies, in Vercel's own syntax. */
export function vercelRewrites() {
  return API_ROUTES.map(r => ({
    source: API_BASE + r.route,
    destination: r.file.replace(/:([a-z]+)/g, ':$1'),
  }));
}

/** Full URL of a route on the site. */
export const apiUrl = (route, params = {}, origin = SITE_ORIGIN) => `${origin}${API_BASE}${fill(route, params)}`;

/** "Como usar no Claude Code" → "como-usar-no-claude-code": a section's address. */
export const slugOf = (title) => title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Limits the MCP enforces; documented from here so the page cannot drift. */
export const MCP_LIMITS = {
  perMinute: 30,
  perDay: 300,
  globalPerDay: 25000,
};
export const MCP_URL = `${SITE_ORIGIN}/api/mcp`;
