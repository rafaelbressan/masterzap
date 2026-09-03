/**
 * What the build scripts share: where the conversations are, how to read them
 * and how the site's content links turn into plain Markdown or HTML.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = join(ROOT, 'data');
export const PUBLIC_DATA = join(ROOT, 'public/data');

export const SITE = 'https://www.masterwhats.com.br';
export const REPO = 'https://github.com/rafaelbressan/masterzap';

// The phones were seized in Brazil and every timestamp in the sources is local
// wall-clock time. Brazil has had no daylight saving since 2019, so from the
// first message (December 2023) on the offset is a constant.
export const TIMEZONE = 'America/Sao_Paulo';
export const UTC_OFFSET = '-03:00';


/** The conversations as the site lists them, newest first. */
export function loadEntries() {
  return JSON.parse(readFileSync(join(PUBLIC_DATA, 'conversations.json'), 'utf-8')).conversations;
}

/** The Martha export is the one source without a per-conversation file. */
export function loadMessages(entry) {
  const fromReport = join(DATA_DIR, 'conversations', `${entry.id}.json`);
  if (existsSync(fromReport)) {
    return JSON.parse(readFileSync(fromReport, 'utf-8')).messages;
  }
  return JSON.parse(readFileSync(join(DATA_DIR, 'messages.json'), 'utf-8')).messages;
}

/**
 * Where a conversation's text came from, in the terms the reader will need.
 * The report's file, hash and page count come from conversations.json, where
 * split_data.py computed them once.
 */
export function sourceOf(entry) {
  if (entry.source?.startsWith('IPJ-A')) {
    const doc = entry.source_document || {};
    return {
      kind: 'police-report',
      label: entry.source,
      document: doc.file || null,
      document_url: doc.url || null,
      document_download: doc.download || null,
      document_sha256: doc.sha256 || null,
      document_pages: doc.pages || null,
      made_public: '2026-09-01',
      how: 'Transcrição manual das imagens do laudo; cada mensagem cita a página e a figura de origem.',
    };
  }
  return {
    kind: 'leak',
    label: 'Vazamento das conversas com Martha Graeff, março de 2026',
    document: null,
    document_sha256: null,
    made_public: '2026-03',
    how: 'Export de WhatsApp extraído do celular apreendido, vazado para a imprensa.',
  };
}

export const contactOf = (entry) => entry.participants.find(p => p !== 'DV') || entry.participants[0];

/** The person, as opposed to the name the phone saved them under. */
export const whoIs = (entry, profile) =>
  profile?.name || profile?.sections?.[0]?.title?.replace(/^Sobre /, '') || contactOf(entry);

export const urlsIn = (text) => [...text.matchAll(/\{[^}]+\}\[(https?:\/\/[^\]]+)\]/g)].map(m => m[1]);

export const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── highlights that point at a message ─────────────────────────────────────

/** The app's search normalisation (src/lib/search.js), mirrored. */
export const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Turn the site's `action:search` links into a message each.
 *
 * In the app a highlight is a search: tap it and the conversation scrolls to
 * the first message that matches. Outside the app that search has nobody to
 * run it, so it is run here, once, at build time, and the result — the
 * message, its date, its page in the report — travels with the quote.
 *
 * A term that matches nothing is a broken highlight, and the build fails on
 * it: profile-content.js already promises that every term appears in its
 * conversation, and a silent miss would leave a quote pointing nowhere.
 */
export function createResolver(entries) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const cache = new Map();
  const messagesOf = (id) => {
    if (!cache.has(id)) {
      const entry = byId.get(id);
      if (!entry) throw new Error(`destaque aponta para conversa inexistente: ${id}`);
      cache.set(id, loadMessages(entry));
    }
    return cache.get(id);
  };
  function resolve(conversationId, term) {
    const needle = normalize(term);
    const msg = messagesOf(conversationId).find(m => normalize(m.content || '').includes(needle));
    if (!msg) throw new Error(`destaque sem mensagem: ${conversationId} "${term}"`);
    return { conversationId, msg };
  }
  resolve.messagesOf = messagesOf;
  return resolve;
}

