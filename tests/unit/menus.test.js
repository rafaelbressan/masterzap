import { describe, it, expect, vi, afterEach } from 'vitest';

// Android's back reaches a page with an open CloseWatcher as a close request.
class FakeCloseWatcher {
  static all = [];
  constructor() { this.destroyed = false; FakeCloseWatcher.all.push(this); }
  requestClose() { if (!this.destroyed) { this.destroyed = true; this.onclose?.(); } }
  destroy() { this.destroyed = true; }
}

async function loadMenus() {
  vi.resetModules();
  return import('../../src/lib/menus.js');
}

afterEach(() => {
  FakeCloseWatcher.all = [];
  vi.unstubAllGlobals();
});

describe('menus and Android back', () => {
  it('back closes the open menu through a CloseWatcher', async () => {
    vi.stubGlobal('CloseWatcher', FakeCloseWatcher);
    const { openMenu, openMenuElement } = await loadMenus();
    const menu = document.createElement('div');
    const close = vi.fn();
    expect(openMenu(menu, close)).toBe(true);
    expect(FakeCloseWatcher.all).toHaveLength(1);

    FakeCloseWatcher.all[0].requestClose();
    expect(close).toHaveBeenCalledOnce();
    expect(openMenuElement()).toBeNull();
  });

  it('a menu closed any other way gives back its watcher', async () => {
    vi.stubGlobal('CloseWatcher', FakeCloseWatcher);
    const { openMenu, closeOpenMenu, menuClosed } = await loadMenus();
    const first = document.createElement('div');
    openMenu(first, () => {});
    const second = document.createElement('div');
    openMenu(second, () => {}); // replaces the first
    expect(FakeCloseWatcher.all[0].destroyed).toBe(true);
    menuClosed(second);
    expect(FakeCloseWatcher.all[1].destroyed).toBe(true);

    const close = vi.fn();
    openMenu(document.createElement('div'), close);
    closeOpenMenu();
    expect(FakeCloseWatcher.all[2].destroyed).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it('a refused watcher leaves the menu working', async () => {
    vi.stubGlobal('CloseWatcher', class { constructor() { throw new Error('NotAllowedError'); } });
    const { openMenu, closeOpenMenu, openMenuElement } = await loadMenus();
    const menu = document.createElement('div');
    const close = vi.fn();
    expect(openMenu(menu, close)).toBe(false);
    expect(openMenuElement()).toBe(menu);
    closeOpenMenu();
    expect(close).toHaveBeenCalledOnce();
  });

  it('without CloseWatcher, back keeps its meaning', async () => {
    const { openMenu } = await loadMenus();
    expect(openMenu(document.createElement('div'), () => {})).toBe(false);
  });
});

describe('mobile search calendar and history', () => {
  async function openCalendar(closeWatcher) {
    if (closeWatcher) vi.stubGlobal('CloseWatcher', FakeCloseWatcher);
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
    vi.resetModules();
    const { showMobileSearchBar } = await import('../../src/components/MobileSearchBar.js');
    const push = vi.spyOn(window.history, 'pushState');
    vi.spyOn(window.history, 'go').mockImplementation(() => {});
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const chatView = document.createElement('div');
    chatView.innerHTML = '<header class="chat-header"></header>';
    document.body.appendChild(chatView);
    const bar = showMobileSearchBar(chatView, 'conversa', { dateIndex: [{ date: '2025-03-05' }] });
    push.mockClear();
    chatView.querySelector('[aria-label="Pesquisar por data"]').click();
    return { chatView, bar, push };
  }

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('with CloseWatcher, the calendar spends no history entry and back closes it', async () => {
    const { chatView, bar, push } = await openCalendar(true);
    expect(push).not.toHaveBeenCalled();
    FakeCloseWatcher.all.at(-1).requestClose();
    expect(chatView.querySelector('.chat-calendar')).toBeNull();
    expect(chatView.querySelector('.mobile-search-bar')).not.toBeNull();
    bar.destroy();
  });

  it('without it, the calendar has its own history entry', async () => {
    const { bar, push } = await openCalendar(false);
    expect(push).toHaveBeenCalledWith({ mobileSearch: true, calendar: true }, '');
    bar.destroy();
  });

  it('a watcher refused at open falls back to the history entry', async () => {
    vi.stubGlobal('CloseWatcher', class { constructor() { throw new Error('NotAllowedError'); } });
    const { bar, push } = await openCalendar(false);
    expect(push).toHaveBeenCalledWith({ mobileSearch: true, calendar: true }, '');
    bar.destroy();
  });
});
