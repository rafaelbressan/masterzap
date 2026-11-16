/**
 * What a media message says, taken apart.
 *
 * The police report's conversations were transcribed from images, so a
 * contact card, a location or a link arrived as one line of text with a
 * bracketed label. The transcription kept a fixed shape for each kind; these
 * parsers turn that shape back into fields the chat can draw like WhatsApp
 * does — a card, a map, a play button — instead of a bracket in a bubble.
 *
 * Every parser is total: given something it does not recognise it returns a
 * best effort, never throws, so a stray line still renders as text.
 */

/** What a message with no text is called, as WhatsApp names it ("Figurinha"). */
export const MEDIA_LABELS = {
  image: 'Foto', image_view_once: 'Foto', video: 'Vídeo', audio: 'Áudio',
  sticker: 'Figurinha', document: 'Documento', contact: 'Contato', location: 'Localização',
};

/** Digits only, for comparing phone numbers written in any style. */
export const phoneDigits = (s) => (s || '').replace(/\D/g, '');

/**
 * `[cartão de contato] Name — +55 11 9…-… / Other — +55 … — Org`
 * @returns {{ name: string, phone: string|null, org: string|null }[]}
 */
export function parseContacts(content) {
  const body = (content || '').replace(/^\[cartão de contato\]\s*/i, '');
  return body.split(/\s+\/\s+/).map(part => {
    const fields = part.split(/\s+—\s+/).map(s => s.trim()).filter(Boolean);
    const name = fields.shift() || '';
    const phoneIx = fields.findIndex(f => /^\+?\d[\d\s().-]{6,}$/.test(f));
    const phone = phoneIx >= 0 ? fields.splice(phoneIx, 1)[0] : null;
    return { name, phone, org: fields.join(' — ') || null };
  }).filter(c => c.name);
}

/**
 * `[localização] Latitude: -22.78 / Longitude: -45.66 — Place, address`
 * @returns {{ lat: number|null, lng: number|null, place: string, address: string }}
 */
export function parseLocation(content) {
  const body = (content || '').replace(/^\[localização\]\s*/i, '');
  const m = body.match(/Latitude:\s*(-?[\d.]+)\s*\/\s*Longitude:\s*(-?[\d.]+)\s*(?:—\s*)?([\s\S]*)$/i);
  const rest = (m ? m[3] : body).trim();
  const [place, ...address] = rest.split(/,\s*/);
  return {
    lat: m ? Number(m[1]) : null,
    lng: m ? Number(m[2]) : null,
    place: place || 'Localização',
    address: address.join(', '),
  };
}

/** Where a location opens, in the one map everybody has. */
export const mapsUrl = ({ lat, lng, place }) => (lat != null && lng != null
  ? `https://www.google.com/maps?q=${lat},${lng}`
  : `https://www.google.com/maps/search/${encodeURIComponent(place || '')}`);

/**
 * `https://… [Title] description\nmore text` or `https://… — [Title] description`
 * @returns {{ url: string, title: string|null, description: string, extra: string, host: string, isMap: boolean }}
 */
export function parseLink(content) {
  const text = (content || '').trim();
  const m = text.match(/^(https?:\/\/\S+)\s*(?:—\s*)?(?:\[([^\]]*)\])?\s*([\s\S]*)$/);
  if (!m) return { url: null, title: null, description: '', extra: text, host: '', isMap: false };
  const [, url, title, rest] = m;
  const [description = '', ...more] = rest.split('\n');
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* not a URL after all */ }
  return {
    url,
    title: title?.trim() || null,
    description: description.trim(),
    extra: more.join('\n').trim(),
    host,
    isMap: /(^|\.)(maps\.app\.goo\.gl|goo\.gl|google\.[a-z.]+)$/.test(host) && /maps|\/maps\//.test(url) || host === 'maps.app.goo.gl',
  };
}

/** `[transcrição do áudio] …` → the words. */
export function parseAudio(content) {
  const text = (content || '').trim();
  const m = text.match(/^\[transcrição do áudio\]\s*([\s\S]*)$/i);
  return { transcript: m ? m[1].trim() : (text.startsWith('[') ? '' : text) };
}

/**
 * What an image message can say about itself.
 *
 *   [imagem de visualização única — conteúdo não recuperado]   → lost
 *   [imagem de visualização única] caption                     → viewOnce
 *   [imagem — captura da conversa…] transcription              → described
 *   caption                                                    → photo
 */
export function parseImage(content) {
  const text = (content || '').trim();
  if (/^\[imagem de visualização única — conteúdo não recuperado\]/i.test(text)) {
    return { kind: 'lost', label: 'Visualização única', note: 'Conteúdo não recuperado pela perícia', caption: '' };
  }
  let m = text.match(/^\[imagem de visualização única\]\s*([\s\S]*)$/i);
  if (m) return { kind: 'viewOnce', label: 'Visualização única', note: '', caption: m[1].trim() };
  m = text.match(/^\[imagem\s*—\s*([^\]]*)\]\s*([\s\S]*)$/i);
  if (m) return { kind: 'described', label: 'Foto', note: m[1].trim(), caption: m[2].trim() };
  return { kind: 'photo', label: 'Foto', note: '', caption: text };
}

/**
 * The conversation a phone number belongs to, if Vorcaro had one with it.
 * @param {string} phone - written any way
 * @param {{ id: string, phone?: string }[]} conversations
 */
export function conversationForPhone(phone, conversations) {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  // Compare the last 8 digits: the same number shows up with and without the
  // country code, the area code, or a leading 9.
  const tail = digits.slice(-8);
  return conversations.find(c => c.phone && phoneDigits(c.phone).slice(-8) === tail) || null;
}
