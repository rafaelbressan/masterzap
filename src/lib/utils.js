/**
 * Utility functions for MasterWhats.
 */

/**
 * Slugify a name for use as URL/ID.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// A message's date says only what the source knows (data/README.md): a day,
// a month ("2024-07"), a year ("2024") or nothing ("sem-data").
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const YEAR = /^\d{4}$/;
export const NO_DATE_LABEL = 'Data não informada';
export const NO_TIME_LABEL = 'Horário não informado';

/**
 * Format a date string as pt-BR long date.
 * e.g. "2024-02-10" → "10 de fevereiro de 2024"; "2024-07" → "julho de 2024";
 * "2024" → "2024"; "sem-data" → "Data não informada"
 * @param {string} dateStr - ISO date, year-month, year or "sem-data"
 * @returns {string}
 */
export function formatDateLong(dateStr) {
  if (YEAR.test(dateStr || '')) return dateStr;
  if (!DAY.test(dateStr || '') && !MONTH.test(dateStr || '')) return NO_DATE_LABEL;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day || 1);
  return date.toLocaleDateString('pt-BR', day
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { month: 'long', year: 'numeric' });
}

/**
 * Format a date string as DD/MM/YYYY (Brazilian format).
 * e.g. "2024-02-10" → "10/02/2024"; "2024-07" → "07/2024"
 * @param {string} dateStr - ISO date, year-month, year or "sem-data"
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  if (YEAR.test(dateStr || '')) return dateStr;
  if (MONTH.test(dateStr || '')) {
    const [year, month] = dateStr.split('-');
    return `${month}/${year}`;
  }
  if (!DAY.test(dateStr || '')) return NO_DATE_LABEL;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Format time from HH:MM:SS or timestamp to HH:MM.
 * An unknown time (null — the source could not read it) is "--:--", never
 * a made-up midnight.
 * @param {string|null} time - Time string (HH:MM:SS or HH:MM)
 * @returns {string}
 */
export function formatTime(time) {
  if (!time) return '--:--';
  return time.slice(0, 5);
}

/**
 * Chronological order of two message dates, partial ones included: an
 * undated day first, a month before the days of that month. Matches
 * sort_key() in scripts/message_schema.py.
 */
export function compareDates(a, b) {
  const key = (d) => (DAY.test(d) || MONTH.test(d) || YEAR.test(d) ? d : '');
  const ka = key(a), kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/**
 * Linkify URLs in text content.
 * @param {string} text
 * @returns {string} HTML string with <a> tags
 */
export function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  // innerHTML leaves quotes alone; linkify puts text inside href="…".
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Whether the bubble says "Encaminhada": a forwarded message, unless it was
 * deleted (WhatsApp drops the label then).
 */
export const showsForwarded = (msg) => !!msg?.forwarded && msg.type !== 'deleted';

/**
 * Classify a message type for rendering.
 * @param {object} msg
 * @returns {string} One of: text, image, video, audio, sticker, document, deleted, call, system
 */
export function classifyMessage(msg) {
  return msg.type || 'text';
}

/**
 * Truncate a string to maxLen, adding ellipsis if needed.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 80) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen) + '…';
}

/**
 * Format a number with locale separators (pt-BR).
 * e.g. 65772 → "65.772"
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  return n.toLocaleString('pt-BR');
}

/**
 * Format a relative date label for chat list timestamps.
 * Returns "Hoje", "Ontem", or the formatted short date.
 * @param {string} dateStr - ISO date (YYYY-MM-DD)
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  if (!DAY.test((dateStr || '').slice(0, 10))) return formatDateShort(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - date) / 86400000);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Put text on the clipboard, the modern way or the old one.
 * @returns {Promise<boolean>} whether it took
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
