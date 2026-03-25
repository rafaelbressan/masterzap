/**
 * ContextMenu component — right-click menu for messages.
 *
 * Actions: copy text, show message info drawer.
 * Positioned near the click point, auto-adjusts to stay within viewport.
 */

import { escapeHtml, formatDateLong, formatTime } from '../lib/utils.js';

/**
 * Create and manage a context menu for the chat area.
 * @param {HTMLElement} chatContainer - the .chat-messages element
 * @param {object} [options]
 * @param {Record<string,string>} [options.senderNames] - map short names to full names
 * @returns {{ destroy: function }}
 */
export function attachContextMenu(chatContainer, { senderNames = {}, incomingSender = '' } = {}) {
  let menuEl = null;
  let drawerEl = null;

  function show(x, y, msg) {
    hideMenu();

    menuEl = document.createElement('div');
    menuEl.className = 'context-menu';
    menuEl.setAttribute('role', 'menu');

    const items = buildMenuItems(msg);

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'context-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        item.action();
        hideMenu();
      });
      menuEl.appendChild(btn);
    }

    document.body.appendChild(menuEl);

    // Position — adjust to stay within viewport
    const rect = menuEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (x + rect.width > vw) left = vw - rect.width - 8;
    if (y + rect.height > vh) top = vh - rect.height - 8;
    if (left < 0) left = 8;
    if (top < 0) top = 8;

    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
  }

  function hideMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  function hideDrawer() {
    if (drawerEl) {
      drawerEl.classList.remove('open');
      setTimeout(() => {
        if (drawerEl) { drawerEl.remove(); drawerEl = null; }
      }, 200);
    }
  }

  function buildMenuItems(msg) {
    const items = [];

    // Copy text
    if (msg.content) {
      items.push({
        label: 'Copiar texto',
        action: () => {
          navigator.clipboard.writeText(msg.content).catch(() => {
            fallbackCopy(msg.content);
          });
        },
      });
    }

    // Message info drawer
    items.push({
      label: 'Info da mensagem',
      action: () => showDrawer(msg),
    });

    return items;
  }

  function showDrawer(msg) {
    hideDrawer();

    const senderDisplay = senderNames[msg.sender] || msg.sender || 'Desconhecido';

    drawerEl = document.createElement('div');
    drawerEl.className = 'msg-info-drawer';

    // Header
    const header = document.createElement('div');
    header.className = 'msg-info-drawer-header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'msg-info-drawer-close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', hideDrawer);
    header.appendChild(closeBtn);

    const title = document.createElement('span');
    title.className = 'msg-info-drawer-title';
    title.textContent = 'Info da mensagem';
    header.appendChild(title);

    drawerEl.appendChild(header);

    // Message preview bubble
    const preview = document.createElement('div');
    preview.className = 'msg-info-preview';

    const previewContent = document.createElement('div');
    previewContent.className = 'msg-info-preview-content';
    previewContent.textContent = msg.content || '(sem conteúdo)';
    preview.appendChild(previewContent);

    const previewMeta = document.createElement('span');
    previewMeta.className = 'msg-info-preview-meta';
    previewMeta.textContent = msg.time;
    preview.appendChild(previewMeta);

    drawerEl.appendChild(preview);

    // Info fields
    const fields = document.createElement('div');
    fields.className = 'msg-info-fields';

    fields.appendChild(createField('Remetente', senderDisplay));
    if (msg.date) {
      fields.appendChild(createField('Data', formatDateLong(msg.date)));
    }
    if (msg.time) {
      fields.appendChild(createField('Hora', msg.time));
    }
    if (msg.type && msg.type !== 'text') {
      const typeLabels = {
        image: 'Foto', video: 'Vídeo', audio: 'Áudio',
        document: 'Documento', call: 'Chamada', deleted: 'Apagada', system: 'Sistema',
      };
      fields.appendChild(createField('Tipo', typeLabels[msg.type] || msg.type));
    }
    if (msg.isEdited) {
      fields.appendChild(createField('Editada', 'Sim'));
    }

    drawerEl.appendChild(fields);

    // Mount to the app container (next to main area)
    const appContainer = chatContainer.closest('.app-container');
    if (appContainer) {
      appContainer.appendChild(drawerEl);
    } else {
      document.body.appendChild(drawerEl);
    }

    // Trigger open animation
    requestAnimationFrame(() => drawerEl.classList.add('open'));
  }

  function createField(label, value) {
    const row = document.createElement('div');
    row.className = 'msg-info-field';

    const labelEl = document.createElement('span');
    labelEl.className = 'msg-info-field-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'msg-info-field-value';
    valueEl.textContent = value;
    row.appendChild(valueEl);

    return row;
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  // Extract message data from a bubble element
  function getMessageFromElement(el) {
    const row = el.closest('.chat-msg-row');
    if (!row) return null;

    const id = row.dataset.id;
    const content = row.querySelector('.chat-msg-content')?.textContent || '';
    const meta = row.querySelector('.chat-msg-meta')?.textContent || '';
    const isOutgoing = row.classList.contains('outgoing');
    const isEdited = !!row.querySelector('.chat-msg-edited');

    // Try to find the date from the parent day section
    const daySection = row.closest('.chat-day');
    const date = daySection?.dataset.date || '';

    return {
      id,
      content,
      sender: isOutgoing ? 'DV' : incomingSender,
      date,
      time: meta.replace(/editada/i, '').trim(),
      type: 'text',
      isEdited,
    };
  }

  function onContextMenu(e) {
    const bubble = e.target.closest('.chat-msg-bubble, .chat-msg-system');
    if (!bubble) {
      hideMenu();
      return;
    }

    e.preventDefault();
    const msg = getMessageFromElement(bubble);
    if (msg) {
      show(e.clientX, e.clientY, msg);
    }
  }

  function onClickOutside(e) {
    if (menuEl && !menuEl.contains(e.target)) {
      hideMenu();
    }
    if (drawerEl && !drawerEl.contains(e.target)) {
      hideDrawer();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      hideMenu();
      hideDrawer();
    }
  }

  // Attach listeners
  chatContainer.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', onClickOutside, true);
  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      hideMenu();
      hideDrawer();
      chatContainer.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('click', onClickOutside, true);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
