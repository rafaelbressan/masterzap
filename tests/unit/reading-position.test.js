import { describe, it, expect, beforeEach, vi } from 'vitest';
import { savePosition, getPosition, clearPositions } from '../../src/lib/reading-position.js';
import { ScrollLoader } from '../../src/lib/scroll-loader.js';

describe('reading position per conversation', () => {
  beforeEach(() => clearPositions());

  it('remembers a place per conversation and forgets it at the end', () => {
    savePosition('a', { date: '2024-01-02', id: '7', offset: -10, contiguous: true });
    savePosition('b', { date: '2024-03-01', id: '9', offset: 0, contiguous: false });
    expect(getPosition('a')).toMatchObject({ id: '7' });
    savePosition('a', null);
    expect(getPosition('a')).toBeNull();
    expect(getPosition('b')).toMatchObject({ id: '9' });
  });

  it('survives a reload of the tab (sessionStorage)', () => {
    savePosition('a', { date: '2024-01-02', id: '7', offset: 0, contiguous: true });
    expect(JSON.parse(sessionStorage.getItem('masterwhats:posicao')).a.id).toBe('7');
  });

  it('works without storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    savePosition('a', { date: '2024-01-02', id: '7', offset: 0, contiguous: true });
    expect(getPosition('a')).toMatchObject({ id: '7' });
    spy.mockRestore();
  });
});

describe('ScrollLoader.restorePosition', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  });

  const setup = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 20 }, (_, i) => ({ date: `2024-03-${String(i + 1).padStart(2, '0')}` }));
    const renderDay = (date) => {
      const el = document.createElement('section');
      el.dataset.date = date;
      el.innerHTML = `<div data-id="${date.slice(-2)}"></div>`;
      return el;
    };
    return { container, dateIndex, loader: new ScrollLoader({ container, dateIndex, loadMessages: () => Promise.resolve([]), renderDay }) };
  };
  const days = (c) => [...c.querySelectorAll('[data-date]')].map(s => s.dataset.date);

  it('brings back every day between a scrolled-to place and the end', async () => {
    const { container, loader } = setup();
    await loader.init({ position: { date: '2024-03-08', id: '08', offset: 0, contiguous: true } });
    // Every day from the 8th to the 20th, in order, with no gap.
    const wanted = Array.from({ length: 13 }, (_, i) => `2024-03-${String(i + 8).padStart(2, '0')}`);
    const loaded = days(container);
    expect(loaded).toEqual([...loaded].sort());
    for (const d of wanted) expect(loaded).toContain(d);
  });

  it('a jumped-to place loads just its day', async () => {
    const { container, loader } = setup();
    await loader.init({ position: { date: '2024-03-02', id: '02', offset: 0, contiguous: false } });
    expect(days(container)).toEqual(['2024-03-02', '2024-03-16', '2024-03-17', '2024-03-18', '2024-03-19', '2024-03-20']);
  });

  it('a place that no longer exists opens at the end', async () => {
    const { container, loader } = setup();
    expect(await loader.restorePosition({ date: '1999-01-01', id: '1', offset: 0 })).toBe(false);
    expect(days(container)).toEqual([]);
  });
});

describe('ScrollLoader.currentPosition guards', () => {
  beforeEach(() => {
    globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  });

  it('says nothing while loading, when hidden, or after destroy', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const loader = new ScrollLoader({
      container, dateIndex: [{ date: '2024-03-01' }],
      loadMessages: () => Promise.resolve([]),
      renderDay: (date) => { const el = document.createElement('section'); el.dataset.date = date; return el; },
    });
    expect(loader.currentPosition()).toBeUndefined(); // init not finished
    await loader.init();
    // jsdom lays nothing out: clientHeight 0 is what a display:none chat reads.
    expect(loader.currentPosition()).toBeUndefined();
    loader.destroy();
    expect(loader.currentPosition()).toBeUndefined();
  });

  it('ignores a stored id that is not a message id', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const loader = new ScrollLoader({
      container, dateIndex: [{ date: '2024-03-01' }],
      loadMessages: () => Promise.resolve([]),
      renderDay: (date) => { const el = document.createElement('section'); el.dataset.date = date; return el; },
    });
    expect(await loader.restorePosition({ date: '2024-03-01', id: '"]div[x="', offset: 0 })).toBe(false);
  });

  it('restores a place far up as a jump, not by loading every day in between', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const dateIndex = Array.from({ length: 100 }, (_, i) => ({ date: `2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}` }));
    const loadMessages = vi.fn(() => Promise.resolve([]));
    const loader = new ScrollLoader({
      container, dateIndex, loadMessages,
      renderDay: (date) => { const el = document.createElement('section'); el.dataset.date = date; el.innerHTML = '<div data-id="1"></div>'; return el; },
    });
    await loader.init({ position: { date: dateIndex[3].date, id: '1', offset: 0, contiguous: true } });
    expect(loadMessages.mock.calls.length).toBeLessThan(10);
  });
});
