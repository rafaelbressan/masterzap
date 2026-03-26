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

/**
 * Format a date string as pt-BR long date.
 * e.g. "2024-02-10" → "10 de fevereiro de 2024"
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatDateLong(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date string as DD/MM/YYYY (Brazilian format).
 * e.g. "2024-02-10" → "10/02/2024"
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Format time from HH:MM:SS or timestamp to HH:MM.
 * @param {string} time - Time string (HH:MM:SS or HH:MM)
 * @returns {string}
 */
export function formatTime(time) {
  return time.slice(0, 5);
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
  return div.innerHTML;
}

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
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - date) / 86400000);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
