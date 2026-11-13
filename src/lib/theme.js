/**
 * Light or dark, as WhatsApp's "Tema": Claro, Escuro or Padrão do sistema.
 *
 * The choice is kept in this browser. With none saved, or "Padrão do
 * sistema", the page follows the device (prefers-color-scheme) and changes
 * with it. The resolved theme goes on <html data-theme>, which
 * dark-theme.css reads; the one-line script in index.html's <head> does the
 * same before the first paint, so the page never flashes the other theme.
 *
 * Storage can be unavailable (private mode, blocked site data): the choice
 * then lasts for the visit.
 */

export const THEME_KEY = 'masterwhats:tema';
const CHOICES = ['light', 'dark', 'system'];

/** The browser's bar colour, as WhatsApp's surface in each theme. */
export const THEME_COLOR = { light: '#1DAA61', dark: '#161717' };

let inMemory = null; // the choice, once saving it failed

/** @returns {'light'|'dark'|'system'} */
export function themeChoice() {
  if (inMemory) return inMemory;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return CHOICES.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function deviceIsDark() {
  try {
    return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** @returns {'light'|'dark'} the theme on screen for the current choice */
export function resolvedTheme(choice = themeChoice()) {
  if (choice === 'system') return deviceIsDark() ? 'dark' : 'light';
  return choice;
}

/** Put the current choice on the page. */
export function applyTheme() {
  const theme = resolvedTheme();
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Save a choice and show it.
 * @param {'light'|'dark'|'system'} choice
 */
export function setThemeChoice(choice) {
  if (!CHOICES.includes(choice)) return;
  try {
    localStorage.setItem(THEME_KEY, choice);
    inMemory = null;
  } catch {
    inMemory = choice; // not saved: it lasts for the visit
  }
  applyTheme();
}

let watching = false;
/**
 * Show the saved choice and keep following it: the device's theme (for
 * "Padrão do sistema") and a choice made in another tab.
 */
export function initTheme() {
  applyTheme();
  if (watching) return;
  watching = true;
  try {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  } catch { /* no matchMedia: light */ }
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY || e.key === null) applyTheme();
  });
}

/** Forget the in-memory choice (for tests). */
export function resetTheme() {
  inMemory = null;
}
