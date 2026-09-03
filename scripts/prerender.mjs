/**
 * Give every conversation a real page, every person talked about an index,
 * and crawlers the whole corpus.
 *
 * Runs after `vite build`, on top of dist/index.html, and writes:
 *
 *   dist/chat/<id>/index.html         the built app page, retitled for one
 *                                     conversation, with the profile and the
 *                                     messages as plain HTML and a one-line
 *                                     script that sets the hash so the app
 *                                     opens that chat
 *   dist/chat/<id>/<YYYY-MM>/         one page per month, for a conversation
 *                                     too big to show whole (Martha's 65k)
 *   dist/quem/<slug>/index.html       every mention of a person, by
 *                                     conversation, dated, pointing at the
 *                                     message — and dist/quem/ listing them
 *   dist/llms-full.txt                the site's text — about, profiles,
 *                                     highlights, people — with a pointer to
 *                                     each conversation's Markdown
 *   dist/sitemap.xml                  all of the above
 *
 * The router keeps its hash routes; nothing in the app changes. A crawler that
 * runs no JavaScript reads the article. A browser runs the app, which removes
 * the article as its first act.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { getContactProfile, VORCARO_PROFILE, SOURCES } from '../src/lib/profile-content.js';
import { SETTINGS_CONTENT } from '../src/lib/settings-content.js';
import { PEOPLE } from '../src/lib/people-content.js';
import { API_ROUTES, API_BASE, BULK_RELEASE, MCP_LIMITS, MCP_URL, slugOf } from '../src/lib/api-routes.js';
import { API_INTRO, API_SECTIONS, MCP_CLIENTS, MCP_TOOLS, API_EXAMPLES, MCP_EXAMPLES, API_CREDITS } from '../src/lib/api-content.js';
import { LEGAL_INTRO, LEGAL_SECTIONS, LEGAL_SHORT, LEGAL_CREDITS, LEGAL_VERSION } from '../src/lib/legal-content.js';

import {
  ROOT, SITE, REPO, TIMEZONE, UTC_OFFSET,
  loadEntries, loadMessages, sourceOf, contactOf, whoIs, createResolver, mentionsOf, createLocator, isPaged, PREVIEW_MESSAGES,
  urlsIn, linksToMarkdown, linksToText, linksToHtml, escapeHtml,
  longDate, phonePretty, messageText, citationOf, messageUrl,
} from './lib/corpus.mjs';

const DIST = join(ROOT, 'dist');
const templatePath = join(DIST, 'index.html');
if (!existsSync(templatePath)) {
  console.error('dist/index.html not found — run `vite build` first');
  process.exit(1);
}
const template = readFileSync(templatePath, 'utf-8');
const today = new Date().toISOString().slice(0, 10);
const entries = loadEntries();
const resolve = createResolver(entries);
const byId = new Map(entries.map(e => [e.id, e]));

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const longMonth = (ym) => monthFmt.format(new Date(`${ym}-15T12:00:00`));

/** 'YYYY-MM' → messages of that month, in order. */
function monthsOf(messages) {
  const months = new Map();
  for (const msg of messages) {
    const ym = msg.date.slice(0, 7);
    if (!months.has(ym)) months.set(ym, []);
    months.get(ym).push(msg);
  }
  return months;
}

