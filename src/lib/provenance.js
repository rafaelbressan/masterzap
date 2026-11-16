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
    explanation: 'Sem fonte verificável.',
  },
  reconstruido: {
    label: 'Reconstruído',
    explanation: 'Texto reconstituído por terceiros; ordem ou trechos podem ter sido inferidos.',
  },
};

/** Seals that are always marked on the bubble, even as a conversation's default. */
const WEAK = new Set(['nao-verificado', 'reconstruido']);

// 14px glyphs in WhatsApp's own style — a thin contour with a solid core, as
// its ⓘ — whose contour (1.8 on 24, ~1px at 14px) matches the weight of the
// 11–12.5px text beside it. Drawn with currentColor. Static literals, safe for
// innerHTML. ContactInfo scales them to 20px by their width/height.
const glyph = (body) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// WhatsApp's ⓘ ring (ICON_INFO), shared by the "?" so the two match.
const RING = '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2.1a9.9 9.9 0 1 0 0 19.8a9.9 9.9 0 1 0 0-19.8ZM12 3.9a8.1 8.1 0 1 1 0 16.2a8.1 8.1 0 1 1 0-16.2Z"/>';
export const SEAL_ICONS = {
  // A document with a check: shields already mean "Criptografia" in WhatsApp.
  verificado: glyph('<path d="M14 2.7H6.5a1.8 1.8 0 0 0-1.8 1.8v15a1.8 1.8 0 0 0 1.8 1.8h11a1.8 1.8 0 0 0 1.8-1.8V8z"/><polyline points="14 2.7 14 8 19.3 8"/><polyline points="8.8 15 11 17.2 15.2 13" stroke-width="2.2"/>'),
  imprensa: glyph('<path d="M4 21.3h15.5a1.8 1.8 0 0 0 1.8-1.8V4.5a1.8 1.8 0 0 0-1.8-1.8H8.5a1.8 1.8 0 0 0-1.8 1.8v15a1.8 1.8 0 0 1-1.8 1.8zm0 0a1.8 1.8 0 0 1-1.8-1.8v-8.5a1.8 1.8 0 0 1 1.8-1.8h2.7"/><rect x="10" y="6" width="8" height="4.2" rx=".6" fill="currentColor" stroke="none"/><path d="M10 14h8M10 17.5h5" stroke-width="1.8"/>'),
  'nao-verificado': glyph(`${RING}<path d="M9.6 9.6a2.45 2.45 0 0 1 4.8.6c0 1.6-2.3 2.05-2.3 3.1" stroke-width="2"/><circle cx="12.1" cy="16.5" r="1.15" fill="currentColor" stroke="none"/>`),
  reconstruido: glyph('<path d="M19.4 14.9a2.5 2.5 0 1 0 0-5H18V7a2 2 0 0 0-2-2h-2.9a2.5 2.5 0 1 0-5 0H5a2 2 0 0 0-2 2v3.1a2.5 2.5 0 1 1 0 5V18a2 2 0 0 0 2 2h3.1a2.5 2.5 0 1 1 5 0H16a2 2 0 0 0 2-2v-3.1z"/><circle cx="10.5" cy="12.5" r="1.6" fill="currentColor" stroke="none"/>'),
};

/**
 * The ⓘ that opens a message's editorial note, beside the seal by the time:
 * WhatsApp's own (the ring the "?" shares), at the seals' 14px.
 */
export const NOTE_ICON = glyph(`${RING}<path fill="currentColor" stroke="none" d="M10.9 11.7h.85v4.1h-1.4a.7.7 0 0 0 0 1.4h4a.7.7 0 0 0 0-1.4h-1.2V11a.7.7 0 0 0-.7-.7h-1.55a.7.7 0 0 0 0 1.4ZM12.05 8.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/>`);

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
  const { title, outlet } = sourceNameOf(conversation, sourceById(conversation.source_id));
  if (headerSeal(conversation) !== conversation.verification) {
    return sealCountsText(conversation, outlet ? `${title}, ${outlet}` : title);
  }
  return `Fonte: ${title}${outlet ? ` (${outlet})` : ''} · ${sealCountsText(conversation)}`;
}

/**
 * How a source is named in a line: its title without the " — …" tail, and
 * its organ or outlet. The app's notice and the static pages share it.
 */
export function sourceNameOf(conversation, source) {
  const title = (source?.titulo ? source.titulo.replace(/\s+—\s+.*$/, '') : conversation?.source) || 'não informada';
  // "UOL — íntegra…" from UOL is "UOL", not "UOL (UOL)".
  const outlet = source?.orgao_ou_veiculo || '';
  return { title, outlet: outlet === title ? '' : outlet };
}

/**
 * The seal the header shows and how many messages carry another:
 * "Verificado · 4 mensagens marcadas como Imprensa", or "Na maior parte,
 * Não verificado · 12 mensagens marcadas como Verificado (<sourceName>)".
 * The app's notice and the static pages (scripts/lib/corpus.mjs) say it alike.
 */
export function sealCountsText(conversation, sourceName = '') {
  const header = headerSeal(conversation);
  if (!SEALS[header]) return '';
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
    // Named only when all of them come from it (source_messages, split_data.py).
    const named = sourceName && v === conversation.verification && n === conversation.source_messages
      ? ` (${sourceName})` : '';
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
