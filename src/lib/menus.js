/**
 * One floating menu at a time, closed by any touch or click outside it.
 *
 * The chat has several menus — the message's (right click, long press, the
 * chevron), the chat background's, the header's ⋮ — written separately. Each
 * used to close only itself, and only on `click`. A long press fires
 * `contextmenu`, not `click`, so opening one left the other open; and on a
 * phone the tap after a long press may never become a `click` at all, so a
 * menu stayed up with no way out.
 *
 * Here: opening a menu closes the one before it, whoever owns it. A
 * `pointerdown` anywhere outside the open menu (touch, pen or mouse, before
 * any click), a `contextmenu` outside it, Escape, the reader starting to
 * scroll (wheel or finger) or the window losing focus all close it. Scrolling
 * the app does itself (loading older days) does not.
 */

let current = null; // { element, close }

function onPointerDown(e) {
  if (current && !current.element.contains(e.target) && !current.keep?.(e.target)) closeOpenMenu();
}

function onContextMenu(e) {
  // A long press or right click elsewhere opens its own menu (or none):
  // either way this one goes. Runs in the capture phase, before the new one.
  if (current && !current.element.contains(e.target)) closeOpenMenu();
}

function onKeyDown(e) {
  if (e.key === 'Escape') closeOpenMenu();
}

function onUserScroll(e) {
  // A menu points at something; once the reader moves it, the menu is wrong.
  if (current && !current.element.contains(e.target)) closeOpenMenu();
}

function listen(on) {
  const method = on ? 'addEventListener' : 'removeEventListener';
  document[method]('pointerdown', onPointerDown, true);
  document[method]('contextmenu', onContextMenu, true);
  document[method]('keydown', onKeyDown);
  document[method]('wheel', onUserScroll, { capture: true, passive: true });
  document[method]('touchmove', onUserScroll, { capture: true, passive: true });
  window[method]('blur', closeOpenMenu);
}

/**
 * Register a menu that has just been put on screen.
 * @param {HTMLElement} element - the menu
 * @param {function} close - removes it (called at most once)
 * @param {object} [options]
 * @param {function} [options.keep] - (target) => true for elements that must
 *   not close the menu, e.g. the button that toggles it
 */
export function openMenu(element, close, { keep } = {}) {
  closeOpenMenu();
  current = { element, close, keep };
  listen(true);
}

/** Close whatever menu is open. */
export function closeOpenMenu() {
  if (!current) return;
  const { close } = current;
  current = null;
  listen(false);
  close();
}

/** Forget a menu its owner already removed, without calling its close. */
export function menuClosed(element) {
  if (current?.element === element) {
    current = null;
    listen(false);
  }
}

/** For tests. */
export const openMenuElement = () => current?.element || null;
