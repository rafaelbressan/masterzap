/**
 * Just enough syntax colouring for the snippets on the API page — shell,
 * JSON, Python — without a library. The text is escaped first; the tokens
 * are wrapped in spans afterwards, so nothing in the input can become markup.
 */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, s) => `<span class="hl-${cls}">${s}</span>`;

const RULES = {
  shell: [
    [/(^|\n)(\s*#[^\n]*)/g, (m, a, c) => a + span('comment', c)],
    [/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, (m) => span('string', m)],
    [/(^|\||\n)(\s*)(curl|jq|python3?|pip|npx?|node|claude|codex|export)\b/g, (m, a, ws, cmd) => a + ws + span('command', cmd)],
    [/(\s)(--?[a-zA-Z][\w-]*)/g, (m, ws, flag) => ws + span('flag', flag)],
    [/(https?:\/\/[^\s'"|)]+)/g, (m) => span('url', m)],
  ],
  json: [
    [/("(?:[^"\\]|\\.)*")(\s*:)/g, (m, k, c) => span('key', k) + c],
    [/(:\s*)("(?:[^"\\]|\\.)*")/g, (m, c, v) => c + span('string', v)],
    [/\b(true|false|null)\b/g, (m) => span('keyword', m)],
    [/(-?\b\d+(?:\.\d+)?\b)/g, (m) => span('number', m)],
  ],
  r: [
    [/(^|\n)(\s*#[^\n]*)/g, (m, a, c) => a + span('comment', c)],
    [/(\s)(#[^\n]*)/g, (m, ws, c) => ws + span('comment', c)],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => span('string', m)],
    [/\b(library|fromJSON|nrow|head|function|for|in|if|else|TRUE|FALSE|NULL)\b/g, (m) => span('keyword', m)],
    // The text is already escaped when the rules run.
    [/(&lt;-)/g, (m) => span('flag', m)],
    [/\b(\d+)\b/g, (m) => span('number', m)],
  ],
  python: [
    [/(^|\n)(\s*#[^\n]*)/g, (m, a, c) => a + span('comment', c)],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => span('string', m)],
    [/\b(import|from|as|def|return|for|in|if|else|print|len|with|await|async)\b/g, (m) => span('keyword', m)],
    [/\b(\d+)\b/g, (m) => span('number', m)],
  ],
};

/**
 * @param {string} code
 * @param {'shell'|'json'|'python'|'r'|'text'} [lang]
 * @returns {string} HTML, safe to set as innerHTML
 */
export function highlight(code, lang = 'text') {
  let out = esc(code);
  // Strings first would let a later rule recolour inside a span; mark spans
  // with a placeholder pass instead: each rule only touches unspanned text.
  for (const [re, fn] of RULES[lang] || []) {
    out = out.split(/(<span[^>]*>[\s\S]*?<\/span>)/g).map(part => (part.startsWith('<span') ? part : part.replace(re, fn))).join('');
  }
  return out;
}
