/**
 * Where a message came from, and how far it can be trusted — the "selo".
 *
 * A conversation has a default source and seal (conversations.json:
 * source_id, verification); a message that came from elsewhere carries its own.
 * The full scheme is in data/README.md; the build already refused anything
 * that does not resolve, so here an unknown value only means old data.
 */

export const SEALS = {
  verificado: {
    label: 'Verificado',
    explanation: 'Consta de documento oficial; a página e a figura estão citadas.',
  },
  imprensa: {
    label: 'Imprensa',
    explanation: 'Publicado por veículo de imprensa; não consta de documento oficial.',
  },
  'nao-verificado': {
    label: 'Não verificado',
    explanation: 'Sem fonte verificável; pode estar incompleto ou adulterado.',
  },
  reconstruido: {
    label: 'Reconstruído',
    explanation: 'Texto reconstituído por terceiros; ordem ou trechos podem ter sido inferidos.',
  },
};

/** Seals that are always marked on the bubble, even as a conversation's default. */
const WEAK = new Set(['nao-verificado', 'reconstruido']);

// 14px glyphs, drawn with currentColor. Static literals — safe for innerHTML.
const svg = (body) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const SEAL_ICONS = {
  // A document with a check: shields already mean "Criptografia" in WhatsApp.
  verificado: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>'),
  imprensa: svg('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>'),
  'nao-verificado': svg('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  reconstruido: svg('<path d="M19.4 14.9a2.5 2.5 0 1 0 0-5H18V7a2 2 0 0 0-2-2h-2.9a2.5 2.5 0 1 0-5 0H5a2 2 0 0 0-2 2v3.1a2.5 2.5 0 1 1 0 5V18a2 2 0 0 0 2 2h3.1a2.5 2.5 0 1 1 5 0H16a2 2 0 0 0 2-2v-3.1z"/>'),
};

let sources = {};

/** The sources table from conversations.json, by id. */
export function setSources(table) {
  sources = table || {};
}

export const sourceById = (id) => sources[id] || null;

/** A message's effective source id and seal: its own, else its conversation's. */
export function provenanceOf(msg, conversation) {
  return {
    sourceId: msg?.source_id || conversation?.source_id || null,
    verification: msg?.verification || conversation?.verification || null,
  };
}

/**
 * Whether a bubble carries the seal glyph. The reference is the seal the
 * header shows (headerSeal): weak seals always, a message whose seal differs
 * from it, and — when the header shows the source's own seal — one from
 * another source. Nothing else: 65k messages of a conversation whose default
 * is "Imprensa" stay as WhatsApp draws them, and in a chat most of which came
 * from elsewhere, the majority stays plain and the source's own are marked.
 */
export function sealToMark(msg, conversation) {
  const { sourceId, verification } = provenanceOf(msg, conversation);
  if (!SEALS[verification]) return null;
  const header = headerSeal(conversation);
  if (WEAK.has(verification) || verification !== header) return verification;
  if (header === conversation?.verification && sourceId !== conversation?.source_id) return verification;
  return null;
}

/**
 * The seal the conversation's header shows: the one more than half its
 * messages carry (majority_verification, from split_data.py), else its
 * source's. A report chat the fork added more to reads "Não verificado",
 * and the report's own messages are then marked "Verificado" one by one.
 */
export const headerSeal = (conversation) =>
  (SEALS[conversation?.majority_verification] ? conversation.majority_verification : conversation?.verification);

/** "Não verificado: print sem origem conhecida" — what a screen reader says. */
export function sealDescription(verification, source) {
  const seal = SEALS[verification];
  if (!seal) return '';
  const where = source?.titulo ? ` Fonte: ${source.titulo}.` : '';
  return `${seal.label}: ${seal.explanation}${where}`;
}

/**
 * One line for the notice at the top of the chat:
 * "Fonte: IPJ-A nº 3298613/2026 (Polícia Federal) · Verificado", and how many
 * messages carry another seal. When most came from elsewhere it leads with
 * that: "Na maior parte, Não verificado · 12 mensagens marcadas como
 * Verificado (IPJ-A nº 3298613/2026, Polícia Federal)".
 */
export function conversationSealLine(conversation) {
  if (!SEALS[conversation?.verification]) return '';
  const source = sourceById(conversation.source_id);
  const title = (source?.titulo ? source.titulo.replace(/\s+—\s+.*$/, '') : conversation.source) || 'não informada';
  const outlet = source?.orgao_ou_veiculo || '';
  if (headerSeal(conversation) !== conversation.verification) {
    return sealCountsText(conversation, outlet ? `${title}, ${outlet}` : title);
  }
  return `Fonte: ${title}${outlet ? ` (${outlet})` : ''} · ${sealCountsText(conversation)}`;
}

/**
 * The seal the header shows and how many messages carry another:
 * "Verificado · 4 mensagens marcadas como Imprensa", or "Na maior parte,
 * Não verificado · 12 mensagens marcadas como Verificado (<sourceName>)".
 * The app's notice and the static pages (scripts/lib/corpus.mjs) say it alike.
 */
export function sealCountsText(conversation, sourceName = '') {
  const header = headerSeal(conversation);
  const lead = header === conversation.verification ? SEALS[header].label : `Na maior parte, ${SEALS[header].label}`;
  const others = otherSealsText(conversation, sourceName);
  return others ? `${lead} · ${others}` : lead;
}

/**
 * How many messages carry another seal than the header's:
 * "4 mensagens marcadas como Imprensa", "1 …, 2 … e 1 …"; empty when none.
 * When the header is not the source's seal, the source's own are named by
 * `sourceName`.
 */
export function otherSealsText(conversation, sourceName = '') {
  const header = headerSeal(conversation);
  const others = Object.entries(conversation?.verification_counts || {})
    .filter(([v]) => v !== header && SEALS[v]);
  const parts = others.map(([v, n]) => {
    const named = sourceName && v === conversation.verification ? ` (${sourceName})` : '';
    return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'mensagem marcada' : 'mensagens marcadas'} como ${SEALS[v].label}${named}`;
  });
  return parts.length ? new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(parts) : '';
}

/** What the editorial note on a message is called wherever it is shown. */
export const NOTE_LABEL = 'Nota do MasterWhats';

/**
 * The note from whoever put the data together (how a time was estimated,
 * what a figure leaves out), trimmed, or null when the message has none.
 */
export function noteOf(msg) {
  return typeof msg?.note === 'string' && msg.note.trim() ? msg.note.trim() : null;
}
