/**
 * The voice note playing, one at a time, as WhatsApp: it goes on when the
 * reader leaves its chat (a bar on top of the list shows it then), and stops
 * only when it ends or the reader closes it.
 *
 * Only an original recording plays (a file of this site, msg.audio_src);
 * nothing is ever synthesised. The bubble and the bar both draw from here:
 * every change is announced as a window 'voicenotechange' event whose detail
 * names the note it is about ({ key }).
 */

/** @type {null|{key: string, audio: HTMLAudioElement, conversationId: string, messageId: string|number, name: string, contactName: string, avatar: string|null}} */
let current = null;
let listening = null; // the current recording's listeners, removed with it
const durations = new Map(); // key → seconds, once known (kept after it ends)
const failed = new Set(); // keys whose recording could not be played

const announce = (key) => window.dispatchEvent(new CustomEvent('voicenotechange', { detail: { key } }));

/** The voice note now loaded (playing or paused), if any. */
export function currentVoiceNote() {
  return current;
}

/** Whether this note is the one loaded. */
export function isCurrent(key) {
  return current?.key === key;
}

/** The note's length in seconds, once its recording said it. */
export function durationOf(key) {
  return durations.get(key);
}

/** Whether the note's recording failed to play. */
export function hasFailed(key) {
  return failed.has(key);
}

/**
 * Play a note, or go on with it; whichever was playing stops.
 * @param {object} note - { key, src, conversationId, messageId, name, contactName, avatar }
 */
export function playVoiceNote(note) {
  if (failed.has(note.key)) return;
  load(note);
  current.audio.play().catch(() => {});
}

/** Make this note the loaded one (the one playing stops), without playing it. */
function load(note) {
  if (current?.key === note.key) return;
  stopVoiceNote();
  const audio = new Audio(note.src);
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  current = { ...note, audio };
  listening = new AbortController();
  const on = (type, fn) => audio.addEventListener(type, fn, { signal: listening.signal });
  const key = note.key;
  for (const type of ['pause', 'timeupdate', 'seeked', 'ratechange']) on(type, () => announce(key));
  // Some browsers set the rate back to 1 when the file loads: the reader's stays.
  on('play', () => { audio.playbackRate = rate; announce(key); });
  // A streamed or VBR file can say Infinity or NaN: kept only when it is a length.
  on('loadedmetadata', () => { if (Number.isFinite(audio.duration)) durations.set(key, audio.duration); announce(key); });
  on('ended', () => stopVoiceNote());
  on('error', () => { failed.add(key); stopVoiceNote(); });
}

// ── Speed, as WhatsApp: 1×, 1,5×, 2×, kept for the next notes ──────────────

const RATES = [1, 1.5, 2];
let rate = 1;

/** The speed notes play at. */
export const playbackRate = () => rate;

/** "1,5×" */
export const rateLabel = (r = rate) => `${String(r).replace('.', ',')}×`;

/** The next speed (after 2× comes 1× again), for the note playing and the next ones. */
export function cycleRate() {
  rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
  if (current) {
    current.audio.defaultPlaybackRate = rate;
    current.audio.playbackRate = rate;
    announce(current.key);
  }
  return rate;
}

/**
 * Go to a point of a note (0 its start, 1 its end), as a drag or a tap on the
 * waveform does. A note not loaded yet is loaded there, paused, as WhatsApp
 * moves a note's dot before it plays.
 */
export function seekVoiceNote(note, fraction) {
  if (failed.has(note.key)) return;
  load(note);
  const { audio } = current;
  const at = Math.min(Math.max(fraction, 0), 1);
  const go = () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = at * audio.duration;
    announce(note.key);
  };
  if (audio.readyState >= 1) go();
  else audio.addEventListener('loadedmetadata', go, { once: true, signal: listening.signal });
}

export function pauseVoiceNote() {
  current?.audio.pause();
}

/** Close the note: stopped, released and forgotten (the bar goes). */
export function stopVoiceNote() {
  if (!current) return;
  const { key, audio } = current;
  listening?.abort();
  listening = null;
  current = null;
  audio.pause();
  // Let the element go: no more buffering, no more events.
  audio.removeAttribute('src');
  audio.load();
  announce(key);
}

/**
 * A duration as the data writes it ("01:34", "1:34", "00:00:17", "100:00")
 * in seconds; undefined when it is not one.
 */
export function secondsOf(text) {
  const parts = String(text ?? '').trim().split(':');
  if (parts.length < 2 || parts.length > 3 || !parts.every(p => /^\d+$/.test(p))) return undefined;
  if (parts.slice(1).some(p => p.length !== 2 || Number(p) > 59)) return undefined;
  return parts.reduce((total, p) => total * 60 + Number(p), 0);
}

/** "0:42" */
export function clock(seconds) {
  return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '';
}
