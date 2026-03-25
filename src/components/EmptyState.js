/**
 * EmptyState component — shown in the main area when no conversation is selected.
 * Matches WhatsApp Web's centered intro screen.
 *
 * Security note: innerHTML contains only static markup (no dynamic data).
 */

const LOCK_ICON = `<svg viewBox="0 0 10 12" width="10" height="12"><path fill="currentColor" d="M5.175 0A2.318 2.318 0 0 0 2.86 2.318v.884H1.5a1 1 0 0 0-1 1V11a1 1 0 0 0 1 1h7.35a1 1 0 0 0 1-1V4.202a1 1 0 0 0-1-1H7.491v-.884A2.317 2.317 0 0 0 5.175 0Zm0 1.05c.7 0 1.267.567 1.267 1.268v.884H3.909v-.884c0-.7.567-1.268 1.266-1.268Z"/></svg>`;

/**
 * @param {HTMLElement} container
 * @returns {HTMLElement}
 */
export function renderEmptyState(container) {
  const el = document.createElement('div');
  el.className = 'empty-state';

  // Entirely static content — safe innerHTML
  el.innerHTML = `
    <img
      class="empty-state-icon"
      src="/assets/masterzap-logo.png"
      alt=""
      aria-hidden="true"
    />
    <h1 class="empty-state-title">MasterZap Web</h1>
    <p class="empty-state-text">
      Visualizador de conversas vazadas do Daniel Vorcaro.<br>
      Selecione a conversa ao lado para começar.
    </p>
    <div class="empty-state-divider"></div>
    <div class="empty-state-footer">
      ${LOCK_ICON}
      <span>Suas mensagens são exibidas nacionalmente para todos do Brasil.</span>
    </div>
  `;

  container.appendChild(el);
  return el;
}