const locate = createLocator(entries);
/** The static page (no fragment) where a message's anchor lives. */
const pathOf = (conversationId, msg) => locate(conversationId, msg)?.replace(/#.*$/, '') ?? null;

function reportDoc(source) {
  const doc = {
    '@type': 'DigitalDocument',
    name: 'IPJ-A nº 3298613/2026 — Polícia Federal',
    description: 'Informação de Polícia Judiciária de Análise sobre o iPhone apreendido de Daniel Vorcaro; sigilo levantado em 1º de setembro de 2026.',
    datePublished: '2026-08-27',
  };
  if (source.document_pages) doc.numberOfPages = source.document_pages;
  if (source.document_url) doc.url = source.document_url;
  if (source.document_sha256) {
    doc.identifier = { '@type': 'PropertyValue', propertyID: 'sha256', value: source.document_sha256 };
  }
  return doc;
}

// ── page skeleton ──────────────────────────────────────────────────────────

/**
 * The built app page, retitled and with an article in it.
 *
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.description
 * @param {string} o.path - canonical path, e.g. /chat/x
 * @param {object} o.jsonLd
 * @param {string} o.chat - the conversation the app opens; a #msg-N fragment
 *   on the way in becomes that message in the app
 * @param {string} o.hash - what the app opens when there is no fragment
 * @param {string} o.article - the HTML for crawlers
 * @param {string} [o.extraHead]
 */
function appPage({ title, description, path, jsonLd, chat, hash, article, extraHead = '' }) {
  const url = `${SITE}${path}`;
  const attr = escapeHtml;
  let html = template;
  const swap = (re, replacement) => {
    if (!re.test(html)) throw new Error(`template lost ${re}`);
    html = html.replace(re, replacement);
  };
  swap(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(description)}">`);
  swap(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(title)}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(description)}">`);
  swap(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  swap(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${attr(title)}">`);
  swap(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${attr(description)}">`);

  // The home page's structured data does not describe this page.
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  swap(/<\/head>/, `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n`
    + extraHead
    // A crawler follows #msg-N to the anchor; a browser gets the app at that message.
    + `<script>(function(){var m=location.hash.match(/^#msg-(\\d+)$/);if(m)location.replace('#/chat/${chat}/msg/'+m[1]);else if(!location.hash)location.replace('${hash}')})()</script>\n</head>`);

  swap(/\s*<noscript>/, `\n${article}\n<noscript>`);
  return html;
}

// ── conversation pages ─────────────────────────────────────────────────────

/** A description a search result can show, from the profile when there is one. */
function describe(entry, profile, who) {
  const first = profile?.sections?.[0]?.paragraphs?.[0]?.text;
  const fallback = `Conversa entre Daniel Vorcaro e ${who}: ${entry.total_messages} mensagens, de ${entry.date_range.start} a ${entry.date_range.end}, no MasterWhats.`;
  if (!first) return fallback;
  const text = linksToText(first).replace(/\s+/g, ' ').trim();
  if (text.length <= 155) return text;
  return `${text.slice(0, 155).replace(/\s+\S*$/, '')}…`;
}

function conversationLd(entry, who, description, { path, month, first, last, parent } = {}) {
  const url = `${SITE}${path}`;
  const source = sourceOf(entry);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Conversation',
    '@id': url,
    name: month ? `Daniel Vorcaro ↔ ${who} — ${longMonth(month)}` : `Daniel Vorcaro ↔ ${who}`,
    url,
    inLanguage: 'pt-BR',
    description,
    temporalCoverage: `${first}/${last}`,
    about: [
      { '@type': 'Person', name: 'Daniel Vorcaro' },
      { '@type': 'Person', name: who },
    ],
    isPartOf: parent ? { '@id': `${SITE}${parent}` } : { '@id': `${SITE}/#dataset` },
    encoding: [
      { '@type': 'MediaObject', encodingFormat: 'text/markdown', contentUrl: `${SITE}/export/masterwhats-${entry.id}.md` },
      { '@type': 'MediaObject', encodingFormat: 'application/json', contentUrl: `${SITE}/export/masterwhats-${entry.id}.json` },
    ],
    dateModified: today,
  };
  if (source.kind === 'police-report') data.isBasedOn = reportDoc(source);
  return data;
}

function messagesHtml(messages) {
  const out = [];
  let day = null;
  for (const msg of messages) {
    if (msg.date !== day) {
      day = msg.date;
      out.push(`<h3>${longDate(day)}</h3>`);
    }
    const cite = msg.source_page ? ` <small>(laudo p. ${msg.source_page}${msg.source_figure ? `, fig. ${msg.source_figure}` : ''})</small>` : '';
    out.push(`<p id="msg-${msg.id}"><time datetime="${msg.timestamp}${UTC_OFFSET}">${msg.time.slice(0, 5)}</time> <b>${escapeHtml(msg.sender)}</b>: ${escapeHtml(messageText(msg))}${cite}</p>`);
  }
  return out;
}

function provenanceHtml(entry) {
  const source = sourceOf(entry);
  const out = ['<h2>Proveniência</h2><dl>'];
  out.push(`<dt>Fonte</dt><dd>${escapeHtml(source.label)}</dd>`);
  if (source.document) out.push(`<dt>Documento</dt><dd>${source.document_url ? `<a href="${escapeHtml(source.document_url)}" rel="noopener">${escapeHtml(source.document)}</a>` : escapeHtml(source.document)}${source.document_pages ? `, ${source.document_pages} páginas` : ''} (no repositório; o site não serve o PDF)</dd>`);
  if (source.document_sha256) out.push(`<dt>sha256 do documento</dt><dd><code>${source.document_sha256}</code></dd>`);
  out.push(`<dt>Como chegou ao público</dt><dd>${escapeHtml(source.how)}</dd>`);
  if (entry.saved_as) out.push(`<dt>Contato salvo como</dt><dd>${escapeHtml(entry.saved_as)}</dd>`);
  if (entry.phone) out.push(`<dt>Telefone</dt><dd>${escapeHtml(phonePretty(entry.phone))}</dd>`);
  out.push(`<dt>Fuso dos horários</dt><dd>${TIMEZONE} (UTC${UTC_OFFSET})</dd>`);
  if (entry.note) out.push(`<dt>Observação</dt><dd>${escapeHtml(entry.note)}</dd>`);
  out.push('</dl>');
  return out;
}

function profileHtml(profile, who, entry, fromPath) {
  const out = [];
  const urls = [];
  if (!profile) return { html: out, urls };
  out.push(`<h2>Quem é ${escapeHtml(who)}</h2>`);
  for (const section of profile.sections || []) {
    if (section.title && section.title !== who && section.title !== `Sobre ${who}`) {
      out.push(`<h3>${escapeHtml(section.title)}</h3>`);
    }
    for (const p of section.paragraphs || []) {
      urls.push(...urlsIn(p.text));
      out.push(`<p>${linksToHtml(p.text, { resolve, context: entry.id, hrefFor: locate, fromPath })}</p>`);
    }
  }
  return { html: out, urls };
}

function sourcesHtml(urls) {
  const sources = [...new Set(urls)];
  if (!sources.length) return [];
  return ['<h2>Fontes</h2><ul>', ...sources.map(u => `<li><a href="${escapeHtml(u)}" rel="noopener">${escapeHtml(u)}</a></li>`), '</ul>'];
}

function conversationPage(entry, messages, profile, who) {
  const path = `/chat/${entry.id}`;
  const months = monthsOf(messages);
  const paged = isPaged(entry);
  const shown = paged ? messages.slice(0, PREVIEW_MESSAGES) : messages;
  const out = [];

  out.push(`<article id="prerender">`);
  out.push(`<h1>Daniel Vorcaro ↔ ${escapeHtml(who)}</h1>`);
  out.push(`<p>${entry.total_messages} mensagens, de ${entry.date_range.start} a ${entry.date_range.end}. `
    + `<a href="/#/chat/${entry.id}">Abrir no MasterWhats</a> · `
    + `<a href="/export/masterwhats-${entry.id}.md">Markdown completo</a> · `
    + `<a href="/export/masterwhats-${entry.id}.json">JSON</a></p>`);
  out.push(...provenanceHtml(entry));
  const { html: profileBlock, urls } = profileHtml(profile, who, entry, path);
  out.push(...profileBlock);

  if (paged) {
    out.push(`<h2>Meses</h2><p>A conversa inteira, um mês por página:</p><ul>`);
    for (const [ym, msgs] of months) {
      out.push(`<li><a href="${path}/${ym}">${longMonth(ym)}</a> — ${msgs.length} mensagens</li>`);
    }
    out.push('</ul>');
  }

  out.push(`<h2>Conversa${paged ? ` (primeiras ${shown.length} mensagens)` : ''}</h2>`);
  out.push(...messagesHtml(shown));
  if (paged) {
    out.push(`<p>As outras ${messages.length - shown.length} mensagens estão nas páginas por mês acima, no <a href="/export/masterwhats-${entry.id}.md">Markdown completo</a> e <a href="/#/chat/${entry.id}">no app</a>.</p>`);
  }
  out.push(...sourcesHtml(urls));
  out.push('</article>');

  const description = describe(entry, profile, who);
  return appPage({
    title: `Daniel Vorcaro ↔ ${who} — MasterWhats`,
    description,
    path,
    jsonLd: conversationLd(entry, who, description, { path, first: entry.date_range.start, last: entry.date_range.end }),
    chat: entry.id,
    hash: `#/chat/${entry.id}`,
    article: out.join('\n'),
  });
}

function monthPage(entry, who, ym, msgs, prevYm, nextYm) {
  const path = `/chat/${entry.id}/${ym}`;
  const parent = `/chat/${entry.id}`;
  const out = [];
  out.push(`<article id="prerender">`);
  out.push(`<h1>Daniel Vorcaro ↔ ${escapeHtml(who)} — ${longMonth(ym)}</h1>`);
  out.push(`<p>${msgs.length} mensagens em ${longMonth(ym)}, de ${msgs[0].date} a ${msgs.at(-1).date}. `
    + `<a href="${parent}">A conversa</a> · `
    + (prevYm ? `<a href="${parent}/${prevYm}" rel="prev">${longMonth(prevYm)}</a> · ` : '')
    + (nextYm ? `<a href="${parent}/${nextYm}" rel="next">${longMonth(nextYm)}</a> · ` : '')
    + `<a href="/#/chat/${entry.id}/msg/${msgs[0].id}">Abrir no MasterWhats</a> · `
    + `<a href="/export/masterwhats-${entry.id}-${ym}.md">Markdown deste mês</a> · `
    + `<a href="/export/masterwhats-${entry.id}.md">Markdown completo</a></p>`);
  out.push(...messagesHtml(msgs));
  out.push('</article>');

  const description = `Conversa entre Daniel Vorcaro e ${who} em ${longMonth(ym)}: ${msgs.length} mensagens, de ${msgs[0].date} a ${msgs.at(-1).date}.`;
  const links = (prevYm ? `<link rel="prev" href="${SITE}${parent}/${prevYm}">\n` : '')
    + (nextYm ? `<link rel="next" href="${SITE}${parent}/${nextYm}">\n` : '');
  return appPage({
    title: `Daniel Vorcaro ↔ ${who} — ${longMonth(ym)} — MasterWhats`,
    description,
    path,
    jsonLd: conversationLd(entry, who, description, { path, month: ym, first: msgs[0].date, last: msgs.at(-1).date, parent }),
    chat: entry.id,
    hash: `#/chat/${entry.id}/msg/${msgs[0].id}`,
    article: out.join('\n'),
    extraHead: links,
  });
}

// ── people ─────────────────────────────────────────────────────────────────

/** A page of its own: the app has no route for it, so it does not boot the app. */
function standalone({ title, description, path, jsonLd, body }) {
  const url = `${SITE}${path}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/assets/og-image.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
<style>
  body { margin: 0; background: #f0f2f5; color: #111b21; font: 16px/1.5 Roboto, "Helvetica Neue", Arial, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 20px 48px; }
  header { border-bottom: 1px solid #d1d7db; padding-bottom: 12px; margin-bottom: 20px; }
  header a { color: #1daa61; text-decoration: none; font-weight: 700; }
  h1 { font-size: 1.6rem; margin: 8px 0 4px; }
  h2 { font-size: 1.15rem; margin: 28px 0 8px; }
  p { margin: 8px 0; }
  .role, small, .how { color: #667781; }
  .msg { background: #fff; border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
  .msg time { color: #667781; font-size: .9rem; }
  .msg .links { font-size: .85rem; }
  a { color: #027eb5; }
  ul.people li { margin: 6px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 6px; border-bottom: 1px solid #d1d7db; }
  pre { position: relative; background: #fff; padding: 12px 12px 28px; border-radius: 8px; overflow-x: auto; font-size: 13.5px; }
  pre[data-lang]::after { content: attr(data-lang); position: absolute; bottom: 8px; left: 12px; font: 11px/1 ui-monospace, monospace; color: #667781; text-transform: uppercase; letter-spacing: .04em; }
  li { margin: 6px 0; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body>
<main>
<header><a href="/">MasterWhats</a> · <a href="/quem">Pessoas citadas</a></header>
${body}
<footer class="how" style="margin-top:40px;padding-top:16px;border-top:1px solid #d1d7db;font-size:13px">${linksToHtml(LEGAL_SHORT)}</footer>
</main>
</body>
</html>
`;
}

function mentionHtml(conversationId, msg, alias, primary) {
  const cite = msg.source_page ? ` <small>(laudo p. ${msg.source_page}${msg.source_figure ? `, fig. ${msg.source_figure}` : ''})</small>` : '';
  return `<div class="msg" id="m-${conversationId}-${msg.id}">`
    + `<time datetime="${msg.timestamp}${UTC_OFFSET}">${citationOf(msg).split(' · ')[0]}</time> · <b>${escapeHtml(msg.sender)}</b>${cite}${alias !== primary ? ` <small>· por «${escapeHtml(alias)}»</small>` : ''}<br>`
    + `${escapeHtml(messageText(msg))}<br>`
    + `<span class="links"><a href="${locate(conversationId, msg)}">ver na conversa</a> · <a href="${messageUrl(conversationId, msg)}">no app</a> · msg ${msg.id}</span>`
    + `</div>`;
}

function personPage(person, mentions) {
  const path = `/quem/${person.slug}`;
  const total = [...mentions.values()].reduce((n, v) => n + v.length, 0);
  const convs = [...mentions.keys()].map(id => byId.get(id));
  const primary = person.aliases[0].match;
  const byAlias = new Map();
  for (const hits of mentions.values()) for (const { alias } of hits) byAlias.set(alias, (byAlias.get(alias) || 0) + 1);
  // In the order the aliases are declared: the name first, the nicknames after.
  const breakdown = person.aliases.filter(a => byAlias.has(a.match)).map(a => `${byAlias.get(a.match)} por «${a.match}»`).join(', ');
  const description = `${person.name}, ${person.role}: ${total} menções em ${convs.length} conversa${convs.length === 1 ? '' : 's'} dos celulares de Daniel Vorcaro — ${convs.map(contactOf).join(', ')}.`;
  const body = [];
  body.push(`<h1>${escapeHtml(person.name)}</h1>`);
  body.push(`<p class="role">${escapeHtml(person.role)}${person.profile ? ` · <a href="/chat/${person.profile}">perfil e conversa com Vorcaro</a>` : ''}</p>`);
  body.push(`<p>${total} menções em ${convs.length} conversa${convs.length === 1 ? '' : 's'} — ${breakdown}. Cada uma linka a mensagem na conversa e no app; as do relatório da PF citam página e figura do laudo.</p>`);
  body.push(`<p class="how">Como as mensagens se referem a essa pessoa: ${person.aliases.map(a => `<code>${escapeHtml(a.match)}</code>${a.only ? ` (só em ${a.only.map(id => contactOf(byId.get(id))).join(', ')})` : ''}`).join(', ')}. Uma menção achada por um apelido que não é o nome vem marcada.</p>`);
  for (const [id, hits] of mentions) {
    const entry = byId.get(id);
    body.push(`<h2><a href="/chat/${id}">Daniel Vorcaro ↔ ${escapeHtml(contactOf(entry))}</a> — ${hits.length} men${hits.length === 1 ? 'ção' : 'ções'}</h2>`);
    for (const { msg, alias } of hits) body.push(mentionHtml(id, msg, alias, primary));
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE}${path}`,
    url: `${SITE}${path}`,
    name: `${person.name} nas conversas de Daniel Vorcaro`,
    description,
    inLanguage: 'pt-BR',
    about: { '@type': 'Person', name: person.name, jobTitle: person.role },
    isPartOf: { '@id': `${SITE}/#dataset` },
    dateModified: today,
  };
  return standalone({ title: `${person.name} nas conversas de Daniel Vorcaro — MasterWhats`, description, path, jsonLd, body: body.join('\n') });
}

function peopleIndex(people) {
  const body = ['<h1>Pessoas citadas</h1>', '<p>Quem aparece nas conversas de Daniel Vorcaro, com toda menção datada e apontando para a mensagem.</p>', '<ul class="people">'];
  for (const { person, mentions } of people) {
    const total = [...mentions.values()].reduce((n, v) => n + v.length, 0);
    body.push(`<li><a href="/quem/${person.slug}">${escapeHtml(person.name)}</a> — ${escapeHtml(person.role)} · ${total} menções em ${mentions.size} conversa${mentions.size === 1 ? '' : 's'}</li>`);
  }
  body.push('</ul>');
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${SITE}/quem`, url: `${SITE}/quem`,
    name: 'Pessoas citadas nas conversas de Daniel Vorcaro', inLanguage: 'pt-BR', isPartOf: { '@id': `${SITE}/#dataset` }, dateModified: today,
  };
  return standalone({ title: 'Pessoas citadas — MasterWhats', description: 'Quem aparece nas conversas de Daniel Vorcaro, com toda menção datada e apontando para a mensagem.', path: '/quem', jsonLd, body: body.join('\n') });
}

