/**
 * The site's own settings, in one place: its public address, who made it,
 * where the code is, and the legal channel.
 *
 * ── Address ──
 *
 * Canonical links, Open Graph, the JSON-LD, the sitemap, robots.txt, llms.txt,
 * every citation the build writes and the address printed under a screenshot
 * all read this value. Change the domain here (or with SITE_URL) and nothing
 * else.
 *
 * Resolution, first match wins:
 *   1. SITE_URL in the build environment;
 *   2. on Vercel, VERCEL_PROJECT_PRODUCTION_URL — the project's production
 *      domain, which Vercel sets on every build, previews included;
 *   3. DEFAULT_SITE_URL.
 *
 * In the browser the value was fixed at build time (vite.config.js defines
 * __SITE_URL__); in Node scripts it is read from the environment directly.
 */

export const DEFAULT_SITE_URL = 'https://www.masterwhats.com.br';

/** The address for a given environment, without a trailing slash. */
export function siteUrlFrom(env = {}) {
  let url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : DEFAULT_SITE_URL);
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

/* global __SITE_URL__, process */
export const SITE_URL = typeof __SITE_URL__ !== 'undefined'
  ? __SITE_URL__
  : siteUrlFrom(typeof process !== 'undefined' ? process.env : {});

/** "www.masterwhats.com.br" — the address as a person types it. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** The placeholder index.html and public/*.txt carry; the build swaps it. */
export const SITE_URL_PLACEHOLDER = '%SITE_URL%';

// ── Author, code, legal channel ──
// The "Sobre" drawer and the contact profiles read these; links use the
// {text}[url] format of profile-content.js.

export const AUTHOR = { name: 'Rafael Bressan', url: 'https://linkedin.com/in/rafaelbressan' };
export const REPO_URL = 'https://github.com/rafaelbressan/masterzap';

/**
 * A credits link with the site's UTM tags; `content` says where the click was
 * (app, noscript, llms). The destinations' own reports may not show them, but
 * the links say where the visit came from. The plain URLs stay for identity
 * (JSON-LD) and for links to the data.
 */
export function withUtm(url, content) {
  const tagged = new URL(url); // keeps a #fragment last, replaces repeated keys
  tagged.searchParams.set('utm_source', 'masterwhats');
  tagged.searchParams.set('utm_medium', 'referral');
  tagged.searchParams.set('utm_campaign', 'creditos');
  if (content) tagged.searchParams.set('utm_content', content);
  return tagged.href;
}

/** What the site's material is, and that it takes no side. */
export const DISCLAIMER = 'As informações aqui compiladas são de domínio público, extraídas de reportagens jornalísticas, de fontes abertas e de documentos cujo sigilo foi levantado judicialmente. '
  + 'Este projeto não tem vinculação com nenhuma das partes envolvidas.';

/** The line at the foot of the "Sobre" drawer and of every profile. */
export const CREDITS = `Projeto feito por {${AUTHOR.name}}[${withUtm(AUTHOR.url, 'app')}] com Claude Code. {Código-fonte no GitHub}[${withUtm(REPO_URL, 'app')}]. ${DISCLAIMER}`;

/**
 * Where a reader can chip in: a PIX key and a Bitcoin address (Lightning,
 * name@wallet, or on-chain). Empty, the "Apoie o MasterWhats" block in the
 * "Sobre" does not show. A phone PIX key goes as +55…: 11 bare digits read as
 * a CPF in some bank apps.
 */
export const DONATION = {
  pix: '+5584996961915',
  bitcoin: 'fullsearch03@walletofsatoshi.com',
};

/**
 * Where extrajudicial notices, court orders, official letters and summons
 * about the site's content are received, and how fast they are answered.
 * The "Sobre" text around them is in src/lib/settings-content.js.
 */
export const LEGAL_CHANNEL = {
  formUrl: 'https://app.pipefy.com/public/form/Z9mvDoph',
  deadlines: [
    'Confirmação de recebimento: em até 24 horas',
    'Análise jurídica inicial: em até 48 horas',
    'Resposta formal ou cumprimento da medida determinada: em até 72 horas (ou no prazo estabelecido na própria decisão, caso seja inferior)',
  ],
};

/** For text or an attribute in HTML (src/lib/utils.js's needs a DOM; the build has none). */
const escapeHtmlText = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A JSON string for inside a <script>: no "</script>" can close it. */
const jsonInScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * The author and credits links in the static files (index.html, which the
 * pre-rendered pages copy, and public/llms.txt), filled in by the build next
 * to %SITE_URL% (vite.config.js).
 *
 * - `html`: the values escaped for HTML text and attributes; the JSON-LD
 *   takes its own, "%AUTHOR_NAME_JSON%" and "%AUTHOR_URL_JSON%" — quotes
 *   included, so the source is valid JSON — replaced by JSON strings.
 * - `where`: the utm_content of the credits links.
 */
export function authorPlaceholders({ html = false, where = html ? 'noscript' : 'llms' } = {}) {
  const value = (text) => (html ? escapeHtmlText(text) : text);
  return {
    '"%AUTHOR_NAME_JSON%"': jsonInScript(AUTHOR.name),
    '"%AUTHOR_URL_JSON%"': jsonInScript(AUTHOR.url),
    '%AUTHOR_NAME%': value(AUTHOR.name),
    '%AUTHOR_URL%': value(AUTHOR.url),
    '%AUTHOR_LINK%': value(withUtm(AUTHOR.url, where)),
    '%REPO_LINK%': value(withUtm(REPO_URL, where)),
  };
}
