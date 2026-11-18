/**
 * The MasterWhats channel, in "Atualizações" as WhatsApp keeps its channels:
 * the panel in the list's place (Status, empty, then Canais), the channel's
 * posts in the chat's place, and a flight opened full screen.
 *
 * A flight post is WhatsApp's location card: the map on top, the text below.
 * Tapping the map opens the flight: the large map with the route beside its
 * details on a computer; on a phone, the map with a sheet that rises from
 * the bottom (a tap or a drag), as Google Maps and WhatsApp do.
 *
 * The posts are the channel's own (public/data/canal.json, built by
 * scripts/build_channel.mjs), never Vorcaro's: they say where each one comes
 * from with the same seals as the messages.
 *
 * Security note: names and notes from the data go in as textContent; the
 * only innerHTML is static SVG and the map, built from numbers and escaped
 * names (src/lib/flight-map.js).
 */

import { loadWorld, drawFlight, mapsLink, stopLabel } from '../lib/flight-map.js';
import { SEALS, SEAL_ICONS } from '../lib/provenance.js';
import { ICON_ARROW_BACK } from '../lib/icons.js';

const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg>';
// WhatsApp's verified badge, green for a channel.
const ICON_VERIFIED = '<svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true"><path fill="#00a884" d="M9 0l2.2 1.6 2.7-.1.8 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.8 2.6-2.7-.1L9 18l-2.2-1.6-2.7.1-.8-2.6L1.1 12.3 2 9.7 1.1 7.1l2.2-1.6.8-2.6 2.7.1z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m5.6 9.2 2.3 2.3 4.5-4.6"/></svg>';
const CHANNEL_AVATAR = '/assets/masterzap-logo.png';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "28 de agosto de 2025", or "outubro de 2022" when the day is not known. */
export function dayLabel(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  if (!y || !m) return String(date);
  return d ? `${d} de ${MONTHS[m - 1]} de ${y}` : `${MONTHS[m - 1]} de ${y}`;
}

/** "Brasília 15h36 → Congonhas 16h57" */
export const routeText = (post) => post.legs.map(stopLabel).join(post.mode === 'route' ? ' → ' : ', ').replace(/ · /g, ' ');

/** "Phenom 300 · PR-NGM" */
const planeText = (post) => [post.aircraft, post.prefix].filter(Boolean).join(' · ');

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

function sealMark(post) {
  const seal = SEALS[post.verification];
  if (!seal) return null;
  const mark = el('span', 'channel-post-seal');
  mark.innerHTML = SEAL_ICONS[post.verification]; // static SVG
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', seal.label);
  mark.title = `${seal.label}. ${seal.explanation}`;
  return mark;
}

/** The people on board, each one a link when they have a chat here (or the owner's profile). */
function passengerLinks(post, { onContact, onProfile }) {
  const frag = document.createDocumentFragment();
  post.passengers.forEach((p, i) => {
    if (i) frag.append(', ');
    const go = p.owner ? onProfile : (p.conversation_id ? () => onContact(p.conversation_id) : null);
    if (!go) { frag.append(p.name); return; }
    const link = el('button', 'channel-link', p.name);
    link.type = 'button';
    link.addEventListener('click', (e) => { e.stopPropagation(); go(); });
    frag.append(link);
  });
  return frag;
}

// ── The panel: Status and Canais ─────────────────────────────────────────

/**
 * "Atualizações", in the list's place: Status (nothing here) and the channel.
 * @returns {HTMLElement}
 */