// ── /api: the same page, for whoever arrives without the app ──────────────

function apiPage() {
  const LANG = { shell: 'bash', json: 'JSON', python: 'Python', r: 'R', text: 'txt' };
  const body = [];
  body.push(`<h1>${escapeHtml(API_INTRO.title)}</h1>`, `<p class="role">${escapeHtml(API_INTRO.sub)}</p>`);
  body.push(`<p><b>MCP:</b> <code>${MCP_URL}</code></p>`);
  for (const s of API_SECTIONS) {
    body.push(`<h2 id="api-${slugOf(s.title)}">${escapeHtml(s.title)}</h2>`);
    for (const p of s.paragraphs) body.push(`<p>${linksToHtml(p.text)}</p>`);
  }
  body.push('<h2 id="api-a-api-estatica">A API estática</h2>', `<p>Base: <code>${SITE}${API_BASE}</code>. Cada rota é um arquivo na CDN; a resposta é sempre JSON.</p>`, '<table><thead><tr><th>Rota</th><th>O que devolve</th><th>Exemplo</th></tr></thead><tbody>');
  for (const r of API_ROUTES) {
    body.push(`<tr><td><code>${escapeHtml(r.route)}</code></td><td>${escapeHtml(r.description)}</td><td><a href="${API_BASE}${escapeHtml(r.example)}">${escapeHtml(r.example)}</a></td></tr>`);
  }
  body.push('</tbody></table>');
  body.push('<h2 id="api-o-mcp">O MCP</h2>', '<ul>', ...MCP_TOOLS.map(([t, w]) => `<li><code>${t}</code> — ${escapeHtml(w)}</li>`), '</ul>');
  body.push(`<p><b>Limites por cliente:</b> ${MCP_LIMITS.perMinute}/min · ${MCP_LIMITS.perDay}/dia. Teto do site: ${MCP_LIMITS.globalPerDay.toLocaleString('pt-BR')}/dia. Ao passar: 429 com Retry-After.</p>`);
  for (const c of MCP_CLIENTS) {
    body.push(`<h3 id="api-${slugOf('Como usar no ' + c.name)}">Como usar no ${escapeHtml(c.name)}</h3>`, '<ol>', ...c.steps.map(s => `<li>${linksToHtml(s)}</li>`), '</ol>', `<pre data-lang="${LANG[c.lang] || 'txt'}"><code>${escapeHtml(c.code)}</code></pre>`);
  }
  body.push('<h2 id="api-exemplos-com-a-api">Exemplos com a API</h2>');
  for (const ex of API_EXAMPLES) body.push(`<p><b>${escapeHtml(ex.title)}</b></p>`, `<pre data-lang="${LANG[ex.lang] || 'txt'}"><code>${escapeHtml(ex.code)}</code></pre>`);
  body.push('<h2 id="api-exemplos-com-o-mcp">Exemplos com o MCP</h2>', '<p>Depois de conectar, pergunte. O modelo busca, abre a mensagem e cita data, página e figura do laudo.</p>', '<ul>', ...MCP_EXAMPLES.map(q => `<li>${escapeHtml(q)}</li>`), '</ul>');
  body.push(`<p class="how">${linksToHtml(API_CREDITS)}</p>`);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebAPI', '@id': `${SITE}/api`, url: `${SITE}/api`,
    name: 'MasterWhats API e MCP', description: API_INTRO.sub, documentation: `${SITE}/api`,
    provider: { '@type': 'Person', name: 'Rafael Bressan' }, isPartOf: { '@id': `${SITE}/#dataset` }, dateModified: today,
  };
  return standalone({ title: 'API/MCP — MasterWhats', description: `${API_INTRO.sub}. ${API_ROUTES.length} rotas estáticas sem limite e um servidor MCP com ${MCP_LIMITS.perDay} chamadas por dia por cliente.`, path: '/api', jsonLd, body: body.join('\n') });
}

