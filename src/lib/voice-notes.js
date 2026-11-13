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
  if (!current || current.key !== note.key) {
    stopVoiceNote();
    const audio = new Audio(note.src);
    current = { ...note, audio };
    listening = new AbortController();
    const on = (type, fn) => audio.addEventListener(type, fn, { signal: listening.signal });
    const key = note.key;
    for (const type of ['play', 'pause', 'timeupdate']) on(type, () => announce(key));
    on('loadedmetadata', () => { durations.set(key, audio.duration); announce(key); });
    on('ended', () => stopVoiceNote());
    on('error', () => { failed.add(key); stopVoiceNote(); });
  }
  current.audio.play().catch(() => {});
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

/** "0:42" */
export function clock(seconds) {
  return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '';
}
