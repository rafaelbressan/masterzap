/**
 * ChatView component — renders the chat header and message area.
 * Integrates with ScrollLoader for lazy day-chunk loading.
 *
 * Security note: innerHTML is used in two controlled scenarios:
 * 1. Static SVG icons (BACK_ICON) and generated avatars — no user data
 * 2. Message text — escapeHtml() runs FIRST to neutralize all HTML,
 *    then linkify() wraps plain-text URLs in <a> tags. This is safe
 *    because the input to linkify is already fully escaped.
 */
import { currentVoiceNote, isCurrent, playVoiceNote, pauseVoiceNote, durationOf, hasFailed, clock } from '../lib/voice-notes.js';
import { contactOf, isOutgoing as isOwnerMessage } from '../lib/participants.js';
import { escapeHtml, formatTime, formatDateLong, linkify, NO_TIME_LABEL } from '../lib/utils.js';
import { ScrollLoader } from '../lib/scroll-loader.js';
import { ICON_INFO, ICON_SEARCH, ICON_CHECKEMPTY, ICON_BELL, ICON_TIMER, ICON_DOWNLOAD, ICON_CLOSE_CIRCULAR, ICON_MASTERZAP_LOGO, ICON_MEETBALL, ICON_CHEVRON_DW, ICON_SCREENSHOT } from '../lib/icons.js';

import { defaultAvatarSvg } from '../lib/avatar.js';
import { parseContacts, parseLocation, mapsUrl, parseLink, parseAudio, parseImage, conversationForPhone } from '../lib/media.js';
import { showContactsSheet, ICON_MESSAGE } from './ContactsSheet.js';
import { openMenu, menuClosed } from '../lib/menus.js';
import { isImportant } from '../lib/important-messages.js';
import { setBubbleStar } from './ImportantPanel.js';
import { SEALS, SEAL_ICONS, sealToMark, sealDescription, provenanceOf, sourceById, conversationSealLine, noteOf, NOTE_LABEL } from '../lib/provenance.js';

/**
 * What the media renderers need from outside the bubble: who the contacts
 * are, where the avatars live, how to open a chat or copy a number. Set once
 * per chat view; there is only ever one on screen.
 */
let media = { conversations: [], avatarFor: () => null, selfAvatar: null, selfName: '', contactAvatar: null, contactName: '', onOpenChat: () => {}, onCopy: () => {}, container: null, signal: undefined };

/** The open conversation, for the seal each bubble may carry. */
let sealContext = { conversation: null };

/**
 * The yellow notice at the top of the chat: where the messages came from and
 * their seal. A button, because it opens the contact drawer at "Fonte".
 */
function renderSealNotice(conversation, onOpen) {
  const line = conversationSealLine(conversation);
  if (!line) return null;
  const notice = document.createElement('button');
  notice.type = 'button';
  notice.className = 'chat-seal-notice';
  const icon = document.createElement('span');
  icon.className = 'chat-seal-notice-icon';
  // Static SVG literal — safe innerHTML
  icon.innerHTML = SEAL_ICONS[conversation.verification] || '';
  notice.appendChild(icon);
  const text = document.createElement('span');
  // "Clique" with a mouse, "Toque" on a touchscreen, as WhatsApp words it.
  const verb = window.matchMedia?.('(pointer: coarse)').matches ? 'Toque' : 'Clique';
  text.textContent = onOpen ? `${line}. ${verb} para ver a fonte.` : `${line}.`;
  notice.appendChild(text);
  if (onOpen) notice.addEventListener('click', onOpen);
  return notice;
}

// A transcript this short fits in four lines of any bubble: never cut.
const TRANSCRIPT_NEVER_CUT_CHARS = 120;
const ICON_PAUSE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const MAP_PLACEHOLDER = '/assets/map-placeholder.jpg';
const MAP_PIN = '/assets/map-pin.jpg';

const BACK_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;


/**
 * Render a single day section with date badge + messages.
 * @param {string} date - ISO date string
 * @param {Array} messages
 * @returns {HTMLElement}
 */