/** The legal notice as a page of its own. */
function legalPage() {
  const body = [`<h1>${escapeHtml(LEGAL_INTRO.title)}</h1>`, `<p class="role">${escapeHtml(LEGAL_INTRO.sub)}</p>`];
  for (const s of LEGAL_SECTIONS) {
    body.push(`<h2 id="legal-${slugOf(s.title)}">${escapeHtml(s.title)}</h2>`);
    for (const p of s.paragraphs) body.push(`<p>${linksToHtml(p.text)}</p>`);
  }
  body.push(`<p class="how">${linksToHtml(LEGAL_CREDITS)}</p>`);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${SITE}/legal`, url: `${SITE}/legal`,
    name: 'Aviso legal — MasterWhats', description: linksToText(LEGAL_SHORT).slice(0, 300), inLanguage: 'pt-BR',
    isPartOf: { '@id': `${SITE}/#dataset` }, dateModified: LEGAL_VERSION,
  };
  return standalone({ title: 'Aviso legal — MasterWhats', description: linksToText(LEGAL_SHORT).slice(0, 160), path: '/legal', jsonLd, body: body.join('\n') });
}

/** The section llms.txt gets at build time, so it lists what the table lists. */
function llmsApiSection() {
  return [
    '', '## API e MCP',
    `Os mesmos arquivos do site com nome estável, na CDN, sem chave e sem limite. Documentação: ${SITE}/api`,
    ...API_ROUTES.map(r => `- ${SITE}${API_BASE}${r.route} — ${r.description} Ex.: ${SITE}${API_BASE}${r.example}`),
    `- MCP (Streamable HTTP, sem auth): ${MCP_URL} — tools ${MCP_TOOLS.map(([t]) => t).join(', ')}; ${MCP_LIMITS.perMinute}/min e ${MCP_LIMITS.perDay}/dia por cliente. Para volume, use as rotas acima.`,
    '', '## Aviso legal', linksToText(LEGAL_SHORT), `Texto completo: ${SITE}/legal`,
    '',
  ].join('\n');
}