/**
 * Every message that names a person, by conversation.
 *
 * @returns {Map<string, object[]>} conversation id → messages, in order; only
 *   conversations with at least one mention
 */
export function mentionsOf(person, entries, messagesOf) {
  const rules = person.aliases.map(a => ({
    re: new RegExp(`(^|[^a-z0-9])${normalize(a.match)}([^a-z0-9]|$)`),
    only: a.only ? new Set(a.only) : null,
    unless: a.unless ? new RegExp(a.unless) : null,
  }));
  const found = new Map();
  for (const entry of entries) {
    const hits = [];
    for (const m of messagesOf(entry.id)) {
      const text = normalize(m.content || '');
      const rule = rules.find(r => (!r.only || r.only.has(entry.id)) && r.re.test(text) && !(r.unless && r.unless.test(text)));
      // Each hit remembers the alias that found it, so a page can say
      // "8 by «gonet», 5 by «paulo»" instead of one inferred total.
      if (rule) hits.push({ msg: m, alias: person.aliases[rules.indexOf(rule)].match });
    }
    if (hits.length) found.set(entry.id, hits);
  }
  return found;
}

const brDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** "15/11/2025 18:22 · laudo p. 109, fig. 108" — what a quote needs to be checked. */
export function citationOf(msg) {
  const parts = [`${brDate(msg.date)} ${msg.time.slice(0, 5)}`];
  if (msg.source_page) parts.push(`laudo p. ${msg.source_page}${msg.source_figure ? `, fig. ${msg.source_figure}` : ''}`);
  return parts.join(' · ');
}

/**
 * A conversation with more messages than this gets one static page per month;
 * its main page shows the first ones and an index of the months.
 */
export const PREVIEW_MESSAGES = 200;
export const isPaged = (entry) => entry.total_messages > PREVIEW_MESSAGES;

/**
 * Where a message's anchor lives in the static site: /chat/<id>, or the month
 * page of a conversation too big for one. Returns a path, or null for a
 * conversation the site does not have.
 */
export function createLocator(entries) {
  const byId = new Map(entries.map(e => [e.id, e]));
  return (conversationId, msg) => {
    const entry = byId.get(conversationId);
    if (!entry) return null;
    return isPaged(entry) ? `/chat/${conversationId}/${msg.date.slice(0, 7)}#msg-${msg.id}` : `/chat/${conversationId}#msg-${msg.id}`;
  };
}

export const messageUrl = (conversationId, msg) => `${SITE}/#/chat/${conversationId}/msg/${msg.id}`;

/**
 * Parse one of the site's links into what it points at.
 *
 * `context` is the conversation an `action:search:` without an `@` means —
 * the one open in the app when the profile is shown.
 */
function targetOf(url, { resolve, context } = {}) {
  if (!url.startsWith('action:')) return { kind: 'external', url };
  const search = url.match(/^action:search(?:@([^:]+))?:(.+)$/);
  if (search) {
    const conversationId = search[1] || context;
    if (!resolve) return { kind: 'text' };
    if (!conversationId) throw new Error(`destaque sem conversa de contexto: ${url}`);
    return { kind: 'message', ...resolve(conversationId, search[2]) };
  }
  const contact = url.match(/^action:contact:(.+)$/);
  if (contact) return { kind: 'conversation', conversationId: contact[1] };
  if (url === 'action:contact-martha') return { kind: 'conversation', conversationId: 'martha-graeff' };
  return { kind: 'text' };
}