function renderDaySection(date, messages, { notice = null, conversation }) {
  const section = document.createElement('section');
  section.className = 'chat-day';
  section.dataset.date = date;

  // The oldest day opens with the conversation's source, where WhatsApp puts
  // its end-to-end encryption notice.
  if (notice) section.appendChild(notice);

  // Date badge
  const badge = document.createElement('div');
  badge.className = 'chat-date-badge';
  badge.textContent = formatDateLong(date);
  section.appendChild(badge);

  // Messages
  for (const msg of messages) {
    section.appendChild(renderMessage(msg, conversation));
  }

  return section;
}

// ── SVG Icons for message types ──────────────────

const ICON_CAMERA = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const ICON_VIDEO = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;

const ICON_MIC = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;

const ICON_DOC = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

const ICON_PHONE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;

const ICON_BLOCK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

/**
 * Render a media placeholder (image/video/sticker).
 *
 * The box grows with its caption: a screenshot of a whole exchange was
 * transcribed into some of these, and text must never leave the grey area.
 */
function renderMediaPlaceholder(type, msg) {
  const el = document.createElement('div');
  el.className = `chat-media-placeholder chat-media-${type}`;

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-media-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = type === 'video' ? ICON_VIDEO : ICON_CAMERA;
  el.appendChild(iconEl);

  const image = type === 'image' ? parseImage(msg.content) : null;

  const label = document.createElement('span');
  label.className = 'chat-media-label';
  const labels = { image: 'Foto', video: 'Vídeo', sticker: 'Sticker' };
  label.textContent = image ? image.label : (labels[type] || type);
  el.appendChild(label);

  if (image?.note) {
    const note = document.createElement('div');
    note.className = 'chat-media-note';
    note.textContent = image.note;
    el.appendChild(note);
  }

  const captionText = image ? image.caption : (msg.content || '');
  if (captionText) {
    const caption = document.createElement('div');
    caption.className = 'chat-media-caption';
    caption.textContent = captionText;
    el.appendChild(caption);
  }

  return el;
}

/** A round avatar: the photograph when there is one, the coloured initial otherwise. */
function avatarEl(src, name, size, className) {
  const wrap = document.createElement('span');
  wrap.className = className;
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    wrap.appendChild(img);
  } else {
    wrap.innerHTML = defaultAvatarSvg(name || '?', size);
  }
  return wrap;
}

/**
 * A voice note, as WhatsApp draws one: play, waveform, the sender's photo
 * with the mic. It plays only the original recording (msg.audio_src, a file
 * of this site) — never a voice made up for it. Without one, the play button
 * is off and the line below says so. A transcript (the police report's, for
 * now) is the bubble's text under the waveform, cut at a few lines with
 * "Ler mais", as WhatsApp shows one.
 */