export function renderUpdatesPanel({ channel, posts, active = false, onOpen }) {
  const panel = el('section', 'updates-panel');
  panel.setAttribute('aria-label', 'Atualizações');
  panel.append(el('h1', 'updates-title', 'Atualizações'));

  panel.append(el('h2', 'updates-section', 'Status'));
  panel.append(el('p', 'updates-empty', 'Nenhuma atualização de status.'));

  panel.append(el('h2', 'updates-section', 'Canais'));
  const row = el('button', `updates-channel${active ? ' active' : ''}`);
  row.type = 'button';
  const avatar = el('img', 'updates-channel-avatar');
  avatar.src = CHANNEL_AVATAR;
  avatar.alt = '';
  const text = el('span', 'updates-channel-text');
  const name = el('span', 'updates-channel-name', channel.name);
  const badge = el('span', 'updates-verified');
  badge.innerHTML = ICON_VERIFIED; // static SVG
  name.append(badge);
  const last = posts.at(-1);
  const top = el('span', 'updates-channel-top');
  top.append(name, el('span', 'updates-channel-date', last ? dayLabel(last.date) : ''));
  text.append(top, el('span', 'updates-channel-preview', last ? `✈️ ${routeText(last)}` : ''));
  row.append(avatar, text);
  row.addEventListener('click', () => onOpen?.());
  panel.append(row);
  return panel;
}

// ── The channel ──────────────────────────────────────────────────────────

/**
 * The channel's posts, oldest first as a chat reads, in the chat's place.
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function renderChannelView(mainArea, { channel, posts, onBack, onOpenPost, onContact, onProfile, onSearch }) {
  while (mainArea.firstChild) mainArea.removeChild(mainArea.firstChild);
  const view = el('div', 'channel-view');

  const header = el('header', 'chat-header channel-header');
  const back = el('button', 'chat-header-back channel-back');
  back.type = 'button';
  back.setAttribute('aria-label', 'Voltar');
  back.innerHTML = ICON_ARROW_BACK; // static SVG
  back.addEventListener('click', () => onBack?.());
  const avatar = el('img', 'channel-header-avatar');
  avatar.src = CHANNEL_AVATAR;
  avatar.alt = '';
  const info = el('div', 'channel-header-info');
  const title = el('span', 'channel-header-name', channel.name);
  const badge = el('span', 'updates-verified');
  badge.innerHTML = ICON_VERIFIED; // static SVG
  title.append(badge);
  info.append(title, el('span', 'channel-header-sub', `Canal · ${posts.length} publicações`));
  header.append(back, avatar, info);

  const feed = el('div', 'channel-feed');
  feed.setAttribute('role', 'feed');
  const intro = el('div', 'channel-intro');
  intro.append(el('p', '', channel.description));
  feed.append(intro);

  const maps = [];
  let lastDay = null;
  for (const post of posts) {
    const day = dayLabel(post.date);
    if (day !== lastDay) {
      feed.append(el('div', 'chat-date-badge channel-day', day));
      lastDay = day;
    }
    const { node, map } = renderPost(post, { onOpenPost, onContact, onProfile, onSearch });
    feed.append(node);
    if (map) maps.push({ map, post });
  }

  view.append(header, feed);
  mainArea.append(view);
  // The newest, as a chat opens (once the phone has shown the view).
  feed.scrollTop = feed.scrollHeight;
  requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });

  // The maps draw once the world has loaded; the posts read without them.
  let alive = true;
  loadWorld().then((world) => {
    if (!alive) return;
    for (const { map, post } of maps) {
      drawFlight(map, world, post, { width: 344, height: 172 });
    }
  }).catch(() => {
    for (const { map } of maps) map.classList.add('flight-map-failed');
  });

  return { element: view, destroy: () => { alive = false; } };
}

function renderPost(post, { onOpenPost, onContact, onProfile, onSearch }) {
  const node = el('article', 'channel-post');
  node.dataset.id = post.id;
  let map = null;
  if (post.legs.length) {
    const open = el('button', 'channel-post-map');
    open.type = 'button';
    open.setAttribute('aria-label', `Abrir o voo no mapa: ${routeText(post)}`);
    map = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    map.setAttribute('class', 'flight-map');
    map.setAttribute('aria-hidden', 'true');
    open.append(map);
    open.addEventListener('click', () => onOpenPost(post.id));
    node.append(open);
  }

  const caption = el('div', 'channel-post-text');
  caption.append(el('div', 'channel-post-route', `✈️ ${post.legs.length ? routeText(post) : post.route_label || post.date_label}`));
  caption.append(el('div', '', [post.date_label, planeText(post)].filter(Boolean).join(' · ')));
  if (post.status) caption.append(el('div', 'channel-post-status', post.status));
  if (post.passengers.length) {
    const who = el('div', '');
    who.append('A bordo: ', passengerLinks(post, { onContact, onProfile }));
    caption.append(who);
  }
  if (post.note) caption.append(el('div', 'channel-post-note', post.note));
  if (post.context) caption.append(el('div', 'channel-post-note', post.context));
  if (post.mentions) {
    const cite = el('button', 'channel-link', `O ${post.prefix} aparece em ${post.mentions} ${post.mentions === 1 ? 'mensagem' : 'mensagens'}`);
    cite.type = 'button';
    cite.addEventListener('click', () => onSearch(post.prefix));
    caption.append(cite);
  }
  node.append(caption);

  const meta = el('div', 'channel-post-meta');
  const seal = sealMark(post);
  if (seal) meta.append(seal);
  const time = post.legs.find(l => l.time)?.time;
  if (time) meta.append(el('span', 'channel-post-time', time));
  node.append(meta);
  return { node, map };
}

// ── A flight, full screen ───────────────────────────────────────────────

/**
 * Open a flight over everything: the map and its details.
 * @returns {{ close: () => void }}
 */
