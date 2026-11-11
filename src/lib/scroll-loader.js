/**
 * ScrollLoader — lazy-loads day-chunks as user scrolls through chat history.
 *
 * Starts from the most recent days, loads older days when the user scrolls
 * near the top. Uses IntersectionObserver for efficient scroll detection.
 */

import { compareDates } from './utils.js';

const INITIAL_DAYS = 5;
const LOAD_MORE_DAYS = 5;
const LOAD_ATTEMPTS = 2;
// A place further up than this is restored as a jump (see restorePosition).
const RESTORE_CONTIGUOUS_MAX_DAYS = 30;
// Closer than this to the end counts as "at the end".
const AT_END_PX = 48;

export class ScrollLoader {
  /**
   * @param {object} options
   * @param {HTMLElement} options.container - scrollable chat messages container
   * @param {Array} options.dateIndex - array of { date, message_count } from conversation index
   * @param {function} options.loadMessages - async (date) => messages[]
   * @param {function} options.renderDay - (date, messages, container) => HTMLElement
   */
  constructor({ container, dateIndex, loadMessages, renderDay }) {
    this._container = container;
    this._dateIndex = dateIndex;
    this._loadMessages = loadMessages;
    this._renderDay = renderDay;
    this._loadedDates = new Set();
    this._loading = false;
    this._nextIndex = dateIndex.length - 1; // Start from most recent
    this._observer = null;
    this._sentinel = null;
  }

