/**
 * ContextMenu component — right-click menu for messages.
 *
 * Actions: copy text, share, mark as important, show message info drawer.
 * Positioned near the click point, auto-adjusts to stay within viewport.
 */

import { DEFAULT_OWNER } from '../lib/participants.js';
import { openMenu, menuClosed } from '../lib/menus.js';
import { escapeHtml, formatDateLong, formatTime, NO_TIME_LABEL } from '../lib/utils.js';
import { showToast } from './Toast.js';
import { ICON_COPY, ICON_SEND, ICON_INFO, ICON_STAR } from '../lib/icons.js';
import { isImportant, toggleImportant } from '../lib/important-messages.js';

/**
 * Create and manage a context menu for the chat area.
 * @param {HTMLElement} chatContainer - the .chat-messages element
 * @param {object} [options]
 * @param {Record<string,string>} [options.senderNames] - map short names to full names
 * @param {string} [options.outgoingSender] - the phone owner's sender id
 * @returns {{ destroy: function }}
 */
export function attachContextMenu(chatContainer, { senderNames = {}, incomingSender = '', outgoingSender = DEFAULT_OWNER, conversationId = '' } = {}) {
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
      // Static SVG icons from icons.js + static labels — safe innerHTML
      if (item.icon) {
        btn.innerHTML = `<span class="context-menu-icon">${item.icon}</span><span>${item.label}</span>`;
      } else {
        btn.textContent = item.label;
      }
      btn.addEventListener('click', () => {
        item.action();
        hideMenu();
      });
      menuEl.appendChild(btn);
    }

    document.body.appendChild(menuEl);
    // The only menu on screen; any touch or click outside closes it.
    openMenu(menuEl, hideMenu);

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
      menuClosed(menuEl);
      menuEl.remove();
      menuEl = null;
    }
  }

  function hideDrawer() {
    if (drawerEl) {
      drawerEl.remove();
      drawerEl = null;
    }
  }

  function buildMenuItems(msg) {
    const items = [];

    // Copy text
    if (msg.content) {
      items.push({
        label: 'Copiar texto',
        icon: ICON_COPY,
        action: () => {
          navigator.clipboard.writeText(msg.content).catch(() => {
            fallbackCopy(msg.content);
          });
        },
      });
    }

    // Share link
    if (msg.id && conversationId) {
      items.push({
        label: 'Compartilhar texto',
        icon: ICON_SEND,
        action: () => {
          const baseUrl = window.location.origin;
          const shareUrl = `${baseUrl}/#/chat/${conversationId}/msg/${msg.id}`;
          const senderDisplay = senderNames[msg.sender] || msg.sender || '';
          const shareText = msg.content ? `"${msg.content}" — ${senderDisplay}` : '';

          if (navigator.share) {
            navigator.share({
              title: 'MasterWhats',
              text: shareText,
              url: shareUrl,
            }).catch(() => {
              // Fallback to clipboard
              copyAndToast(shareUrl);
            });
          } else {
            copyAndToast(shareUrl);
          }
        },
      });
    }

    // Mark as important (the star), as WhatsApp. Saved in this browser; the
    // bubble's star follows through the 'importantchange' event. A system
    // line (someone added, a number changed) cannot be marked, as on WhatsApp.
    if (msg.id && conversationId && !msg.isSystem && !msg.isDeleted) {
      const marked = isImportant(conversationId, msg.id);
      items.push({
        label: marked ? 'Desmarcar como importante' : 'Marcar como importante',
        icon: ICON_STAR,
        action: () => toggleImportant({ ...msg, conversationId }),
      });
    }

    // Message info drawer
    items.push({
      label: 'Info da mensagem',
      icon: ICON_INFO,
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
    previewMeta.textContent = formatTime(msg.time);
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
    } else {
      fields.appendChild(createField('Hora', NO_TIME_LABEL));
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

    // Mount inside the main area so width % is relative to the chat panel
    const mainArea = chatContainer.closest('.main-area');
    if (mainArea) {
      mainArea.appendChild(drawerEl);
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

  function copyAndToast(text) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    const toastContainer = chatContainer.closest('.chat-view') || chatContainer;
    showToast(toastContainer, 'Link copiado para a área de transferência');
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
    // A text message: its own text (clean, with its line breaks), not the
    // labels the bubble draws around it. Anything else (a location, an audio
    // note, a document): what the bubble shows, without the source's markers
    // ("[localização] Latitude…", "[transcrição do áudio]").
    const drawnEl = row.querySelector('.chat-msg-content');
    const drawn = (drawnEl?.innerText ?? drawnEl?.textContent ?? '').trim();
    const content = row._message?.type === 'text' ? row._message.content : drawn;
    const meta = row.querySelector('.chat-msg-meta')?.textContent || '';
    const isOutgoing = row.classList.contains('outgoing');
    const isEdited = !!row.querySelector('.chat-msg-edited');

    // Try to find the date from the parent day section
    const daySection = row.closest('.chat-day');
    const date = daySection?.dataset.date || '';

    // The message itself when the bubble carries it (sender and time as the
    // data has them); otherwise what the bubble shows.
    const message = row._message;
    return {
      id,
      content,
      sender: message?.sender ?? (isOutgoing ? outgoingSender : incomingSender),
      date: message?.date ?? date,
      // "--:--" is how the bubble draws an unknown time; it is not a time.
      time: message ? (message.time || '').slice(0, 5) || null : (meta.replace(/editada/i, '').trim().match(/\d{2}:\d{2}/) || [null])[0],
      type: 'text',
      isEdited,
      isSystem: row.classList.contains('system') || message?.type === 'system',
      isDeleted: message?.type === 'deleted',
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

  // Chevron button click → open context menu at chevron position
  function onChevronClick(e) {
    const chevron = e.target.closest('.chat-msg-chevron');
    if (!chevron) return;
    e.stopPropagation();
    const bubble = chevron.closest('.chat-msg-bubble');
    if (!bubble) return;
    const msg = getMessageFromElement(bubble);
    if (msg) {
      const rect = chevron.getBoundingClientRect();
      show(rect.left, rect.bottom + 4, msg);
    }
  }

  // Attach listeners
  chatContainer.addEventListener('contextmenu', onContextMenu);
  chatContainer.addEventListener('click', onChevronClick);
  document.addEventListener('click', onClickOutside, true);
  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      hideMenu();
      hideDrawer();
      chatContainer.removeEventListener('contextmenu', onContextMenu);
      chatContainer.removeEventListener('click', onChevronClick);
      document.removeEventListener('click', onClickOutside, true);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
