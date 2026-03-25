/**
 * Hash Router — simple hash-based routing for conversation navigation.
 *
 * Routes:
 *   #/                     → empty state (no conversation)
 *   #/chat/:conversationId → open conversation
 *
 * Usage:
 *   const router = new HashRouter();
 *   router.on('chat', (id) => openConversation(id));
 *   router.on('home', () => showEmptyState());
 *   router.start();
 *   router.navigate('chat', 'martha-graeff');
 */

export class HashRouter {
  constructor() {
    this._handlers = new Map();
    this._onHashChange = this._onHashChange.bind(this);
  }

  /**
   * Register a route handler.
   * @param {'home'|'chat'} route
   * @param {function} handler - called with route params
   */
  on(route, handler) {
    this._handlers.set(route, handler);
    return this;
  }

  /** Start listening to hash changes and handle current hash. */
  start() {
    window.addEventListener('hashchange', this._onHashChange);
    this._onHashChange();
  }

  /** Stop listening to hash changes. */
  stop() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  /**
   * Navigate to a route by updating the hash.
   * @param {'home'|'chat'} route
   * @param {string} [param]
   */
  navigate(route, param) {
    if (route === 'home') {
      window.location.hash = '#/';
    } else if (route === 'chat' && param) {
      window.location.hash = `#/chat/${param}`;
    }
  }

  /** Get current route info from hash. */
  getCurrentRoute() {
    return HashRouter.parseHash(window.location.hash);
  }

  /**
   * Parse a hash string into route info.
   * @param {string} hash
   * @returns {{ route: string, param: string|null }}
   */
  static parseHash(hash) {
    const cleaned = hash.replace(/^#\/?/, '');
    if (!cleaned) return { route: 'home', param: null };

    const match = cleaned.match(/^chat\/(.+)$/);
    if (match) return { route: 'chat', param: match[1] };

    return { route: 'home', param: null };
  }

  /** @private */
  _onHashChange() {
    const { route, param } = this.getCurrentRoute();
    const handler = this._handlers.get(route);
    if (handler) {
      handler(param);
    }
  }
}