  /**
   * Load initial days and set up scroll observation.
   * @param {object} [options]
   * @param {object} [options.position] - from currentPosition() on an earlier
   *   visit: open there instead of at the newest message
   */
  async init({ position = null } = {}) {
    // Create top sentinel for IntersectionObserver
    this._sentinel = document.createElement('div');
    this._sentinel.className = 'scroll-sentinel';
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._container.prepend(this._sentinel);

    // Load initial batch (most recent days)
    await this._loadBatch(INITIAL_DAYS);

    // Back where the reader left off, or at the most recent messages.
    if (!position || !(await this.restorePosition(position))) this._scrollToBottom();
    if (this._destroyed) return;
    // From here on, where the reader is means something (currentPosition).
    this._ready = true;

    // Observe sentinel to load more when user scrolls up
    this._observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this._loading) {
          this._loadUntilOutOfRange();
        }
      },
      { root: this._container, rootMargin: '200px 0px 0px 0px' }
    );
    this._observer.observe(this._sentinel);
  }

  /**
   * Load N more days (going backwards from current position).
   * @param {number} count
   */
  async _loadBatch(count) {
    if (this._destroyed || this._loading || this._nextIndex < 0) return false;
    this._loading = true;

    const scrollHeightBefore = this._container.scrollHeight;
    const scrollTopBefore = this._container.scrollTop;

    // Remember the first day still in view and where it sits, so the reader
    // stays on it however much lands above. Measuring scrollHeight alone goes
    // wrong when a day arrives below the view (one loadDate() put there).
    const containerTop = this._container.getBoundingClientRect().top;
    const scrollAnchor = scrollTopBefore > 0
      ? Array.from(this._container.querySelectorAll('[data-date]'))
        .find(section => section.getBoundingClientRect().bottom > containerTop)
      : null;
    const scrollAnchorTop = scrollAnchor?.getBoundingClientRect().top;

    let loaded = 0;
    let failed = false;
    while (loaded < count && this._nextIndex >= 0 && !this._destroyed) {
      const entry = this._dateIndex[this._nextIndex];

      // Already on screen (a search or a shared link jumped to it).
      if (this._loadedDates.has(entry.date)) {
        this._nextIndex--;
        continue;
      }

      // A day that fails is tried once more before giving up on it: a blip
      // in the connection should not leave a hole in the conversation. One
      // that fails twice is skipped — stopping there would wall off all the
      // history before it, since the observer will not fire again while the
      // sentinel sits in view.
      let messages = null;
      for (let attempt = 1; attempt <= LOAD_ATTEMPTS && messages === null; attempt++) {
        try {
          messages = await this._loadMessages(entry.date);
        } catch (err) {
          console.error(`Failed to load day ${entry.date} (attempt ${attempt}):`, err);
        }
      }
      this._nextIndex--;
      if (messages === null) {
        failed = true;
        continue;
      }
      // loadDate() may have put this day on screen while we were waiting.
      if (this._loadedDates.has(entry.date)) continue;

      this._insertDayInChronologicalOrder(this._renderDay(entry.date, messages));
      this._loadedDates.add(entry.date);
      loaded++;
    }

    // Preserve scroll position when prepending content
    if (loaded > 0 && scrollTopBefore > 0) {
      if (scrollAnchor?.isConnected) {
        // Relative, not from scrollTopBefore: Chrome and Firefox anchor the
        // scroll themselves (overflow-anchor) and have already moved it, so
        // the anchor's shift is whatever is left to correct — zero there, the
        // height of the new days in Safari.
        this._container.scrollTop += scrollAnchor.getBoundingClientRect().top - scrollAnchorTop;
      } else {
        const scrollHeightAfter = this._container.scrollHeight;
        this._container.scrollTop = scrollTopBefore + (scrollHeightAfter - scrollHeightBefore);
      }
    }

    this._loading = false;

    // If no more days to load, hide sentinel
    if (this._nextIndex < 0 && this._sentinel) {
      this._observer?.unobserve(this._sentinel);
    }

    return failed;
  }

  /**
   * Load enough history to make the container scrollable past the observer's
   * root margin. The sentinel stays at the top of the container as days are
   * inserted after it, so checking the sentinel's rect would keep loading the
   * entire conversation in one go. Short days (a conversation of one-liners)
   * would otherwise leave the sentinel in view with nothing left to scroll,
   * and the observer, which only fires on a change, would never fire again.
   */
  async _loadUntilOutOfRange() {
    while (!this._loading && this._nextIndex >= 0) {
      const loadedBefore = this._loadedDates.size;
      const failed = await this._loadBatch(LOAD_MORE_DAYS);
      if (this._nextIndex < 0) return;
      if (failed && this._loadedDates.size === loadedBefore) return;
      if (this._container.scrollHeight > this._container.clientHeight + 200) return;
      if (this._loadedDates.size === loadedBefore) return;
    }
  }

  /**
   * Put a day section among the others by date. Days arrive out of order: the
   * scroll loads them newest to oldest, a jump to a message loads one anywhere.
   */
  _insertDayInChronologicalOrder(dayEl) {
    const date = dayEl.dataset.date;
    const existingSections = Array.from(this._container.querySelectorAll('[data-date]'));
    const nextSection = existingSections.find(section => compareDates(section.dataset.date, date) > 0);
    this._container.insertBefore(dayEl, nextSection || null);
  }

  /**
   * Where the reader is: the first message in view, its day, and how far its
   * top sits below the top of the chat. null when the reader is at the end —
   * the next visit should open at the newest message anyway.
   * undefined when there is nothing to say: the chat is still loading (the
   * reader has not been put anywhere yet) or is hidden behind a drawer, where
   * every measure reads 0 — saving then would overwrite the real place.
   * @returns {{date: string, id: string, offset: number, contiguous: boolean}|null|undefined}
   */
  currentPosition() {
    const c = this._container;
    if (!this._ready || this._destroyed || c.clientHeight === 0) return undefined;
    if (c.scrollHeight - c.scrollTop - c.clientHeight < AT_END_PX) return null;
    const top = c.getBoundingClientRect().top;
    const row = Array.from(c.querySelectorAll('[data-id]')).find(r => r.getBoundingClientRect().bottom > top);
    const date = row?.closest('[data-date]')?.dataset.date;
    if (!row || !date) return null;
    const index = this._dateIndex.findIndex(d => d.date === date);
    return {
      date,
      id: row.dataset.id,
      offset: Math.round(row.getBoundingClientRect().top - top),
      // Reached by scrolling up from the end (every day in between is on
      // screen), as opposed to a jump — a link, the calendar, a search hit.
      contiguous: index >= 0 && this._nextIndex < index,
    };
  }

  /**
   * Put the reader back where currentPosition() found them. A place reached
   * by scrolling comes back with every day between it and the end, so
   * scrolling down shows them again; a jump loads just its day, as a link
   * does.
   * @returns {Promise<boolean>} false when the place no longer exists
   */
  async restorePosition({ date, id, offset = 0, contiguous = false }) {
    const index = this._dateIndex.findIndex(d => d.date === date);
    // Ids are numbers; anything else came from tampered storage.
    if (index < 0 || !/^\d+$/.test(String(id))) return false;
    // Far up a long conversation, bringing back every day in between is
    // hundreds of requests and tens of thousands of rows: go there as a jump.
    const between = this._nextIndex - index + 1;
    if (contiguous && between <= RESTORE_CONTIGUOUS_MAX_DAYS) {
      // Ask for the days in parallel; the loop below then renders them in
      // order (the data store dedups requests and caches the answers).
      const wanted = this._dateIndex.slice(index, this._nextIndex + 1).map(d => d.date);
      await Promise.allSettled(wanted.map(d => this._loadMessages(d)));
      while (this._nextIndex >= index && !this._destroyed) {
        const before = this._nextIndex;
        await this._loadBatch(LOAD_MORE_DAYS);
        if (this._nextIndex === before) break;
      }
    } else {
      await this.loadDate(date);
    }
    if (this._destroyed) return false;
    const row = this._container.querySelector(`[data-date="${date}"] [data-id="${id}"]`);
    if (!row) return false;
    this._container.scrollTop += row.getBoundingClientRect().top
      - this._container.getBoundingClientRect().top - offset;
    return true;
  }

  /** Scroll container to the bottom. */
  _scrollToBottom() {
    this._container.scrollTop = this._container.scrollHeight;
  }

  /** Scroll to bottom (public, for use after conversation switch). */
  scrollToBottom() {
    this._scrollToBottom();
  }

  /** Check if all days have been loaded. */
  get isFullyLoaded() {
    return this._nextIndex < 0;
  }

  /** Number of days currently loaded in the DOM. */
  get loadedCount() {
    return this._loadedDates.size;
  }

  /**
   * Load a specific date (if not already loaded) and return the day element.
   * @param {string} date - ISO date string
   * @returns {Promise<HTMLElement|null>}
   */
  async loadDate(date) {
    if (this._loadedDates.has(date)) {
      return this._container.querySelector(`[data-date="${date}"]`);
    }

    try {
      const messages = await this._loadMessages(date);
      // The scroll may have loaded this day while we were waiting.
      if (this._loadedDates.has(date)) return this._container.querySelector(`[data-date="${date}"]`);
      const dayEl = this._renderDay(date, messages);
      this._insertDayInChronologicalOrder(dayEl);

      this._loadedDates.add(date);
      return dayEl;
    } catch (err) {
      console.error(`Failed to load day ${date}:`, err);
      return null;
    }
  }

  /**
   * Scroll to a specific message by ID, loading its date if needed.
   * @param {string|number} messageId
   * @param {string} date - the date the message belongs to
   * @param {boolean} [highlight=true] - flash-highlight the message
   */
  async scrollToMessage(messageId, date, highlight = true) {
    await this.loadDate(date);

    const msgEl = this._container.querySelector(`[data-id="${messageId}"]`);
    if (msgEl) {
      msgEl.scrollIntoView({ block: 'center' });
      if (highlight) {
        // Remove + reflow + re-add to restart animation on repeated clicks
        msgEl.classList.remove('msg-highlight');
        void msgEl.offsetHeight;
        msgEl.classList.add('msg-highlight');
        setTimeout(() => msgEl.classList.remove('msg-highlight'), 1500);
      }
    }
  }

  /**
   * Scroll to the first message of a specific date.
   * @param {string} date - ISO date string
   */
  async scrollToDate(date) {
    const dayEl = await this.loadDate(date);
    if (dayEl) {
      // Find first message row in this day section
      const firstMsg = dayEl.querySelector('.chat-msg-row');
      if (firstMsg) {
        firstMsg.scrollIntoView({ block: 'center' });
        firstMsg.classList.remove('msg-highlight');
        void firstMsg.offsetHeight;
        firstMsg.classList.add('msg-highlight');
        setTimeout(() => firstMsg.classList.remove('msg-highlight'), 1500);
      } else {
        dayEl.scrollIntoView({ block: 'center' });
      }
    }
  }

  /** Clean up observer. */
  destroy() {
    this._destroyed = true;
    this._observer?.disconnect();
    this._observer = null;
  }
}