/**
 * The site's {text}[url] links, rendered for a medium that is not the app.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {'md'|'html'|'text'} [opts.mode]
 * @param {function} [opts.resolve] - from createResolver; without it,
 *   highlights come out as plain text
 * @param {string} [opts.context] - conversation for `action:search:` links
 * @param {string} [opts.samePage] - in html, messages of this conversation
 *   are linked by anchor rather than by site URL
 * @param {function} [opts.hrefFor] - where a message's anchor lives in the
 *   static site: (conversationId, msg) => path, or null to fall back to the
 *   app's hash route. A path is made absolute in Markdown.
 * @param {string} [opts.fromPath] - the page being rendered; a link to an
 *   anchor on that same page is written as just the fragment
 */
export function renderLinks(text, opts = {}) {
  const mode = opts.mode || 'md';
  const esc = mode === 'html' ? escapeHtml : (s) => s;
  const link = (label, href) => (mode === 'md' ? `[${label}](${href})`
    : mode === 'html' ? `<a href="${escapeHtml(href)}"${href.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(label)}</a>`
    : label);
  const cite = (msg) => (mode === 'html' ? ` <small>⟨${escapeHtml(citationOf(msg))}⟩</small>` : ` ⟨${citationOf(msg)}⟩`);

  let out = '';
  let last = 0;
  for (const m of text.matchAll(/\{([^}]+)\}\[([^\]]+)\]/g)) {
    out += esc(text.slice(last, m.index));
    const [, label, url] = m;
    const target = targetOf(url, opts);
    switch (target.kind) {
      case 'external':
        out += link(label, target.url); break;
      case 'message': {
        let placed = opts.hrefFor?.(target.conversationId, target.msg) || null;
        if (placed && opts.fromPath && placed.startsWith(`${opts.fromPath}#`)) placed = placed.slice(opts.fromPath.length);
        if (placed && mode === 'md' && placed.startsWith('/')) placed = `${SITE}${placed}`;
        const href = placed || ((mode === 'html' && opts.samePage === target.conversationId)
          ? `#msg-${target.msg.id}` : messageUrl(target.conversationId, target.msg));
        out += link(label, href) + cite(target.msg); break;
      }
      case 'conversation':
        out += link(label, mode === 'html' ? `/chat/${target.conversationId}` : `${SITE}/chat/${target.conversationId}`); break;
      default:
        out += esc(label);
    }
    last = m.index + m[0].length;
  }
  out += esc(text.slice(last));
  // `code` spans: monospace in html, gone in plain text, untouched in Markdown.
  if (mode === 'html') out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  if (mode === 'text') out = out.replace(/`([^`]+)`/g, '$1');
  return out;
}

/** Thin names for the common cases. */
export const linksToMarkdown = (text, opts) => renderLinks(text, { ...opts, mode: 'md' });
export const linksToHtml = (text, opts) => renderLinks(text, { ...opts, mode: 'html' });
export const linksToText = (text) => renderLinks(text, { mode: 'text' });

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
export const longDate = (iso) => dateFmt.format(new Date(`${iso}T12:00:00`));

export const phonePretty = (p) => (p && /^55\d{10,11}$/.test(p)
  ? `+55 ${p.slice(2, 4)} ${p.slice(4, -4)}-${p.slice(-4)}`
  : p || null);

export const MEDIA = {
  image: 'Foto', video: 'Vídeo', audio: 'Áudio', sticker: 'Sticker',
  document: 'Documento', call: 'Chamada', deleted: 'Mensagem apagada', system: 'Sistema',
};

/** One message as plain text, media and system events in brackets. */
export function messageText(msg) {
  const text = (msg.content || '').trim();
  switch (msg.type) {
    case 'text': return text;
    case 'document': return `[Documento${msg.attachment ? `: ${msg.attachment}` : ''}]${text ? ` ${text}` : ''}`;
    case 'image':
      if (text.startsWith('[')) return text;
      return `[Foto]${text ? ` ${text}` : ''}`;
    case 'video': case 'audio': case 'sticker': return `[${MEDIA[msg.type]}]${text ? ` ${text}` : ''}`;
    case 'call': return `[${text || 'Chamada'}]`;
    case 'deleted': return `[${text || 'Mensagem apagada'}]`;
    case 'system': return `(${text})`;
    default: return text;
  }
}
