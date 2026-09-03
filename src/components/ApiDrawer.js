/**
 * ApiDrawer — the "API/MCP" page, in the shape of "Sobre o MasterWhats":
 * beside the rail on a wide screen, the whole screen on a phone.
 *
 * The prose comes from api-content.js; the routes, limits and URLs from
 * api-routes.js — the same table the MCP server and vercel.json follow.
 *
 * Security note: innerHTML is used for static SVG and for parseLinks over
 * static content; every value from the tables goes in as textContent.
 */

import { renderProfileSections } from './ProfileSections.js';
import { API_INTRO, API_SECTIONS, MCP_CLIENTS, MCP_TOOLS, API_EXAMPLES, MCP_EXAMPLES, API_CREDITS } from '../lib/api-content.js';
import { API_ROUTES, API_BASE, SITE_ORIGIN, MCP_URL, MCP_LIMITS, slugOf } from '../lib/api-routes.js';
import { copyText } from '../lib/utils.js';
import { highlight } from '../lib/highlight.js';
import { parseLinks } from '../lib/profile-content.js';

export const ICON_CODE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
const ICON_CODE_64 = ICON_CODE.replace('width="20" height="20"', 'width="36" height="36"').replace('stroke-width="2.6"', 'stroke-width="3"');
const ICON_LINK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const ICON_COPY = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

/** A block of text with a button that copies it. */
const LANG_LABEL = { shell: 'bash', json: 'JSON', python: 'Python', r: 'R', text: 'txt' };

