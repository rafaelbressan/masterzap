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
 * Whether a bubble carries the seal glyph: weak seals always, any seal that
 * differs from the conversation's, and nothing else — 65k messages of a
 * conversation whose default is "Imprensa" stay as WhatsApp draws them.
 */
export function sealToMark(msg, conversation) {
  const { verification } = provenanceOf(msg, conversation);
  if (!SEALS[verification]) return null;
  if (WEAK.has(verification) || verification !== conversation?.verification) return verification;
  return null;
}

/** "Não verificado: print sem origem conhecida" — what a screen reader says. */
export function sealDescription(verification, source) {
  const seal = SEALS[verification];
  if (!seal) return '';
  const where = source?.titulo ? ` Fonte: ${source.titulo}.` : '';
  return `${seal.label}: ${seal.explanation}${where}`;
}

/**
 * One line for the top-of-chat notice and the screenshot footer:
 * "Fonte: IPJ-A nº 3298613/2026 (Polícia Federal) · Verificado".
 * A conversation with messages under other seals says how many.
 */
export function conversationSealLine(conversation) {
  const seal = SEALS[conversation?.verification];
  if (!seal) return '';
  const source = sourceById(conversation.source_id);
  const title = source ? source.titulo.replace(/\s+—\s+.*$/, '') : conversation.source;
  const outlet = source?.orgao_ou_veiculo ? ` (${source.orgao_ou_veiculo})` : '';
  let line = `Fonte: ${title || 'não informada'}${outlet} · ${seal.label}`;
  const others = Object.entries(conversation.verification_counts || {})
    .filter(([v]) => v !== conversation.verification && SEALS[v]);
  if (others.length) {
    // "· 4 mensagens marcadas como Imprensa"
    line += ` · ${others.map(([v, n]) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'mensagem marcada' : 'mensagens marcadas'} como ${SEALS[v].label}`).join(' e ')}`;
  }
  return line;
}
