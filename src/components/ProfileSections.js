/**
 * ProfileSections — renders investigation/profile sections with linked text.
 * Shared between DV's profile drawer and Martha's contact info.
 *
 * Security note: innerHTML used with parseLinks() which processes ONLY static
 * content from profile-content.js — a source file we control, not user input.
 * The link format {text}[url] is parsed with a regex that only produces <a> tags.
 */
import { parseLinks } from '../lib/profile-content.js';

/**
 * Render profile sections into a container.
 * @param {HTMLElement} container
 * @param {Array} sections - array of { title, paragraphs: [{ text }] }
 * @param {Array} [sources] - array of { label, url }
 * @param {string} [credits]
 * @param {Record<string, function>} [actions] - handlers for action: links
 */
export function renderProfileSections(container, sections, sources, credits, actions = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'profile-sections';

  for (const section of sections) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'profile-section';

    if (section.title) {
      const h3 = document.createElement('h3');
      h3.className = 'profile-section-title';
      h3.textContent = section.title;
      sectionEl.appendChild(h3);
    }

    for (const para of section.paragraphs) {
      const p = document.createElement('p');
      p.className = 'profile-section-text';
      // Static content from profile-content.js with inline {text}[url] links
      p.innerHTML = parseLinks(para.text);
      sectionEl.appendChild(p);
    }

    wrapper.appendChild(sectionEl);
  }

  // Sources
  if (sources && sources.length > 0) {
    const sourcesEl = document.createElement('details');
    sourcesEl.className = 'profile-sources';

    const summary = document.createElement('summary');
    summary.textContent = 'Fontes e reportagens consultadas';
    sourcesEl.appendChild(summary);

    const list = document.createElement('ul');
    for (const src of sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = src.label;
      li.appendChild(a);
      list.appendChild(li);
    }
    sourcesEl.appendChild(list);
    wrapper.appendChild(sourcesEl);
  }

  // Credits
  if (credits) {
    const footer = document.createElement('div');
    footer.className = 'profile-credits';
    footer.textContent = credits;
    wrapper.appendChild(footer);
  }

  // Handle action: link clicks
  wrapper.addEventListener('click', (e) => {
    const actionLink = e.target.closest('[data-action]');
    if (!actionLink) return;
    e.preventDefault();
    e.stopPropagation();
    const action = actionLink.dataset.action;
    console.log('[ProfileSections] action click:', action, 'available actions:', Object.keys(actions));
    if (action.startsWith('action:search:')) {
      const term = action.replace('action:search:', '');
      console.log('[ProfileSections] onSearch:', term, 'handler exists:', !!actions.onSearch);
      if (actions.onSearch) actions.onSearch(term);
    } else if (action === 'action:contact-martha') {
      console.log('[ProfileSections] onContactMartha handler exists:', !!actions.onContactMartha);
      if (actions.onContactMartha) actions.onContactMartha();
    } else if (action === 'action:profile-dv') {
      console.log('[ProfileSections] onProfileDV handler exists:', !!actions.onProfileDV);
      if (actions.onProfileDV) actions.onProfileDV();
    }
  });

  container.appendChild(wrapper);
}
