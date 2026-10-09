/**
 * Hash Router — simple hash-based routing for conversation navigation.
 *
 * Routes:
 *   #/                                → empty state (no conversation)
 *   #/chat/:conversationId            → open conversation
 *   #/chat/:conversationId/msg/:msgId → open conversation + scroll to message
 */

export class HashRouter {
  constructor() {
    this._handlers = new Map();
    this._onHashChange = this._onHashChange.bind(this);
  }

  /**
   * Register a route handler.
   * @param {'home'|'chat'} route
   * @param {function} handler - called with (param, messageId)
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
   * @param {string|number} [messageId]
   */
  navigate(route, param, messageId) {
    const hash = HashRouter.hashFor(route, param, messageId);
    if (hash) window.location.hash = hash;
  }

  /**
   * Set the address without a hashchange — for leaving a route whose UI is
   * already gone (a drawer another drawer closed), so no handler runs.
   */
  replace(route, param, messageId) {
    const hash = HashRouter.hashFor(route, param, messageId);
    if (hash) window.history.replaceState(null, '', hash);
  }

  /** The hash for a route, or null for one that has none. */
  static hashFor(route, param, messageId) {
    if (route === 'legal') return '#/legal';
    if (route === 'api') return param ? `#/api/${param}` : '#/api';
    if (route === 'calls') return '#/calls';
    if (route === 'home') return '#/';
    if (route === 'chat' && param) return messageId ? `#/chat/${param}/msg/${messageId}` : `#/chat/${param}`;
    return null;
  }

  /** Get current route info from hash. */
  getCurrentRoute() {
    return HashRouter.parseHash(window.location.hash);
  }

  /**
   * Parse a hash string into route info.
   * @param {string} hash
   * @returns {{ route: string, param: string|null, messageId: string|null }}
   */
  static parseHash(hash) {
    const cleaned = hash.replace(/^#\/?/, '');
    if (!cleaned) return { route: 'home', param: null, messageId: null };
    if (cleaned === 'calls') return { route: 'calls', param: null, messageId: null };
    if (cleaned === 'api') return { route: 'api', param: null, messageId: null };
    if (cleaned === 'legal') return { route: 'legal', param: null, messageId: null };
    const apiMatch = cleaned.match(/^api\/([a-z0-9-]+)$/);
    if (apiMatch) return { route: 'api', param: apiMatch[1], messageId: null };

    // Match #/chat/:id/msg/:msgId
    const msgMatch = cleaned.match(/^chat\/([^/]+)\/msg\/(.+)$/);
    if (msgMatch) return { route: 'chat', param: msgMatch[1], messageId: msgMatch[2] };

    // Match #/chat/:id
    const chatMatch = cleaned.match(/^chat\/(.+)$/);
    if (chatMatch) return { route: 'chat', param: chatMatch[1], messageId: null };

    return { route: 'home', param: null, messageId: null };
  }

  /** @private */
  _onHashChange() {
    const { route, param, messageId } = this.getCurrentRoute();
    const handler = this._handlers.get(route);
    if (handler) {
      handler(param, messageId);
    }
  }
}