// ── llms-full.txt ──────────────────────────────────────────────────────────

function profileParagraphs(profile, context) {
  const out = [];
  for (const section of profile?.sections || []) {
    if (section.title) out.push(`**${section.title}**`, '');
    for (const p of section.paragraphs || []) out.push(linksToMarkdown(p.text, { resolve, context, hrefFor: locate }), '');
  }
  return out;
}

function llmsFull(built, people) {
  const total = built.reduce((n, b) => n + b.entry.total_messages, 0);
  const about = SETTINGS_CONTENT.sections.find(s => s.title === 'Sobre o Projeto');
  const rest = SETTINGS_CONTENT.sections.filter(s => s !== about);
  const out = [
    '# MasterWhats — conteúdo completo', '',
    `> Tudo que o site diz, em texto. Cada citação traz ⟨data hora · laudo p., fig.⟩ e linka a mensagem na página estática (${SITE}/chat/<id>#msg-<n>, ou a página do mês na conversa com Martha Graeff); a mesma página abre o app nessa mensagem para quem tem JavaScript. O mesmo n aparece como "msg n" no Markdown de cada conversa. ${built.length} conversas, ${total} mensagens, de ${built.at(-1)?.entry.date_range.start ?? ''} a ${built[0]?.entry.date_range.end ?? ''}. Gerado em ${today}. Código e dados: ${REPO}.`, '',
    '## Sobre o projeto', '',
    ...(about?.paragraphs || []).map(p => linksToMarkdown(p.text, { resolve, hrefFor: locate }) + '\n'),
    '## Quem é Daniel Vorcaro', '',
    ...profileParagraphs(VORCARO_PROFILE, 'martha-graeff'),
    `## Conversas (${built.length})`, '',
  ];
  for (const { entry, who, profile, months } of built) {
    const source = sourceOf(entry);
    out.push(`### ${who} — ${entry.total_messages} mensagens, ${entry.date_range.start} a ${entry.date_range.end}`, '');
    out.push(`- Página: ${SITE}/chat/${entry.id}`);
    if (months) out.push(`- Um mês por página: ${[...months.keys()].map(ym => `${SITE}/chat/${entry.id}/${ym}`).join(' · ')}`, `- Markdown por mês (troque o mês): ${SITE}/export/masterwhats-${entry.id}-${[...months.keys()][0]}.md`);
    out.push(`- Conversa completa em Markdown: ${SITE}/export/masterwhats-${entry.id}.md · JSON: ${SITE}/export/masterwhats-${entry.id}.json`);
    out.push(`- Fonte: ${source.label}`);
    if (entry.saved_as) out.push(`- Salvo no celular como: ${entry.saved_as}`);
    if (entry.note) out.push(`- Observação: ${entry.note}`);
    out.push('');
    out.push(...profileParagraphs(profile, entry.id));
  }
  out.push(`## Pessoas citadas (${people.length})`, '', `Índice em ${SITE}/quem — cada página lista toda menção, por conversa, datada e apontando para a mensagem.`, '');
  for (const { person, mentions } of people) {
    const per = [...mentions].map(([id, hits]) => `${contactOf(byId.get(id))} (${hits.length})`).join(', ');
    out.push(`- [${person.name}](${SITE}/quem/${person.slug}) — ${person.role}. Citado em: ${per}.`);
  }
  out.push('');
  for (const section of rest) {
    out.push(`## ${section.title}`, '');
    for (const p of section.paragraphs) out.push(linksToMarkdown(p.text, { resolve, hrefFor: locate }), '');
  }
  const report = entries.map(e => e.source_document).find(Boolean);
  if (report) {
    out.push('## Documento-fonte do relatório da PF', '',
      `- Arquivo: ${report.file} — ${report.pages} páginas`,
      `- sha256: ${report.sha256}`,
      `- Onde obter: ${report.url} (página) ou ${report.download} (os bytes) — o site não serve o PDF; o caminho acima é do repositório`, '');
  }
  out.push('## Fontes gerais', '', ...SOURCES.map(s => `- [${s.label}](${s.url})`), '');
  out.push('## Export', '',
    'Comece pelo arquivo de uma conversa (7 a 40 KB, links acima); os consolidados são grandes e raramente necessários.',
    `- Zip com tudo: ${BULK_RELEASE}/masterwhats-export.zip (3 MB)`,
    `- Tudo em Markdown: ${BULK_RELEASE}/masterwhats.md (3 MB)`,
    `- Tudo em JSON: ${BULK_RELEASE}/masterwhats.json (14 MB)`, '',
    `Os consolidados são publicados como release no GitHub, com banda ilimitada; o site serve só os arquivos por conversa.`, '');
  return out.join('\n');
}

