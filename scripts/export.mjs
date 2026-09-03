/**
 * Write the clean export: one Markdown and one JSON per conversation, one of
 * each with everything, and a zip of the lot — into public/export/.
 *
 * Runs after split_data.py, because the list of conversations and their ids
 * come from public/data/conversations.json rather than being derived again
 * here. Messages come from the sources in data/, not from the day chunks, so a
 * file holds a whole conversation at once.
 *
 * Node rather than Python because the contact profiles live in
 * src/lib/profile-content.js. Importing them keeps the export and the site
 * saying the same thing — a profile edited in one place is edited in both.
 */

import { writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';

import { getContactProfile, VORCARO_PROFILE, SOURCES } from '../src/lib/profile-content.js';
import { SETTINGS_CONTENT } from '../src/lib/settings-content.js';
import { LEGAL_SHORT } from '../src/lib/legal-content.js';
import {
  ROOT, SITE, REPO, TIMEZONE, UTC_OFFSET,
  loadEntries, loadMessages, sourceOf, contactOf, whoIs, createResolver, createLocator, isPaged,
  urlsIn, linksToMarkdown, longDate, phonePretty, MEDIA,
} from './lib/corpus.mjs';

const OUT = join(ROOT, 'public/export');
// The consolidated files and the zip are published as a GitHub Release —
// unlimited bandwidth — not served by the site. See scripts/publish-bulk.sh.
const RELEASE = join(ROOT, 'release');
const FORMAT_VERSION = 1;
const generatedAt = new Date().toISOString();

const entries = loadEntries();
// Highlights point at messages; resolved once here, for every file below.
const resolve = createResolver(entries);
const hrefFor = createLocator(entries);
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const monthName = (ym) => monthFmt.format(new Date(`${ym}-15T12:00:00`));
const md = (text, context) => linksToMarkdown(text, { resolve, context, hrefFor });

// ── text helpers ───────────────────────────────────────────────────────────



/** One message as it reads without the app. */
function messageBody(msg) {
  const text = (msg.content || '').trim();
  switch (msg.type) {
    case 'text':
      return text;
    case 'document':
      return `_[Documento${msg.attachment ? `: ${msg.attachment}` : ''}]_${text ? `\n${text}` : ''}`;
    case 'image':
      // A view-once image whose content the forensics could not recover keeps
      // the placeholder text the source gave it.
      if (text.startsWith('[')) return `_${text}_`;
      return `_[Foto]_${text ? `\n${text}` : ''}`;
    case 'video': case 'audio': case 'sticker':
      return `_[${MEDIA[msg.type]}]_${text ? `\n${text}` : ''}`;
    case 'call':
      return `_[${text || 'Chamada'}]_`;
    case 'deleted':
      return `_[${text || 'Mensagem apagada'}]_`;
    case 'system':
      return `_(${text})_`;
    default:
      return text;
  }
}

/** A leading #, > or - would turn a line of chat into markup. */
const escapeLine = (line) => line.replace(/^([#>\-+*]|\d+\.)(?=\s|$)/, '\\$1');

// ── profile ────────────────────────────────────────────────────────────────

function profileMarkdown(title, profile, context) {
  if (!profile) return { text: '', urls: [] };
  const urls = [];
  const out = [`## ${title}`, ''];
  for (const section of profile.sections || []) {
    const who = title.replace(/^Quem é /, '');
    if (section.title && section.title !== who && section.title !== `Sobre ${who}`) {
      out.push(`### ${section.title}`, '');
    }
    for (const p of section.paragraphs || []) {
      urls.push(...urlsIn(p.text));
      out.push(md(p.text, context), '');
    }
  }
  return { text: out.join('\n'), urls };
}

function profileJson(profile, context) {
  if (!profile) return null;
  const urls = [];
  const sections = (profile.sections || []).map(s => ({
    title: s.title || null,
    paragraphs: (s.paragraphs || []).map(p => {
      urls.push(...urlsIn(p.text));
      return md(p.text, context);
    }),
  }));
  return { about: profile.about || null, sections, sources: [...new Set(urls)] };
}

// ── one conversation ───────────────────────────────────────────────────────

function conversationMarkdown(entry, messages, { standalone = true, month = null } = {}) {
  const contact = contactOf(entry);
  const source = sourceOf(entry);
  const profile = getContactProfile(entry.id);
  const heading = standalone ? '#' : '##';
  const sub = standalone ? '##' : '###';
  const out = [];

  out.push(`${heading} Daniel Vorcaro ↔ ${contact}${month ? ` — ${monthName(month)}` : ''}`, '');
  if (standalone) {
    out.push(`> Exportado de [MasterWhats](${SITE}/#/chat/${entry.id}) em ${generatedAt.slice(0, 10)}.${month ? ` Só ${monthName(month)} (${messages.length} mensagens); a conversa inteira está em masterwhats-${entry.id}.md.` : ''} Código e dados: ${REPO}.`, `> ${linksToMarkdown(LEGAL_SHORT)}`, '');
  }

  out.push(`${sub} Proveniência`, '', '| | |', '|---|---|');
  out.push(`| Fonte | ${source.label} |`);
  if (source.document) out.push(`| Documento | \`${source.document}\`${source.document_pages ? `, ${source.document_pages} páginas` : ''}${source.document_url ? ` — [no repositório](${source.document_url})` : ''} (sha256 \`${source.document_sha256 || 'n/d'}\`) |`);
  out.push(`| Como chegou ao público | ${source.how} |`);
  out.push(`| Período | ${month ? `${messages[0].date} a ${messages.at(-1).date}` : `${entry.date_range.start} a ${entry.date_range.end}`} |`);
  out.push(`| Mensagens | ${month ? `${messages.length} (de ${entry.total_messages} na conversa)` : entry.total_messages} |`);
  if (entry.saved_as) out.push(`| Contato salvo como | ${entry.saved_as} |`);
  if (entry.phone) out.push(`| Telefone | ${phonePretty(entry.phone)} |`);
  out.push(`| Fuso dos horários | ${TIMEZONE} (UTC${UTC_OFFSET}) |`);
  if (entry.note) out.push(`| Observação | ${entry.note} |`);
  out.push('');

  const who = whoIs(entry, profile);
  const { text: profileText, urls } = profileMarkdown(`Quem é ${who}`, profile, entry.id);
  if (profileText) out.push(profileText.replace(/^## /, `${sub} `).replace(/\n### /g, `\n${standalone ? '###' : '####'} `));

  out.push(`${sub} Conversa`, '');
  let day = null;
  for (const msg of messages) {
    if (msg.date !== day) {
      day = msg.date;
      out.push(`${standalone ? '###' : '####'} ${longDate(day)}`, '');
    }
    // Time to the second and the message id: the key a citation needs.
    const tags = [`${msg.date} ${msg.time}`, `msg ${msg.id}`];
    if (msg.is_edited) tags.push('editada');
    if (msg.view_once) tags.push('visualização única');
    if (msg.source_page) tags.push(`laudo p. ${msg.source_page}${msg.source_figure ? `, fig. ${msg.source_figure}` : ''}`);
    out.push(`**${msg.sender}** · ${tags.join(' · ')}`);
    const body = messageBody(msg);
    if (body) out.push(...body.split('\n').map(escapeLine));
    out.push('');
  }

  const sources = [...new Set(urls)];
  if (sources.length) {
    out.push(`${sub} Fontes`, '', ...sources.map(u => `- ${u}`), '');
  }
  return out.join('\n');
}

function conversationJson(entry, messages) {
  const source = sourceOf(entry);
  return {
    export: {
      generated_at: generatedAt, format_version: FORMAT_VERSION,
      site: SITE, url: `${SITE}/#/chat/${entry.id}`, repository: REPO,
      timezone: TIMEZONE, utc_offset: UTC_OFFSET,
    },
    conversation: {
      id: entry.id,
      participants: entry.participants,
      contact: contactOf(entry),
      saved_as: entry.saved_as || null,
      phone: entry.phone || null,
      date_range: entry.date_range,
      total_messages: entry.total_messages,
      media_counts: entry.media_counts,
      source: source.label,
      source_detail: source,
      note: entry.note || null,
    },
    profile: profileJson(getContactProfile(entry.id), entry.id),
    messages: messages.map(m => ({ ...m, timestamp: `${m.timestamp}${UTC_OFFSET}` })),
  };
}

// ── everything ─────────────────────────────────────────────────────────────

function aboutMarkdown() {
  const about = SETTINGS_CONTENT.sections.find(s => s.title === 'Sobre o Projeto');
  const out = ['## Sobre o projeto', ''];
  for (const p of about?.paragraphs || []) out.push(md(p.text), '');
  return out.join('\n');
}

function readme(conversations) {
  const total = conversations.reduce((n, c) => n + c.total_messages, 0);
  return [
    '# MasterWhats — export completo', '',
    `Gerado em ${generatedAt.slice(0, 10)} a partir de ${SITE}. ${conversations.length} conversas, ${total} mensagens.`, '',
    '## O que tem aqui', '',
    '| Arquivo | Conteúdo |', '|---|---|',
    '| `masterwhats-<conversa>.md` | Uma conversa legível: proveniência, quem é o contato (com fontes) e as mensagens, dia a dia |',
    '| `masterwhats-<conversa>.json` | A mesma conversa como dados: metadados, perfil e todas as mensagens com os campos originais |',
    '| `masterwhats.md` / `masterwhats.json` | Tudo num arquivo só |', '',
    '## Como ler', '',
    `- Horários em ${TIMEZONE} (UTC${UTC_OFFSET}); no JSON, cada \`timestamp\` já carrega o fuso.`,
    '- Mensagens do relatório da PF trazem `laudo p. N, fig. M` — página e figura do PDF de origem, para conferência.',
    '- `_[Foto]_`, `_[Vídeo]_`, `_[Áudio]_`, `_[Documento]_`: a mídia não faz parte do material público; só o tipo é conhecido.',
    '- `[imagem de visualização única — conteúdo não recuperado]`: enviada em visualização única e não recuperada pela perícia.', '',
    aboutMarkdown(),
    '## Fontes gerais', '', ...SOURCES.map(s => `- [${s.label}](${s.url})`), '',
    `## Aviso legal`, '',
    linksToMarkdown(LEGAL_SHORT), '',
  ].join('\n');
}

function allMarkdown(built) {
  const total = built.reduce((n, b) => n + b.entry.total_messages, 0);
  const out = [
    '# MasterWhats — todas as conversas', '',
    `> Exportado de [MasterWhats](${SITE}) em ${generatedAt.slice(0, 10)}. ${built.length} conversas, ${total} mensagens. Código e dados: ${REPO}.`, '',
    aboutMarkdown(),
    // Vorcaro's own profile quotes the Martha chat when it says "search".
    profileMarkdown('Quem é Daniel Vorcaro', VORCARO_PROFILE, 'martha-graeff').text,
    '## Conversas', '',
    ...built.map(b => `- [${contactOf(b.entry)}](#${b.entry.id}) — ${b.entry.total_messages} mensagens, ${b.entry.date_range.start} a ${b.entry.date_range.end}`),
    '', '---', '',
  ];
  for (const b of built) {
    out.push(`<a id="${b.entry.id}"></a>`, '');
    out.push(conversationMarkdown(b.entry, b.messages, { standalone: false }), '---', '');
  }
  return out.join('\n');
}

// ── run ────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });
mkdirSync(RELEASE, { recursive: true });
for (const stale of readdirSync(OUT)) {
  if (/^masterwhats/.test(stale)) rmSync(join(OUT, stale));
}

const zip = new JSZip();
const built = [];

for (const entry of entries) {
  const messages = loadMessages(entry);
  if (messages.length !== entry.total_messages) {
    console.error(`${entry.id}: ${messages.length} messages in source, ${entry.total_messages} in conversations.json`);
    process.exit(1);
  }
  const mdText = conversationMarkdown(entry, messages);
  const jsonText = JSON.stringify(conversationJson(entry, messages), null, 1);
  writeFileSync(join(OUT, `masterwhats-${entry.id}.md`), mdText);
  writeFileSync(join(OUT, `masterwhats-${entry.id}.json`), jsonText);
  zip.file(`masterwhats-${entry.id}.md`, mdText);
  zip.file(`masterwhats-${entry.id}.json`, jsonText);
  built.push({ entry, messages });
  console.log(`${entry.id}: ${messages.length} messages, ${(mdText.length / 1024).toFixed(0)} kB md`);

  // A conversation too big for one page also comes one month at a time, so a
  // reader after a single exchange does not have to take all of it.
  if (isPaged(entry)) {
    const months = new Map();
    for (const m of messages) { const ym = m.date.slice(0, 7); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(m); }
    for (const [ym, msgs] of months) {
      const monthMd = conversationMarkdown(entry, msgs, { month: ym });
      const monthJson = JSON.stringify({ ...conversationJson(entry, msgs), month: ym }, null, 1);
      writeFileSync(join(OUT, `masterwhats-${entry.id}-${ym}.md`), monthMd);
      writeFileSync(join(OUT, `masterwhats-${entry.id}-${ym}.json`), monthJson);
      zip.file(`meses/masterwhats-${entry.id}-${ym}.md`, monthMd);
    }
    console.log(`${entry.id}: ${months.size} monthly files`);
  }
}

const allMd = allMarkdown(built);
const allJson = JSON.stringify({
  export: { generated_at: generatedAt, format_version: FORMAT_VERSION, site: SITE, repository: REPO, timezone: TIMEZONE, utc_offset: UTC_OFFSET },
  conversations: built.map(b => conversationJson(b.entry, b.messages)),
});
writeFileSync(join(RELEASE, 'masterwhats.md'), allMd);
writeFileSync(join(RELEASE, 'masterwhats.json'), allJson);
zip.file('README.md', readme(entries));

const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
writeFileSync(join(RELEASE, 'masterwhats-export.zip'), zipBuf);

console.log(`\nDone! ${built.length} conversations → ${OUT}; bulk → ${RELEASE}`);
console.log(`masterwhats.md ${(allMd.length / 1048576).toFixed(1)} MB, masterwhats.json ${(allJson.length / 1048576).toFixed(1)} MB, zip ${(zipBuf.length / 1048576).toFixed(1)} MB`);
