/**
 * A list kept in this browser's localStorage — the reader's own marks and
 * pins — shared by the modules that keep one.
 *
 * - What comes back from storage goes through `validate`, so a corrupt or
 *   hand-edited entry is dropped, never used.
 * - Storage can be unavailable (private mode, blocked site data, full); the
 *   list then lives in memory for the visit, and nothing reloads over it.
 * - Before a change, `fresh()` reads storage again: another tab may have
 *   changed the list, and saving a stale copy would undo what it did. A
 *   change made in another tab is picked up and announced.
 *
 * @param {string} key - the localStorage key
 * @param {function} validate - (saved array) => the list to keep
 * @param {string} eventName - the window event announcing a change
 */
export function createStoredList(key, validate, eventName) {
  let items = null;
  let stored = true; // false once saving fails: then memory is the only copy

  function load() {
    if (items) return items;
    items = [];
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) items = validate(saved);
    } catch { /* storage unavailable or unreadable: start empty */ }
    return items;
  }

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(items));
      stored = true;
    } catch {
      stored = false; // storage unavailable or full: the list lasts for the visit
    }
  }

  /** The list as storage has it now (or memory's, when storage fails). */
  function fresh() {
    if (stored) items = null;
    return load();
  }

  function announce(detail = {}) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key && e.key !== null) return;
      // Saving fails here: memory holds the only copy; keep it.
      if (!stored) return;
      items = null;
      announce({ all: true });
    });
  }

  /** Forget the in-memory copy (for tests). */
  function reset() {
    items = null;
    stored = true;
  }

  return { load, save, fresh, announce, reset };
}
