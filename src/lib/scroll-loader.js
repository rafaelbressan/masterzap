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

  /** Load initial days and set up scroll observation. */
  async init() {
    // Create top sentinel for IntersectionObserver
    this._sentinel = document.createElement('div');
    this._sentinel.className = 'scroll-sentinel';
    this._sentinel.setAttribute('aria-hidden', 'true');
    this._container.prepend(this._sentinel);

    // Load initial batch (most recent days)
    await this._loadBatch(INITIAL_DAYS);

    // Scroll to bottom (most recent messages)
    this._scrollToBottom();

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
    if (this._loading || this._nextIndex < 0) return false;
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
    while (loaded < count && this._nextIndex >= 0) {
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
    this._observer?.disconnect();
    this._observer = null;
  }
}
