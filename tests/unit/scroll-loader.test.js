import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrollLoader } from '../../src/lib/scroll-loader.js';

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = [];
  }
  observe(el) { this.elements.push(el); }
  unobserve(el) { this.elements = this.elements.filter(e => e !== el); }
  disconnect() { this.elements = []; }
  // Helper to simulate intersection
  trigger(isIntersecting) {
    this.callback([{ isIntersecting }]);
  }
}

function createMockContainer() {
  const el = document.createElement('div');
  // Simulate scrollable container
  Object.defineProperty(el, 'scrollHeight', {
    get: () => el.children.length * 100,
    configurable: true,
  });
  Object.defineProperty(el, 'scrollTop', {
    value: 0,
    writable: true,
    configurable: true,
  });
  return el;
}

describe('ScrollLoader', () => {
  let container;
  let dateIndex;
  let loadMessages;
  let renderDay;

  beforeEach(() => {
    // Install mock IntersectionObserver
    globalThis.IntersectionObserver = MockIntersectionObserver;

    container = createMockContainer();
    document.body.appendChild(container);

    dateIndex = [
      { date: '2024-02-10', message_count: 5 },
      { date: '2024-02-11', message_count: 3 },
      { date: '2024-02-12', message_count: 7 },
      { date: '2024-02-13', message_count: 2 },
      { date: '2024-02-14', message_count: 4 },
    ];

    loadMessages = vi.fn((date) =>
      Promise.resolve([{ id: 1, date, content: `msg from ${date}` }])
    );

    renderDay = vi.fn((date, messages) => {
      const el = document.createElement('section');
      el.dataset.date = date;
      el.textContent = `Day: ${date}`;
      return el;
    });
  });

  it('loads initial batch of days on init', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    // Should load all 5 days (INITIAL_DAYS = 5, and we have exactly 5)
    expect(loader.loadedCount).toBe(5);
    expect(loadMessages).toHaveBeenCalledTimes(5);
  });

  it('loads most recent days first', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    // First call should be for the most recent date
    expect(loadMessages).toHaveBeenNthCalledWith(1, '2024-02-14');
    expect(loadMessages).toHaveBeenNthCalledWith(2, '2024-02-13');
  });

  it('creates a sentinel element', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    const sentinel = container.querySelector('.scroll-sentinel');
    expect(sentinel).not.toBeNull();
  });

  it('calls renderDay for each loaded day', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    expect(renderDay).toHaveBeenCalledTimes(5);
  });

  it('reports fully loaded when all days are loaded', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();

    expect(loader.isFullyLoaded).toBe(true);
  });

  it('handles empty date index gracefully', async () => {
    const loader = new ScrollLoader({
      container,
      dateIndex: [],
      loadMessages,
      renderDay,
    });
    await loader.init();

    expect(loader.loadedCount).toBe(0);
    expect(loader.isFullyLoaded).toBe(true);
  });

  it('handles loadMessages errors gracefully', async () => {
    const failingLoader = vi.fn(() => Promise.reject(new Error('network error')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const loader = new ScrollLoader({
      container,
      dateIndex: [{ date: '2024-01-01', message_count: 1 }],
      loadMessages: failingLoader,
      renderDay,
    });
    await loader.init();

    expect(consoleSpy).toHaveBeenCalled();
    expect(loader.loadedCount).toBe(0);
    consoleSpy.mockRestore();
  });

  it('cleans up observer on destroy', async () => {
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay });
    await loader.init();
    loader.destroy();

    // Should not throw
    expect(() => loader.destroy()).not.toThrow();
  });
});

