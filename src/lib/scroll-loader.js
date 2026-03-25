/**
 * ScrollLoader — lazy-loads day-chunks as user scrolls through chat history.
 *
 * Starts from the most recent days, loads older days when the user scrolls
 * near the top. Uses IntersectionObserver for efficient scroll detection.
 */

const INITIAL_DAYS = 5;
const LOAD_MORE_DAYS = 5;

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
          this._loadBatch(LOAD_MORE_DAYS);
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
    if (this._loading || this._nextIndex < 0) return;
    this._loading = true;

    const scrollHeightBefore = this._container.scrollHeight;
    const scrollTopBefore = this._container.scrollTop;

    let loaded = 0;
    while (loaded < count && this._nextIndex >= 0) {
      const entry = this._dateIndex[this._nextIndex];
      this._nextIndex--;

      if (this._loadedDates.has(entry.date)) continue;

      try {
        const messages = await this._loadMessages(entry.date);
        const dayEl = this._renderDay(entry.date, messages);

        // Insert after sentinel (which is always first child)
        if (this._sentinel.nextSibling) {
          this._container.insertBefore(dayEl, this._sentinel.nextSibling);
        } else {
          this._container.appendChild(dayEl);
        }

        this._loadedDates.add(entry.date);
        loaded++;
      } catch (err) {
        console.error(`Failed to load day ${entry.date}:`, err);
      }
    }

    // Preserve scroll position when prepending content
    if (loaded > 0 && scrollTopBefore > 0) {
      const scrollHeightAfter = this._container.scrollHeight;
      this._container.scrollTop = scrollTopBefore + (scrollHeightAfter - scrollHeightBefore);
    }

    this._loading = false;

    // If no more days to load, hide sentinel
    if (this._nextIndex < 0 && this._sentinel) {
      this._observer?.unobserve(this._sentinel);
    }
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

  /** Clean up observer. */
  destroy() {
    this._observer?.disconnect();
    this._observer = null;
  }
}