export function openFlight(post, { onClose, onContact, onProfile, onSearch }) {
  const overlay = el('div', 'flight-viewer');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Voo: ${routeText(post)}`);

  const head = el('header', 'flight-viewer-head');
  const close = el('button', 'flight-viewer-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar');
  close.innerHTML = ICON_CLOSE; // static SVG
  const titles = el('div', 'flight-viewer-titles');
  titles.append(el('div', 'flight-viewer-title', `✈️ ${routeText(post)}`),
    el('div', 'flight-viewer-sub', [post.date_label, planeText(post)].filter(Boolean).join(' · ')));
  head.append(close, titles);

  const body = el('div', 'flight-viewer-body');
  const map = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  map.setAttribute('class', 'flight-map flight-viewer-map');
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', `Mapa do trajeto: ${routeText(post)}`);

  const sheet = el('aside', 'flight-viewer-info');
  const grab = el('button', 'flight-viewer-grab');
  grab.type = 'button';
  grab.setAttribute('aria-label', 'Ver detalhes');
  const summary = el('button', 'flight-viewer-summary');
  summary.type = 'button';
  summary.append(el('span', 'flight-viewer-summary-route', routeText(post)),
    el('span', 'flight-viewer-summary-sub', [post.date_label, planeText(post)].filter(Boolean).join(' · ')),
    el('span', 'flight-viewer-more', 'Ver detalhes'));
  const details = el('div', 'flight-viewer-details');
  fillDetails(details, post, { onContact, onProfile, onSearch });
  sheet.append(grab, summary, details);
  body.append(map, sheet);
  overlay.append(head, body);
  document.body.append(overlay);

  // The map is redrawn for the room it has: the sheet covers its bottom on a phone.
  let world = null;
  const phone = () => window.matchMedia('(max-width: 700px)').matches;
  const draw = () => {
    if (!world) return;
    const r = map.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const inset = phone() ? sheet.getBoundingClientRect().height : 0;
    drawFlight(map, world, post, { width: r.width, height: r.height, large: true, bottomInset: inset });
  };
  loadWorld().then((w) => { world = w; draw(); }).catch(() => map.classList.add('flight-map-failed'));
  const resize = new ResizeObserver(draw);
  resize.observe(map);
  resize.observe(sheet);

  // The sheet: a tap opens or closes it, a drag up or down too.
  const setOpen = (open) => {
    sheet.classList.toggle('open', open);
    grab.setAttribute('aria-label', open ? 'Recolher detalhes' : 'Ver detalhes');
  };
  grab.addEventListener('click', () => setOpen(!sheet.classList.contains('open')));
  summary.addEventListener('click', () => setOpen(true));
  let dragStart = null;
  sheet.addEventListener('pointerdown', (e) => {
    if (!phone() || e.target.closest('.flight-viewer-details')) return;
    dragStart = e.clientY;
  });
  sheet.addEventListener('pointerup', (e) => {
    if (dragStart == null) return;
    const dy = e.clientY - dragStart;
    dragStart = null;
    if (Math.abs(dy) > 30) setOpen(dy < 0);
  });

  const onKey = (e) => { if (e.key === 'Escape') shut(); };
  document.addEventListener('keydown', onKey);
  let closed = false;
  function shut() {
    if (closed) return;
    closed = true;
    resize.disconnect();
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    onClose?.();
  }
  close.addEventListener('click', shut);
  close.focus();
  return { close: shut, element: overlay };
}

function fillDetails(details, post, { onContact, onProfile, onSearch }) {
  if (post.legs.length) {
    details.append(el('h3', 'flight-viewer-heading', post.mode === 'route' ? 'Trajeto' : 'Lugares'));
    post.legs.forEach((leg, i) => {
      const last = i === post.legs.length - 1;
      const kind = post.mode !== 'route' ? '' : i === 0 ? 'decolagem' : last ? 'pouso' : 'escala';
      // Each stop opens in the reader's maps app: a pin, never directions.
      const stop = el('a', 'flight-viewer-stop');
      stop.href = mapsLink(leg);
      stop.target = '_blank';
      stop.rel = 'noopener';
      const dot = el('span', `flight-viewer-dot${post.mode === 'route' && last ? ' lands' : ''}`);
      const text = el('span', 'flight-viewer-stop-text');
      text.append(el('b', '', leg.place),
        el('small', '', [kind, leg.time?.replace(':', 'h'), leg.approx ? 'lugar aproximado' : ''].filter(Boolean).join(' · ')));
      stop.append(dot, text);
      details.append(stop);
    });
  }
  if (post.aircraft || post.prefix) {
    details.append(el('h3', 'flight-viewer-heading', 'Aeronave'));
    details.append(el('div', '', planeText(post)));
    if (post.operator) details.append(el('small', 'flight-viewer-muted', post.operator));
  }
  if (post.status) details.append(el('div', 'channel-post-status', post.status));
  if (post.passengers.length) {
    // No count: "8 pessoas" or "Modelos que voltavam de Lisboa" is one line, not one person.
    details.append(el('h3', 'flight-viewer-heading', 'A bordo'));
    const list = el('div', 'flight-viewer-people');
    for (const p of post.passengers) {
      const go = p.owner ? onProfile : (p.conversation_id ? () => onContact(p.conversation_id) : null);
      const row = el(go ? 'button' : 'div', 'flight-viewer-person');
      row.append(el('span', '', p.name));
      if (go) {
        row.type = 'button';
        row.append(el('span', 'flight-viewer-person-go', p.owner ? 'ver perfil' : 'abrir conversa'));
        row.addEventListener('click', go);
      }
      list.append(row);
    }
    details.append(list);
  }
  for (const text of [post.note, post.context].filter(Boolean)) {
    details.append(el('p', 'flight-viewer-note', text));
  }
  const seal = SEALS[post.verification];
  if (seal) {
    const box = el('div', `flight-viewer-seal seal-${post.verification}`);
    const icon = el('span', '');
    icon.innerHTML = SEAL_ICONS[post.verification]; // static SVG
    box.append(icon, el('b', '', seal.label), ` · ${seal.explanation}`);
    details.append(box);
  }
  if (post.mentions) {
    const cite = el('button', 'flight-viewer-btn', `Ver as ${post.mentions} ${post.mentions === 1 ? 'mensagem que cita' : 'mensagens que citam'} o ${post.prefix}`);
    cite.type = 'button';
    cite.addEventListener('click', () => onSearch(post.prefix));
    details.append(cite);
  }
  if (post.legs.length) {
    const open = el('a', 'flight-viewer-btn primary', 'Abrir no mapa');
    open.href = mapsLink(post.legs.at(-1));
    open.target = '_blank';
    open.rel = 'noopener';
    details.append(open);
  }
}
