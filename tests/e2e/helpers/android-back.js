// Android's back, as Chrome delivers it to a page with an open CloseWatcher:
// a close request to the newest watcher, not a history traversal. Playwright
// has no back button to press, so the watchers are recorded as the page makes
// them and the newest one is asked to close, which is what the button does.
export async function recordCloseWatchers(page) {
  await page.addInitScript(() => {
    const Native = window.CloseWatcher;
    if (typeof Native !== 'function') return;
    window.__closeWatchers = [];
    const forget = (watcher) => {
      window.__closeWatchers = window.__closeWatchers.filter(w => w !== watcher);
    };
    // Only live watchers are kept: a destroyed or closed one no longer gets back.
    window.CloseWatcher = class extends Native {
      constructor(...args) {
        super(...args);
        window.__closeWatchers.push(this);
        this.addEventListener('close', () => forget(this));
      }
      destroy() {
        forget(this);
        super.destroy();
      }
    };
  });
}

/** Press Android's back. Falls back to a history back without CloseWatcher. */
export async function pressAndroidBack(page) {
  const handled = await page.evaluate(() => {
    const watcher = window.__closeWatchers?.at(-1);
    if (!watcher) return false;
    watcher.requestClose();
    return true;
  });
  if (!handled) await page.goBack();
}
