/**
 * The bar on top of the list while a voice note plays outside its chat, as
 * WhatsApp's: pause/play, the sender's photo with the mic and their name
 * (which opens the chat at the note), a close button, and the progress
 * along its foot. Hidden while the note's own chat is open (the bubble
 * shows it there).
 *
 * Security note: every text is set with textContent; innerHTML only takes
 * static SVG.
 */
import { currentVoiceNote, playVoiceNote, pauseVoiceNote, stopVoiceNote } from '../lib/voice-notes.js';
import { defaultAvatarSvg } from '../lib/avatar.js';

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const ICON_MIC = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';

/**
 * @param {HTMLElement} sidebar - the list, the bar goes on its top
 * @param {object} options
 * @param {function} options.onOpen - (conversationId, messageId) => void
 * @returns {{ setOpenConversation: function }}
 */
export function mountVoiceNoteBar(sidebar, { onOpen }) {
  const bar = document.createElement('div');
  bar.className = 'voice-note-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Áudio em reprodução');
  bar.hidden = true;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'voice-note-bar-toggle';

  const who = document.createElement('button');
  who.type = 'button';
  who.className = 'voice-note-bar-who';
  const photo = document.createElement('span');
  photo.className = 'voice-note-bar-photo';
  const name = document.createElement('span');
  name.className = 'voice-note-bar-name';
  who.append(photo, name);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'voice-note-bar-close';
  close.setAttribute('aria-label', 'Fechar áudio');
  close.innerHTML = ICON_CLOSE; // Static SVG

  const progress = document.createElement('div');
  progress.className = 'voice-note-bar-progress';
  const fill = document.createElement('div');
  progress.appendChild(fill);

  bar.append(toggle, who, close, progress);
  sidebar.prepend(bar);

  let openConversation = null;
  let shownKey = null;
  let drawnPlaying = null;

  function draw() {
    const note = currentVoiceNote();
    bar.hidden = !note || note.conversationId === openConversation;
    if (!note) { shownKey = null; drawnPlaying = null; return; }
    const playing = !note.audio.paused;
    if (drawnPlaying !== playing) {
      // Only on a change: a button rewritten under the finger can lose it.
      drawnPlaying = playing;
      toggle.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; // Static SVG
      toggle.setAttribute('aria-label', playing ? 'Pausar áudio' : 'Reproduzir áudio');
    }
    if (shownKey !== note.key) {
      shownKey = note.key;
      name.textContent = note.name || '';
      // The chat it opens is the one with the contact, whoever sent it.
      who.setAttribute('aria-label', `Abrir a conversa com ${note.contactName || note.name || ''}`);
      photo.replaceChildren();
      if (note.avatar) {
        const img = document.createElement('img');
        img.src = note.avatar;
        img.alt = '';
        photo.appendChild(img);
      } else {
        photo.innerHTML = defaultAvatarSvg(note.name || '?', 36); // Static SVG built from the initial
      }
      const mic = document.createElement('span');
      mic.className = 'voice-note-bar-mic';
      mic.innerHTML = ICON_MIC; // Static SVG
      photo.appendChild(mic);
    }
    const done = note.audio.duration ? note.audio.currentTime / note.audio.duration : 0;
    fill.style.width = `${Math.round(done * 1000) / 10}%`;
  }

  toggle.addEventListener('click', () => {
    const note = currentVoiceNote();
    if (!note) return;
    if (note.audio.paused) playVoiceNote(note); else pauseVoiceNote();
  });
  who.addEventListener('click', () => {
    const note = currentVoiceNote();
    if (note) onOpen?.(note.conversationId, note.messageId);
  });
  close.addEventListener('click', () => stopVoiceNote());
  window.addEventListener('voicenotechange', draw);

  return {
    /** The chat on screen (null for none): the bar hides for its own notes. */
    setOpenConversation(id) {
      openConversation = id || null;
      draw();
    },
  };
}