function renderAudioMessage(msg, isOutgoing, conversation) {
  const { transcript } = parseAudio(msg.content);
  const src = playableSource(msg.audio_src);
  const el = document.createElement('div');
  el.className = 'chat-audio';

  const row = document.createElement('div');
  row.className = 'chat-audio-row';

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'chat-audio-play';
  play.innerHTML = ICON_PLAY; // Static SVG
  row.appendChild(play);

  const waveform = document.createElement('div');
  waveform.className = 'chat-audio-waveform';
  const bars = [];
  for (let i = 0; i < 34; i++) {
    const bar = document.createElement('span');
    bar.className = 'chat-audio-bar';
    bar.style.height = `${4 + ((i * 7919) % 17)}px`;
    waveform.appendChild(bar);
    bars.push(bar);
  }
  row.appendChild(waveform);

  const who = avatarEl(isOutgoing ? media.selfAvatar : media.contactAvatar,
    isOutgoing ? media.selfName : media.contactName, 40, 'chat-audio-avatar');
  const mic = document.createElement('span');
  mic.className = 'chat-audio-mic';
  mic.innerHTML = ICON_MIC;
  who.appendChild(mic);
  row.appendChild(who);
  el.appendChild(row);

  const foot = document.createElement('div');
  foot.className = 'chat-audio-foot';
  el.appendChild(foot);

  const provenance = transcript ? 'transcrição da perícia' : '';
  if (src) {
    // Its state lives in voice-notes.js: it may already be playing (the
    // reader left the chat and came back), and it goes on if they leave.
    const key = `${conversation?.id}/${msg.id}`;
    play.setAttribute('aria-label', 'Reproduzir áudio');
    let drawnOn = null; // the icon drawn, so it is only replaced on a change
    const show = () => {
      const note = isCurrent(key) ? currentVoiceNote() : null;
      const audio = note?.audio;
      const on = !!audio && !audio.paused;
      if (drawnOn !== on) {
        // Replaced only on a change: a button rewritten under the finger
        // four times a second can lose the press (WebKit).
        drawnOn = on;
        play.innerHTML = on ? ICON_PAUSE : ICON_PLAY; // Static SVG
        play.setAttribute('aria-label', on ? 'Pausar áudio' : 'Reproduzir áudio');
        el.classList.toggle('playing', on);
      }
      const done = audio?.duration ? audio.currentTime / audio.duration : 0;
      bars.forEach((bar, i) => bar.classList.toggle('played', i / bars.length < done));
      if (hasFailed(key)) {
        play.disabled = true;
        play.setAttribute('aria-label', 'Áudio não disponível');
        foot.textContent = 'Não foi possível tocar o áudio';
        return;
      }
      const seconds = audio && audio.currentTime > 0 ? audio.currentTime : durationOf(key);
      foot.textContent = [clock(seconds), provenance].filter(Boolean).join(' · ');
    };
    show();
    // Follow this note only (not every note that plays), while its chat is
    // on screen: the chat's signal ends the listening when it closes.
    let mine = false;
    window.addEventListener('voicenotechange', (e) => {
      if (e.detail?.key !== key && !mine) return;
      mine = isCurrent(key);
      show();
    }, { signal: media.signal });
    play.addEventListener('click', (e) => {
      e.stopPropagation();
      const note = currentVoiceNote();
      if (isCurrent(key) && !note.audio.paused) { pauseVoiceNote(); return; }
      playVoiceNote({
        key,
        src,
        conversationId: conversation?.id,
        messageId: msg.id,
        name: isOutgoing ? media.selfName : media.contactName,
        contactName: media.contactName,
        avatar: isOutgoing ? media.selfAvatar : media.contactAvatar,
      });
    });
  } else {
    play.disabled = true;
    play.setAttribute('aria-label', 'Áudio não disponível');
    foot.textContent = ['Áudio não recuperado', provenance].filter(Boolean).join(' · ');
  }

  if (transcript) el.appendChild(renderTranscript(transcript));
  return el;
}

