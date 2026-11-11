// @vitest-environment jsdom
//
// A search waits for its index — 5 MB for the Martha conversation, seconds on
// a phone. Whatever happens meanwhile (a reset, the search closed) wins over
// the answer that arrives late.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadSearchIndex, isIndexLoaded, resetSearchIndex } from '../../src/lib/search.js';
import { showMobileSearchBar } from '../../src/components/MobileSearchBar.js';
import { showChatSearchDrawer } from '../../src/components/ChatSearchDrawer.js';

const ENTRIES = [{ id: 7, date: '2024-01-01', sender: 'DV', content: 'amor' }];

/** A fetch that answers only when told to. */
function heldFetch() {
  const held = [];
  globalThis.fetch = vi.fn(() => new Promise((resolve) => held.push(resolve)));
  return () => held.splice(0).forEach(r => r({ ok: true, json: () => Promise.resolve(ENTRIES) }));
}

afterEach(() => {
  resetSearchIndex();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('a late answer', () => {
  it('does not refill the cache after a reset', async () => {
    const release = heldFetch();
    const loading = loadSearchIndex('martha-graeff');
    resetSearchIndex();
    release();
    await loading;
    expect(isIndexLoaded('martha-graeff')).toBe(false);
  });

  it('does not move the chat once the mobile search is closed', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
    vi.spyOn(window.history, 'go').mockImplementation(() => {});
    const release = heldFetch();
    const chatView = document.createElement('div');
    chatView.innerHTML = '<header class="chat-header"></header>';
    document.body.appendChild(chatView);
    const onNavigate = vi.fn();
    const bar = showMobileSearchBar(chatView, 'martha-graeff', { onNavigate });

    const input = chatView.querySelector('.mobile-search-input');
    input.value = 'amor';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(400); // past the debounce: the index is on its way
    bar.destroy();
    release();
    await vi.runAllTimersAsync();

    expect(onNavigate).not.toHaveBeenCalled();
    expect(chatView.querySelector('.search-toast')).toBeNull();
  });

  it('does not fill the chat search drawer once it is cleared', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
    const release = heldFetch();
    const mainArea = document.createElement('div');
    document.body.appendChild(mainArea);
    const drawer = showChatSearchDrawer(mainArea, 'martha-graeff', { dateIndex: [], onResultClick() {}, onClose() {} });

    const input = mainArea.querySelector('.chat-search-input');
    input.value = 'amor';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(400);
    mainArea.querySelector('.chat-search-clear-btn').click();
    release();
    await vi.runAllTimersAsync();

    expect(mainArea.querySelector('.chat-search-result-item')).toBeNull();
    drawer.destroy();
  });
});