describe('ScrollLoader — failures and order', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver = MockIntersectionObserver;
  });

  const section = (date) => {
    const el = document.createElement('section');
    el.dataset.date = date;
    return el;
  };

  it('tries a failed day again instead of leaving a hole', async () => {
    const container = createMockContainer();
    document.body.appendChild(container);
    const dateIndex = [{ date: '2024-02-10' }, { date: '2024-02-11' }, { date: '2024-02-12' }];
    let failures = 1;
    const loadMessages = vi.fn((date) => (date === '2024-02-11' && failures-- > 0 ? Promise.reject(new Error('blip')) : Promise.resolve([])));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay: section });
    await loader.init();
    expect([...container.querySelectorAll('[data-date]')].map(s => s.dataset.date))
      .toEqual(['2024-02-10', '2024-02-11', '2024-02-12']);
    spy.mockRestore();
  });

  it('skips a day that keeps failing, so the history before it still loads', async () => {
    const container = createMockContainer();
    document.body.appendChild(container);
    const dateIndex = [{ date: '2024-02-10' }, { date: '2024-02-11' }, { date: '2024-02-12' }];
    const loadMessages = vi.fn((date) => (date === '2024-02-11' ? Promise.reject(new Error('404')) : Promise.resolve([])));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loader = new ScrollLoader({ container, dateIndex, loadMessages, renderDay: section });
    await loader.init();
    expect([...container.querySelectorAll('[data-date]')].map(s => s.dataset.date)).toEqual(['2024-02-10', '2024-02-12']);
    expect(loadMessages.mock.calls.filter(([d]) => d === '2024-02-11')).toHaveLength(2);
    expect(loader.isFullyLoaded).toBe(true);
    spy.mockRestore();
  });

  it('keeps days in date order when a jump loads one out of turn', async () => {
    const container = createMockContainer();
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 8 }, (_, i) => ({ date: `2024-02-${String(i + 10).padStart(2, '0')}` }));
    const loader = new ScrollLoader({ container, dateIndex, loadMessages: () => Promise.resolve([]), renderDay: section });
    await loader.init(); // the five newest: 13–17
    await loader.loadDate('2024-02-10'); // a shared link to the oldest day
    await loader._loadBatch(5); // scrolling up fills 11 and 12, skips 10
    expect([...container.querySelectorAll('[data-date]')].map(s => s.dataset.date))
      .toEqual(dateIndex.map(d => d.date));
    expect(container.firstElementChild.classList.contains('scroll-sentinel')).toBe(true);
  });

  it('keeps loading until there is something to scroll', async () => {
    const container = createMockContainer();
    Object.defineProperty(container, 'clientHeight', { value: 1000, configurable: true });
    document.body.appendChild(container);
    // 20 one-line days, 100px each: five are not enough to fill 1000px + 200.
    const dateIndex = Array.from({ length: 20 }, (_, i) => ({ date: `2024-03-${String(i + 1).padStart(2, '0')}` }));
    const loader = new ScrollLoader({ container, dateIndex, loadMessages: () => Promise.resolve([]), renderDay: section });
    await loader.init();
    await loader._loadUntilOutOfRange();
    expect(container.scrollHeight).toBeGreaterThan(1200);
    expect(loader.isFullyLoaded).toBe(false);
  });

  // Opening: busy until the first days are in and the view is at the end.
  it('says it is busy while it opens, and not after, even when a day fails', async () => {
    const container = createMockContainer();
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 10 }, (_, i) => ({ date: `2024-05-${String(i + 1).padStart(2, '0')}` }));
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    const loader = new ScrollLoader({ container, dateIndex, loadMessages: async (date) => { await held; return [{ id: 1, date }]; }, renderDay: section });
    const opening = loader.init();
    expect(container.getAttribute('aria-busy')).toBe('true');
    release();
    await opening;
    expect(container.hasAttribute('aria-busy')).toBe(false);

    const broken = createMockContainer();
    document.body.appendChild(broken);
    const failing = new ScrollLoader({ container: broken, dateIndex, loadMessages: (date) => Promise.resolve([{ id: 1, date }]), renderDay: () => { throw new Error('bad day'); } });
    await expect(failing.init()).rejects.toThrow('bad day');
    expect(broken.hasAttribute('aria-busy')).toBe(false);
  });

  it('opens at the last message when the reader did not move', async () => {
    const container = createMockContainer();
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 10 }, (_, i) => ({ date: `2024-05-${String(i + 1).padStart(2, '0')}` }));
    const loader = new ScrollLoader({ container, dateIndex, loadMessages: (date) => Promise.resolve([{ id: 1, date }]), renderDay: section });
    await loader.init();
    expect(container.scrollTop).toBe(container.scrollHeight);
    expect(container.hasAttribute('aria-busy')).toBe(false);
  });

  // The observer speaks only when the top comes into view, and looks only
  // once a frame: a jump away and back between two looks says nothing. A
  // scroll near the top is reason enough to load, whatever it said.
  it('loads on a scroll near the top even when the observer stays silent', async () => {
    const container = createMockContainer();
    Object.defineProperty(container, 'clientHeight', { value: 100, configurable: true });
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 20 }, (_, i) => ({ date: `2024-06-${String(i + 1).padStart(2, '0')}` }));
    const loader = new ScrollLoader({ container, dateIndex, loadMessages: (date) => Promise.resolve([{ id: 1, date }]), renderDay: section });
    await loader.init();
    const before = loader.loadedCount;
    container.scrollTop = 120;
    container.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(loader.loadedCount).toBeGreaterThan(before));
    // Far from the top, a scroll loads nothing.
    const after = loader.loadedCount;
    container.scrollTop = 5000;
    container.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, 20));
    expect(loader.loadedCount).toBe(after);
  });
});

