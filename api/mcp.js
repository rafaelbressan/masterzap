/**
 * The MasterWhats MCP server, as one Vercel Function.
 *
 * Streamable HTTP, stateless, no auth: the data is public and the site
 * already serves it. What the function guards is the site's own budget —
 * see src/lib/mcp/limits.js — and it says so in the 429.
 */

import { createMcpHandler } from 'mcp-handler';
import { registerMasterwhats } from '../src/lib/mcp/server.js';
import { createLimiter, clientOf } from '../src/lib/mcp/limits.js';
import { MCP_LIMITS, SITE_ORIGIN, API_BASE } from '../src/lib/api-routes.js';

const origin = process.env.SITE_ORIGIN || SITE_ORIGIN;
const limiter = createLimiter(MCP_LIMITS);

const mcp = createMcpHandler(
  (server) => registerMasterwhats(server, { origin }),
  { serverInfo: { name: 'masterwhats', version: '1.0.0' } },
);

const REASONS = {
  minute: `Mais de ${MCP_LIMITS.perMinute} chamadas por minuto. Espere um pouco.`,
  day: `Cota diária deste cliente (${MCP_LIMITS.perDay} chamadas) esgotada; volta à meia-noite UTC.`,
  global: 'O MCP atingiu o teto diário do site; volta à meia-noite UTC.',
};

async function handle(request) {
  const verdict = limiter.check(clientOf(request));
  if (!verdict.ok) {
    return new Response(JSON.stringify({
      error: 'rate_limited',
      reason: verdict.reason,
      message: `${REASONS[verdict.reason]} Para volume, a API estática não tem limite: ${origin}${API_BASE}/… (documentação em ${origin}/api).`,
    }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(verdict.retryAfter) } });
  }
  const response = await mcp(request);
  if (verdict.remainingToday != null) response.headers.set('X-RateLimit-Remaining-Today', String(verdict.remainingToday));
  return response;
}

export { handle as GET, handle as POST, handle as DELETE };
