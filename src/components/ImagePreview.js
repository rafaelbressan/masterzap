/**
 * Full-screen preview of a generated image, for when the platform refuses to
 * take it any other way.
 *
 * This is only reached after both better routes were tried and failed, so it
 * offers exactly what the browser can actually do and nothing else. A button
 * that turns out not to work is worse than no button: it suggests the thing is
 * possible and then takes it away.
 *
 * Where sharing files is genuinely unavailable (Firefox, most desktops), the
 * download starts on its own — asking for a click, only to have the browser ask
 * for confirmation on top of it, is two prompts for something already decided.
 * The image stays on screen because a long press on it opens the browser's own
 * menu, which copies, saves and shares.
 *
 * On Android the back button is how people leave a sheet, and here it used to
 * leave the conversation instead: the router saw a hash change and went to the
 * list. So opening pushes a history entry and closing pops it — back closes
 * the preview and nothing else. Closing by the X or Escape pops the same entry,
 * or the next back press would jump one step too far.
 *
 * Security note: innerHTML is used only with static markup; the image arrives
 * as an object URL, assigned through the src property.
 */

const HISTORY_MARK = { masterwhatsImagePreview: true };

const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Show the image and whatever the platform can genuinely do with it.
 *
 * @param {HTMLElement} container
 * @param {Blob} blob
 * @param {object} options
 * @param {string} options.filename
 * @param {function} [options.onShare] - pass only when the platform really can
 *   share files; resolves 'shared' | 'cancelled' | 'unsupported'
 * @param {function} [options.onClose]
 * @returns {{ element: HTMLElement, destroy: function }}
 */
export function showImagePreview(container, blob, { filename, onShare, onClose } = {}) {
  const url = URL.createObjectURL(blob);

  const overlay = document.createElement('div');
  overlay.className = 'image-preview';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Print da conversa');

  overlay.innerHTML = `
    <div class="image-preview-bar">
      <button class="image-preview-close" aria-label="Fechar">${ICON_CLOSE}</button>
      <span class="image-preview-title">Print da conversa</span>
    </div>
    <div class="image-preview-body">
      <img class="image-preview-img" alt="Print da conversa" />
    </div>
    <div class="image-preview-footer">
      <p class="image-preview-hint"></p>
      <div class="image-preview-actions"></div>
    </div>
  `;

  overlay.querySelector('.image-preview-img').src = url;

  const hint = overlay.querySelector('.image-preview-hint');
  const actions = overlay.querySelector('.image-preview-actions');

  function download() {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (onShare) {
    hint.textContent = 'Ou toque e segure na imagem para usar o menu do navegador.';

    const shareBtn = document.createElement('button');
    shareBtn.className = 'image-preview-action wds-button wds-button--filled';
    shareBtn.textContent = 'Compartilhar';
    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      const result = await onShare();
      shareBtn.disabled = false;

      if (result === 'shared') { close(); return; }
      if (result === 'cancelled') return;

      // The platform said no after all. Drop the button rather than leave one
      // that does nothing, and fall back to what does work.
      shareBtn.remove();
      hint.textContent = 'Toque e segure na imagem para copiar, salvar ou compartilhar.';
      download();
    });
    actions.appendChild(shareBtn);
  } else {
    // Nothing to offer but the file itself, so it is already on its way.
    hint.textContent = 'Imagem salva. Toque e segure nela para copiar ou compartilhar.';
    download();
  }

  function ownsHistoryEntry() {
    return typeof history !== 'undefined' && !!history.state?.masterwhatsImagePreview;
  }

  function onPopstate() {
    // Back was pressed: our entry is already gone, so just close.
    window.removeEventListener('popstate', onPopstate);
    close();
  }

  function destroy() {
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('popstate', onPopstate);
    overlay.remove();
    URL.revokeObjectURL(url);
    // Closed by the X, Escape or the backdrop: take our entry with us.
    if (ownsHistoryEntry()) history.back();
  }

  function close() {
    destroy();
    if (onClose) onClose();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  overlay.querySelector('.image-preview-close').addEventListener('click', close);
  // Tapping the backdrop closes; tapping the image must not, or a long press
  // that starts as a tap would dismiss the thing being shared.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown, true);
  if (typeof history !== 'undefined') {
    history.pushState(HISTORY_MARK, '');
    window.addEventListener('popstate', onPopstate);
  }

  container.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  return { element: overlay, destroy };
}