// ── sitemap ────────────────────────────────────────────────────────────────

function sitemap(built, people) {
  const url = (loc, priority, changefreq = 'weekly') =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  const rows = [url(`${SITE}/`, '1.0')];
  for (const { entry, months } of built) {
    const headline = entry.id === 'alexandre-de-moraes' || entry.id === 'martha-graeff';
    rows.push(url(`${SITE}/chat/${entry.id}`, headline ? '0.9' : '0.8'));
    if (months) for (const ym of months.keys()) rows.push(url(`${SITE}/chat/${entry.id}/${ym}`, '0.6', 'monthly'));
  }
  rows.push(url(`${SITE}/quem`, '0.8'));
  rows.push(url(`${SITE}/api`, '0.7'));
  rows.push(url(`${SITE}/legal`, '0.5', 'monthly'));
  for (const { person } of people) rows.push(url(`${SITE}/quem/${person.slug}`, '0.7'));
  rows.push(url(`${SITE}/llms.txt`, '0.7'));
  rows.push(url(`${SITE}/llms-full.txt`, '0.7'));
  rows.push(url(`${SITE}/export/masterwhats.md`, '0.6', 'monthly'));
  for (const { entry } of built) rows.push(url(`${SITE}/export/masterwhats-${entry.id}.md`, '0.5', 'monthly'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

// ── run ────────────────────────────────────────────────────────────────────

const built = [];
for (const entry of entries) {
  const messages = resolve.messagesOf(entry.id);
  const profile = getContactProfile(entry.id);
  const who = whoIs(entry, profile);
  const dir = join(DIST, 'chat', entry.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), conversationPage(entry, messages, profile, who));

  let months = null;
  if (isPaged(entry)) {
    months = monthsOf(messages);
    const yms = [...months.keys()];
    yms.forEach((ym, i) => {
      mkdirSync(join(dir, ym), { recursive: true });
      writeFileSync(join(dir, ym, 'index.html'), monthPage(entry, who, ym, months.get(ym), yms[i - 1], yms[i + 1]));
    });
  }
  built.push({ entry, who, profile, months });
  console.log(`chat/${entry.id}/ — ${who}${months ? ` (${months.size} meses)` : ''}`);
}

const people = [];
for (const person of PEOPLE) {
  const mentions = mentionsOf(person, entries, resolve.messagesOf);
  if (!mentions.size) {
    console.error(`pessoa sem menção nenhuma: ${person.slug} — confira os apelidos em people-content.js`);
    process.exit(1);
  }
  const dir = join(DIST, 'quem', person.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), personPage(person, mentions));
  people.push({ person, mentions });
  console.log(`quem/${person.slug}/ — ${[...mentions.values()].reduce((n, v) => n + v.length, 0)} menções`);
}
writeFileSync(join(DIST, 'quem', 'index.html'), peopleIndex(people));
// The same index as data, for the API and the MCP.
writeFileSync(join(DIST, 'data', 'people.json'), JSON.stringify({ people: people.map(({ person, mentions }) => ({
  slug: person.slug, name: person.name, role: person.role, page: `${SITE}/quem/${person.slug}`,
  total: [...mentions.values()].reduce((n, v) => n + v.length, 0),
  conversations: [...mentions].map(([id, hits]) => ({
    id, contact: contactOf(byId.get(id)),
    mentions: hits.map(({ msg, alias }) => ({ id: msg.id, date: msg.date, time: msg.time, sender: msg.sender, content: msg.content, alias,
      ...(msg.source_page ? { laudo: { page: msg.source_page, figure: msg.source_figure } } : {}),
      link: `${SITE}/#/chat/${id}/msg/${msg.id}`, page: `${SITE}${locate(id, msg)}` })),
  })),
})) }, null, 1));

// The sizes the index quotes decide whether a crawler downloads a file. They
// are stamped from the files themselves rather than typed and forgotten.
const mb = (name) => `${(statSync(join(ROOT, 'release', name)).size / 1e6).toFixed(1)} MB`;
const SIZES = { 'masterwhats.md': mb('masterwhats.md'), 'masterwhats.json': mb('masterwhats.json'), 'masterwhats-export.zip': mb('masterwhats-export.zip') };
const stampSizes = (text) => text.replace(/(masterwhats(?:-export)?\.(?:md|json|zip)) \([\d.,]+ MB\)/g, (m, name) => `${name} (${SIZES[name] || m.slice(name.length + 2, -1)})`);
writeFileSync(join(DIST, 'llms.txt'), stampSizes(readFileSync(join(DIST, 'llms.txt'), 'utf-8')) + llmsApiSection());
mkdirSync(join(DIST, 'api'), { recursive: true });
writeFileSync(join(DIST, 'api', 'index.html'), apiPage());
mkdirSync(join(DIST, 'legal'), { recursive: true });
writeFileSync(join(DIST, 'legal', 'index.html'), legalPage());
writeFileSync(join(DIST, 'llms-full.txt'), stampSizes(llmsFull(built, people)));
writeFileSync(join(DIST, 'sitemap.xml'), sitemap(built, people));
console.log(`\nDone! ${built.length} conversations, ${people.length} people, llms-full.txt, sitemap.xml → ${DIST}`);
