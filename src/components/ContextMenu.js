/**
 * ContextMenu component — right-click menu for messages.
 *
 * Actions: copy text, copy message info.
 * Positioned near the click point, auto-adjusts to stay within viewport.
 */

/**
 * Create and manage a context menu for the chat area.
 * @param {HTMLElement} chatContainer - the .chat-messages element
 * @returns {{ destroy: function }}
 */
export function attachContextMenu(chatContainer) {
  let menuEl = null;

  function show(x, y, msg) {
    hide();

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
        hide();
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

  function hide() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
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
            // Fallback for non-secure contexts
            fallbackCopy(msg.content);
          });
        },
      });
    }

    // Copy message info (sender + date + time)
    items.push({
      label: 'Copiar info',
      action: () => {
        const info = `${msg.sender} · ${msg.date} ${msg.time}`;
        navigator.clipboard.writeText(info).catch(() => {
          fallbackCopy(info);
        });
      },
    });

    return items;
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

    return {
      id,
      content,
      sender: isOutgoing ? 'DV' : '',
      date: '',
      time: meta.trim(),
    };
  }

  function onContextMenu(e) {
    const bubble = e.target.closest('.chat-msg-bubble, .chat-msg-system');
    if (!bubble) {
      hide();
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
      hide();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') hide();
  }

  // Attach listeners
  chatContainer.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('click', onClickOutside, true);
  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      hide();
      chatContainer.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('click', onClickOutside, true);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