function codeBlock(text, { onCopy, label = 'Copiar', inset = false, lang = 'text' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = inset ? 'api-code inset' : 'api-code';
  const pre = document.createElement('pre');
  // Escaped by highlight() before any span is added — safe innerHTML
  pre.innerHTML = highlight(text, lang);
  wrap.appendChild(pre);
  // One row under the code: the language at the left, the copy at the right.
  const foot = document.createElement('div');
  foot.className = 'api-code-foot';
  const langEl = document.createElement('span');
  langEl.className = 'api-code-lang';
  langEl.textContent = LANG_LABEL[lang] || lang;
  foot.appendChild(langEl);
  const btn = document.createElement('button');
  btn.className = 'api-copy';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `${ICON_COPY}<span>${label}</span>`;
  btn.addEventListener('click', async () => {
    const ok = await copyText(text);
    onCopy?.(ok);
    btn.querySelector('span').textContent = ok ? 'Copiado' : 'Não copiou';
    setTimeout(() => { btn.querySelector('span').textContent = label; }, 1500);
  });
  foot.appendChild(btn);
  wrap.appendChild(foot);
  return wrap;
}

let onAnchorCopy = null;

/** A titled section whose title carries its own address. */
function section(title) {
  const el = document.createElement('div');
  el.className = 'profile-section';
  el.id = `api-${slugOf(title)}`;
  const h3 = document.createElement('h3');
  h3.className = 'profile-section-title has-anchor';
  const text = document.createElement('span');
  text.textContent = title;
  h3.appendChild(text);
  const link = document.createElement('button');
  link.className = 'api-anchor';
  link.setAttribute('aria-label', `Copiar link desta seção: ${title}`);
  link.setAttribute('data-tip', 'Copiar link');
  link.innerHTML = ICON_LINK;
  link.addEventListener('click', async () => {
    const url = `${SITE_ORIGIN}/#/api/${slugOf(title)}`;
    const ok = await copyText(url);
    onAnchorCopy?.(ok);
  });
  h3.appendChild(link);
  el.appendChild(h3);
  return el;
}

/**
 * @param {HTMLElement} container - the .app-container element
 * @param {object} options
 * @param {function} options.onClose
 * @param {function} [options.onCopy] - (ok: boolean)
 * @returns {{ destroy: function }}
 */
export function showApiDrawer(container, { onClose, onCopy, section: wanted } = {}) {
  container.querySelector('.api-drawer')?.remove();
  onAnchorCopy = onCopy;
  const sidebar = container.querySelector('.sidebar');

  const drawer = document.createElement('div');
  drawer.className = 'api-drawer settings-drawer profile-drawer';

  const header = document.createElement('div');
  header.className = 'profile-drawer-header';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'profile-drawer-close';
  closeBtn.setAttribute('aria-label', 'Voltar');
  closeBtn.innerHTML = `<span class="drawer-close-x">✕</span><span class="drawer-close-arrow"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></span>`;
  closeBtn.addEventListener('click', destroy);
  header.appendChild(closeBtn);
  const titleEl = document.createElement('span');
  titleEl.className = 'profile-drawer-title';
  titleEl.textContent = API_INTRO.title;
  header.appendChild(titleEl);
  drawer.appendChild(header);

  const body = document.createElement('div');
  body.className = 'profile-drawer-body';

  // Top: the icon, the name, and the one URL people come here for.
  const top = document.createElement('div');
  top.className = 'settings-logo-section';
  const icon = document.createElement('div');
  icon.className = 'api-hero-icon';
  icon.innerHTML = ICON_CODE_64;
  top.appendChild(icon);
  const name = document.createElement('div');
  name.className = 'settings-logo-name';
  name.textContent = API_INTRO.title;
  top.appendChild(name);
  const sub = document.createElement('div');
  sub.className = 'settings-logo-sub';
  sub.textContent = API_INTRO.sub;
  top.appendChild(sub);
  body.appendChild(top);
  body.appendChild(codeBlock(MCP_URL, { onCopy, inset: true, lang: 'text' }));

  const divider = document.createElement('div');
  divider.className = 'contact-info-divider';
  body.appendChild(divider);

  // The prose: what it is, fair use, bulk — with the same anchors.
  renderProfileSections(body, API_SECTIONS, [], null, {});
  for (const h3 of body.querySelectorAll('.profile-section-title:not(.has-anchor)')) {
    const title = h3.textContent;
    const built = section(title);
    h3.parentElement.id = built.id;
    h3.replaceWith(built.firstChild);
  }

  // The hand-built sections share the prose sections' wrapper, and its margins.
  const custom = document.createElement('div');
  custom.className = 'profile-sections api-sections';
  body.appendChild(custom);

  // The table, from the same source the rewrites follow.
  const routesEl = section('A API estática');
  const lead = document.createElement('p');
  lead.className = 'profile-section-text';
  // Static content through parseLinks — safe innerHTML
  lead.innerHTML = parseLinks(`Base: \`${SITE_ORIGIN}${API_BASE}\`. Toque numa rota para abrir o exemplo.`);
  routesEl.appendChild(lead);
  const list = document.createElement('div');
  list.className = 'api-routes';
  for (const r of API_ROUTES) {
    const item = document.createElement('a');
    item.className = 'api-route';
    item.href = `${API_BASE}${r.example}`;
    item.target = '_blank';
    item.rel = 'noopener';
    const path = document.createElement('code');
    path.className = 'api-route-path';
    path.textContent = r.route;
    item.appendChild(path);
    const desc = document.createElement('span');
    desc.className = 'api-route-desc';
    desc.textContent = r.description;
    item.appendChild(desc);
    list.appendChild(item);
  }
  routesEl.appendChild(list);
  custom.appendChild(routesEl);

  // The MCP: what it offers, the limits, and how to plug it in.
  const mcpEl = section('O MCP');
  const tools = document.createElement('ul');
  tools.className = 'api-tools';
  for (const [tool, what] of MCP_TOOLS) {
    const li = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = tool;
    li.appendChild(code);
    li.appendChild(document.createTextNode(` — ${what}`));
    tools.appendChild(li);
  }
  mcpEl.appendChild(tools);
  const limits = document.createElement('p');
  limits.className = 'profile-section-text api-limits';
  limits.textContent = `Limites por cliente: ${MCP_LIMITS.perMinute}/min · ${MCP_LIMITS.perDay}/dia. Teto do site: ${MCP_LIMITS.globalPerDay.toLocaleString('pt-BR')}/dia.`;
  mcpEl.appendChild(limits);
  custom.appendChild(mcpEl);

  for (const client of MCP_CLIENTS) {
    const el = section(`Como usar no ${client.name}`);
    const ol = document.createElement('ol');
    ol.className = 'api-steps';
    for (const step of client.steps) {
      const li = document.createElement('li');
      // Static content through parseLinks — safe innerHTML
      li.innerHTML = parseLinks(step);
      ol.appendChild(li);
    }
    el.appendChild(ol);
    el.appendChild(codeBlock(client.code, { onCopy, lang: client.lang }));
    custom.appendChild(el);
  }

  const apiEx = section('Exemplos com a API');
  for (const ex of API_EXAMPLES) {
    const h = document.createElement('p');
    h.className = 'api-example-title';
    h.textContent = ex.title;
    apiEx.appendChild(h);
    apiEx.appendChild(codeBlock(ex.code, { onCopy, lang: ex.lang }));
  }
  custom.appendChild(apiEx);

  const mcpEx = section('Exemplos com o MCP');
  const intro = document.createElement('p');
  intro.className = 'profile-section-text';
  intro.textContent = 'Depois de conectar, pergunte. O modelo busca, abre a mensagem e cita data, página e figura do laudo.';
  mcpEx.appendChild(intro);
  for (const prompt of MCP_EXAMPLES) mcpEx.appendChild(codeBlock(prompt, { onCopy, lang: 'text' }));
  custom.appendChild(mcpEx);

  renderProfileSections(body, [], [], API_CREDITS, {});
  drawer.appendChild(body);

  if (sidebar) sidebar.style.display = 'none';
  const navRail = container.querySelector('.nav-rail');
  if (navRail && navRail.nextSibling) container.insertBefore(drawer, navRail.nextSibling);
  else container.appendChild(drawer);
  requestAnimationFrame(() => {
    drawer.classList.add('open');
    const target = wanted && drawer.querySelector(`#api-${wanted}`);
    if (target) target.scrollIntoView({ block: 'start' });
    else body.scrollTop = 0;
  });

  function destroy() {
    drawer.remove();
    if (sidebar) sidebar.style.display = '';
    if (onClose) onClose();
  }
  return { destroy, element: drawer };
}