/** The recording's address, when it is a file of this site (not elsewhere). */
function playableSource(src) {
  if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return null;
  try {
    const url = new URL(src, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return /\.(mp3|m4a|ogg|opus|wav|aac)$/i.test(url.pathname) ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}

/**
 * A transcript cut at four lines, with "Ler mais" — only when the cut hides
 * something (measured once it is laid out, not guessed from its length).
 */
function renderTranscript(transcript) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-audio-transcript clamped';
  const text = document.createElement('div');
  text.className = 'chat-audio-transcript-text';
  text.tabIndex = -1; // where the keyboard goes when it opens
  text.textContent = transcript;
  wrap.appendChild(text);

  // Short ones are never cut. Longer ones keep the button's line from the
  // start (invisible until measured), so nothing jumps when it shows.
  if (transcript.length <= TRANSCRIPT_NEVER_CUT_CHARS) {
    wrap.classList.remove('clamped');
    return wrap;
  }
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'chat-audio-transcript-more';
  more.textContent = 'Ler mais';
  more.style.visibility = 'hidden';
  more.addEventListener('click', (e) => {
    e.stopPropagation();
    expandTranscript(wrap);
    text.focus({ preventScroll: true });
  });
  wrap.appendChild(more);

  const measure = new ResizeObserver(() => {
    if (!text.clientHeight) return; // not laid out yet
    measure.disconnect();
    if (text.scrollHeight > text.clientHeight + 1) more.style.visibility = '';
    else expandTranscript(wrap);
  });
  measure.observe(text);
  return wrap;
}

/** Show a transcript whole (Ler mais; a search or a link landing on it). */
export function expandTranscript(wrap) {
  wrap.classList.remove('clamped');
  wrap.querySelector('.chat-audio-transcript-more')?.remove();
}

/** A shared location: the map with a pin, the place and its address; opens on Google Maps. */
function renderLocationCard(msg) {
  const loc = parseLocation(msg.content);
  const a = document.createElement('a');
  a.className = 'chat-location-card';
  a.href = mapsUrl(loc);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const img = document.createElement('img');
  img.className = 'chat-location-map';
  img.src = MAP_PIN;
  img.alt = 'Mapa';
  a.appendChild(img);

  const body = document.createElement('div');
  body.className = 'chat-location-body';
  const place = document.createElement('span');
  place.className = 'chat-location-place';
  place.textContent = loc.place;
  body.appendChild(place);
  if (loc.address) {
    const addr = document.createElement('span');
    addr.className = 'chat-location-address';
    addr.textContent = loc.address;
    body.appendChild(addr);
  }
  a.appendChild(body);
  return a;
}

/**
 * A link with its preview, as WhatsApp shows one: the card on top (a map
 * thumbnail for Google Maps, the title and description for anything else)
 * and the address itself underneath, clickable, opening in a new tab.
 */
function renderLinkMessage(msg) {
  const link = parseLink(msg.content);
  const frag = document.createDocumentFragment();
  if (!link.url) {
    const t = document.createElement('span');
    t.textContent = msg.content || '';
    frag.appendChild(t);
    return frag;
  }

  const card = document.createElement('a');
  card.className = `chat-link-card${link.isMap ? ' is-map' : ''}`;
  card.href = link.url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  if (link.isMap) {
    const img = document.createElement('img');
    img.className = 'chat-link-thumb';
    img.src = MAP_PLACEHOLDER;
    img.alt = '';
    card.appendChild(img);
  }
  const body = document.createElement('div');
  body.className = 'chat-link-body';
  const title = document.createElement('span');
  title.className = 'chat-link-title';
  title.textContent = link.title || link.host;
  body.appendChild(title);
  if (link.description) {
    const desc = document.createElement('span');
    desc.className = 'chat-link-desc';
    desc.textContent = link.description;
    body.appendChild(desc);
  }
  const host = document.createElement('span');
  host.className = 'chat-link-host';
  host.textContent = link.host;
  body.appendChild(host);
  card.appendChild(body);
  frag.appendChild(card);

  const url = document.createElement('a');
  url.className = 'chat-link-url';
  url.href = link.url;
  url.target = '_blank';
  url.rel = 'noopener noreferrer';
  url.textContent = link.url;
  frag.appendChild(url);

  if (link.extra) {
    const extra = document.createElement('div');
    extra.className = 'chat-link-extra';
    extra.textContent = link.extra;
    frag.appendChild(extra);
  }
  return frag;
}

/**
 * A contact card. One person: photo, name, and "Enviar mensagem" — which
 * opens the chat if Vorcaro had one with that number, and copies the number
 * otherwise. Several entries: the first one and "Ver todos".
 */
function renderContactCard(msg) {
  const contacts = parseContacts(msg.content);
  const el = document.createElement('div');
  el.className = 'chat-contact-card';
  if (!contacts.length) {
    el.textContent = msg.content || '';
    return el;
  }
  const first = contacts[0];
  const match = conversationForPhone(first.phone, media.conversations);

  const head = document.createElement('div');
  head.className = 'chat-contact-head';
  head.appendChild(avatarEl(match ? media.avatarFor(match.id) : null, first.name, 44, 'chat-contact-avatar'));
  const names = document.createElement('div');
  names.className = 'chat-contact-names';
  const name = document.createElement('span');
  name.className = 'chat-contact-name';
  name.textContent = first.name;
  names.appendChild(name);
  const sub = document.createElement('span');
  sub.className = 'chat-contact-sub';
  sub.textContent = contacts.length > 1
    ? `e mais ${contacts.length - 1} contato${contacts.length > 2 ? 's' : ''}`
    : (first.org || first.phone || '');
  if (sub.textContent) names.appendChild(sub);
  head.appendChild(names);
  el.appendChild(head);

  const actions = document.createElement('div');
  actions.className = 'chat-contact-actions';
  if (contacts.length > 1) {
    const all = document.createElement('button');
    all.className = 'chat-contact-action';
    all.textContent = 'Ver todos';
    all.addEventListener('click', () => showContactsSheet(media.container, contacts, media));
    actions.appendChild(all);
  } else if (first.phone) {
    const send = document.createElement('button');
    send.className = 'chat-contact-action';
    send.innerHTML = `${ICON_MESSAGE}<span>${match ? 'Enviar mensagem' : 'Copiar número'}</span>`;
    send.addEventListener('click', () => {
      if (match) media.onOpenChat(match.id); else media.onCopy(first.phone, 'Número copiado');
    });
    actions.appendChild(send);
  }
  if (actions.childNodes.length) el.appendChild(actions);
  return el;
}

/**
 * Render a document attachment card.
 */
function renderDocumentCard(msg) {
  const el = document.createElement('div');
  el.className = 'chat-document-card';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-document-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_DOC;
  el.appendChild(iconEl);

  const info = document.createElement('div');
  info.className = 'chat-document-info';

  const name = document.createElement('span');
  name.className = 'chat-document-name';
  name.textContent = msg.attachment || 'Documento';
  info.appendChild(name);

  if (msg.content) {
    const desc = document.createElement('span');
    desc.className = 'chat-document-desc';
    desc.textContent = msg.content;
    info.appendChild(desc);
  }

  el.appendChild(info);
  return el;
}

/**
 * Render a call notification card.
 */
function renderCallCard(msg) {
  const el = document.createElement('div');
  el.className = 'chat-call-card';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-call-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_PHONE;
  el.appendChild(iconEl);

  const label = document.createElement('span');
  label.className = 'chat-call-label';
  label.textContent = msg.content || 'Chamada';
  el.appendChild(label);

  return el;
}

/**
 * Render a deleted message indicator.
 */
function renderDeletedMessage() {
  const el = document.createElement('div');
  el.className = 'chat-deleted-msg';

  const iconEl = document.createElement('span');
  iconEl.className = 'chat-deleted-icon';
  // Static SVG — safe innerHTML
  iconEl.innerHTML = ICON_BLOCK;
  el.appendChild(iconEl);

  const label = document.createElement('span');
  label.textContent = 'Mensagem apagada';
  el.appendChild(label);

  return el;
}

/**
 * Render a single message bubble.
 * @param {object} msg
 * @returns {HTMLElement}
 */
function renderMessage(msg, conversation) {
  // Green and on the right: what the phone's owner sent.
  const isOutgoing = isOwnerMessage(msg, conversation);
  const isSystem = msg.type === 'system';

  const row = document.createElement('div');
  row.className = `chat-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}${isSystem ? ' system' : ''}`;
  row.dataset.id = msg.id;
  // The message itself, for the menu (marking as important keeps its text,
  // not the bubble's labels around it).
  row._message = msg;

  if (isSystem) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-system';
    bubble.textContent = msg.content;
    row.appendChild(bubble);
    return row;
  }

  const bubble = document.createElement('div');
  bubble.className = `chat-msg-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

  const content = document.createElement('div');
  content.className = 'chat-msg-content';

  switch (msg.type) {
    case 'image':
      content.appendChild(renderMediaPlaceholder('image', msg));
      break;
    case 'video':
      content.appendChild(renderMediaPlaceholder('video', msg));
      break;
    case 'audio':
      content.appendChild(renderAudioMessage(msg, isOutgoing, conversation));
      break;
    case 'image_view_once':
      content.appendChild(renderMediaPlaceholder('image', msg));
      break;
    case 'location':
      content.appendChild(renderLocationCard(msg));
      break;
    case 'link':
      content.appendChild(renderLinkMessage(msg));
      break;
    case 'contact':
      content.appendChild(renderContactCard(msg));
      break;
    case 'sticker':
      content.appendChild(renderMediaPlaceholder('sticker', msg));
      break;
    case 'document':
      content.appendChild(renderDocumentCard(msg));
      break;
    case 'deleted':
      content.appendChild(renderDeletedMessage());
      break;
    case 'call':
      content.appendChild(renderCallCard(msg));
      break;
    default: {
      // Text: escapeHtml first (neutralizes ALL HTML), then linkify wraps URLs in <a>
      const escaped = escapeHtml(msg.content || '');
      content.innerHTML = linkify(escaped);
      // Vorcaro's notes to Moraes were screenshots sent to vanish; the text
      // exists because the forensics recovered them. Say so, quietly.
      if (msg.view_once) {
        const tag = document.createElement('div');
        tag.className = 'chat-view-once-tag';
        tag.textContent = 'Visualização única · print do bloco de notas, recuperado pela perícia';
        content.prepend(tag);
      }
      break;
    }
  }

  bubble.appendChild(content);

  // Metadata row (seal + edited flag + time)
  const meta = document.createElement('span');
  meta.className = 'chat-msg-meta';
  const time = document.createElement('span');
  time.className = 'chat-msg-time';
  time.textContent = formatTime(msg.time);
  if (!msg.time) {
    // "--:--" on screen and on hover says what it means; a screen reader
    // reads the words instead of the dashes.
    time.title = NO_TIME_LABEL;
    time.setAttribute('aria-hidden', 'true');
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = NO_TIME_LABEL;
    meta.appendChild(spoken);
  }
  meta.appendChild(time);
  if (msg.is_edited) {
    const edited = document.createElement('span');
    edited.className = 'chat-msg-edited';
    edited.textContent = 'editada';
    meta.prepend(edited);
  }
  const mark = sealToMark(msg, sealContext.conversation);
  if (mark) {
    const glyph = document.createElement('span');
    glyph.className = `chat-msg-seal seal-${mark}`;
    glyph.setAttribute('role', 'img');
    const description = sealDescription(mark, sourceById(provenanceOf(msg, sealContext.conversation).sourceId));
    glyph.setAttribute('aria-label', description);
    glyph.title = description;
    // Static SVG literal — safe innerHTML
    glyph.innerHTML = SEAL_ICONS[mark];
    meta.prepend(glyph);
  }
  if (sealContext.conversation && isImportant(sealContext.conversation.id, msg.id)) setBubbleStar(meta, true);
  // A note from whoever put the data together (how a time was estimated,
  // where a line came from): an ⓘ by the time, as the star, that opens the
  // message's info with it. It is not anyone's message in the chat.
  // The click is ContextMenu.js's, as the chevron's.
  if (noteOf(msg)) {
    const flag = document.createElement('button');
    flag.type = 'button';
    flag.className = 'chat-msg-note-flag';
    flag.setAttribute('aria-label', 'Ver nota do MasterWhats sobre esta mensagem');
    flag.title = NOTE_LABEL;
    flag.innerHTML = ICON_INFO; // Static SVG
    meta.insertBefore(flag, time);
  }
  bubble.appendChild(meta);

  // Tail (the little triangle on the bubble)
  const tail = document.createElement('span');
  tail.className = 'chat-msg-tail';
  bubble.appendChild(tail);

  // Chevron dropdown trigger (visible on hover)
  const chevron = document.createElement('button');
  chevron.className = 'chat-msg-chevron';
  chevron.setAttribute('aria-label', 'Menu da mensagem');
  chevron.innerHTML = ICON_CHEVRON_DW;
  bubble.appendChild(chevron);

  row.appendChild(bubble);
  return row;
}

/**
 * Render the full chat view for a conversation.
 * @param {HTMLElement} container - the main-area element
 * @param {object} options
 * @param {object} options.conversation - conversation metadata
 * @param {Array} options.dateIndex - date index from DataStore
 * @param {function} options.loadMessages - async (date) => messages[]
 * @param {function} [options.onBack] - back button callback
 * @returns {{ element: HTMLElement, loader: ScrollLoader }}
 */
// Use the design system meetball icon for 3-dot menu

export function renderChatView(container, { conversation, dateIndex, loadMessages, onBack, onContactClick, onSourceClick, onSearch, onCloseChat, onAbout, onScreenshot, onMenuOpen, onExport, media: mediaOptions }) {
  if (mediaOptions) media = { ...media, ...mediaOptions, container };
  // What this chat's bubbles listen to (the voice note playing) stops with it.
  const listeners = new AbortController();
  media = { ...media, signal: listeners.signal };
  sealContext = { conversation };
  // Clear container
  while (container.firstChild) container.removeChild(container.firstChild);

  const el = document.createElement('div');
  el.className = 'chat-view';
  el.dataset.conversationId = conversation.id;

  // Header
  const displayName = contactOf(conversation);

  const header = document.createElement('header');
  header.className = 'chat-header';

  // Back button (useful for mobile, hidden on desktop via CSS)
  const backBtn = document.createElement('button');
  backBtn.className = 'chat-header-back';
  backBtn.setAttribute('aria-label', 'Voltar');
  // Static SVG icon — safe innerHTML
  backBtn.innerHTML = BACK_ICON;
  if (onBack) backBtn.addEventListener('click', onBack);
  header.appendChild(backBtn);

  const avatarEl = document.createElement('div');
  avatarEl.className = 'chat-header-avatar';
  if (conversation.avatar) {
    const img = document.createElement('img');
    img.src = conversation.avatar;
    img.alt = displayName;
    img.className = 'chat-header-avatar-img';
    avatarEl.appendChild(img);
  } else {
    // Generated SVG — no user data, safe innerHTML
    avatarEl.innerHTML = defaultAvatarSvg(conversation.id, 40);
  }
  if (onContactClick) {
    avatarEl.style.cursor = 'pointer';
    avatarEl.addEventListener('click', onContactClick);
  }
  header.appendChild(avatarEl);

  const infoEl = document.createElement('div');
  infoEl.className = 'chat-header-info-wrapper';
  if (onContactClick) {
    infoEl.style.cursor = 'pointer';
    infoEl.addEventListener('click', onContactClick);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'chat-header-name';
  nameEl.textContent = displayName;
  infoEl.appendChild(nameEl);

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'chat-header-info';
  // The seal rides in the header, which stays in view on a deep link and on
  // mobile, where the notice at the top of the chat is out of sight.
  // On a narrow header the count gives way, never the seal: "Não…" alone
  // would say the opposite of "Não verificado".
  const total = conversation.total_messages;
  const countEl = document.createElement('span');
  countEl.className = 'chat-header-info-count';
  countEl.textContent = `${total.toLocaleString('pt-BR')} ${total === 1 ? 'mensagem' : 'mensagens'}`;
  subtitleEl.appendChild(countEl);
  const seal = SEALS[conversation.verification];
  if (seal) {
    const sealEl = document.createElement('span');
    sealEl.className = 'chat-header-info-seal';
    sealEl.textContent = ` · ${seal.label}`;
    subtitleEl.appendChild(sealEl);
  }
  infoEl.appendChild(subtitleEl);

  header.appendChild(infoEl);

  // Search button in header
  const searchBtn = document.createElement('button');
  searchBtn.className = 'chat-header-menu-btn';
  searchBtn.setAttribute('aria-label', 'Pesquisar');
  searchBtn.innerHTML = ICON_SEARCH;
  if (onSearch) searchBtn.addEventListener('click', onSearch);
  header.appendChild(searchBtn);

  // 3-dot menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'chat-header-menu-btn';
  menuBtn.setAttribute('aria-label', 'Menu');
  // Static SVG — safe innerHTML
  menuBtn.innerHTML = ICON_MEETBALL;
  header.appendChild(menuBtn);

  // Dropdown menu (hidden by default)
  let menuOpen = false;
  let menuEl = null;

  function buildMenuEl() {
    const m = document.createElement('div');
    m.className = 'chat-dropdown-menu';

    const items = [
      { label: 'Info do contato', icon: ICON_INFO, action: onContactClick, enabled: !!onContactClick },
      { label: 'Pesquisar', icon: ICON_SEARCH, action: onSearch, enabled: !!onSearch },
      { label: 'Selecionar mensagens', icon: ICON_CHECKEMPTY, action: null, enabled: false },
      { label: 'Modo silencioso', icon: ICON_BELL, action: null, enabled: false },
      { label: 'Mensagens temporárias', icon: ICON_TIMER, action: null, enabled: false },
      { label: 'Compartilhar print', icon: ICON_SCREENSHOT, action: onScreenshot, enabled: !!onScreenshot },
      { label: 'Exportar (.md)', icon: ICON_DOWNLOAD, action: () => onExport('md'), enabled: !!onExport },
      { label: 'Exportar (.json)', icon: ICON_DOWNLOAD, action: () => onExport('json'), enabled: !!onExport },
      { label: 'Fechar conversa', icon: ICON_CLOSE_CIRCULAR, action: onCloseChat || onBack, enabled: !!(onCloseChat || onBack) },
      { label: 'Sobre o MasterWhats', icon: ICON_MASTERZAP_LOGO, action: onAbout, enabled: !!onAbout },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'chat-dropdown-item';
      if (!item.enabled) btn.classList.add('disabled');
      // Static SVG icons from icons.js + static labels — safe innerHTML
      if (item.icon) {
        btn.innerHTML = `<span class="chat-dropdown-icon">${item.icon}</span><span>${item.label}</span>`;
      } else {
        btn.textContent = item.label;
      }
      if (item.enabled && item.action) {
        btn.addEventListener('click', () => { closeMenu(); item.action(); });
      }
      m.appendChild(btn);
    }
    return m;
  }

  function toggleMenu() {
    if (menuOpen) { closeMenu(); return; }
    menuEl = buildMenuEl();
    header.appendChild(menuEl);
    menuOpen = true;
    // The only menu on screen; the ⋮ button itself toggles rather than closes.
    openMenu(menuEl, closeMenu, { keep: (target) => menuBtn.contains(target) });
    if (onMenuOpen) onMenuOpen();
  }

  function showMenuAt(x, y) {
    closeMenu();
    menuEl = buildMenuEl();
    if (onMenuOpen) onMenuOpen();
    menuEl.style.position = 'fixed';
    menuEl.style.top = `${y}px`;
    menuEl.style.left = `${x}px`;
    menuEl.style.right = 'auto';

    document.body.appendChild(menuEl);

    // Adjust if overflowing viewport
    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) menuEl.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight) menuEl.style.top = `${window.innerHeight - rect.height - 8}px`;

    menuOpen = true;
    openMenu(menuEl, closeMenu);
  }

  function closeMenu() {
    if (menuEl) { menuClosed(menuEl); menuEl.remove(); menuEl = null; }
    menuOpen = false;
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });


  el.appendChild(header);

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'chat-messages';
  messagesArea.setAttribute('role', 'log');
  messagesArea.setAttribute('aria-label', `Mensagens com ${displayName}`);
  el.appendChild(messagesArea);

  // Right-click on chat background (not on bubbles) opens dropdown at mouse position
  messagesArea.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble, .chat-msg-system, .context-menu');
    if (bubble) return;
    e.preventDefault();
    showMenuAt(e.clientX, e.clientY);
  });

  container.appendChild(el);

  // Set up scroll loader
  const loader = new ScrollLoader({
    container: messagesArea,
    dateIndex,
    loadMessages,
    // Landing on a voice note (a search, a link): its transcript whole.
    revealMessage: (row) => row.querySelectorAll('.chat-audio-transcript').forEach(expandTranscript),
    onDestroy: () => listeners.abort(),
    renderDay: (date, messages) => renderDaySection(date, messages, {
      conversation,
      notice: date === dateIndex[0]?.date ? renderSealNotice(conversation, onSourceClick || onContactClick) : null,
    }),
  });

  return { element: el, loader };
}

// Export for testing
export { renderDaySection, renderMessage };
