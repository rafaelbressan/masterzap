// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importantMessages, isImportant, toggleImportant, resetImportantMessages } from '../../src/lib/important-messages.js';
import { renderImportantPanel } from '../../src/components/ImportantPanel.js';
import { HashRouter } from '../../src/lib/router.js';

const KEY = 'masterwhats:mensagens-importantes';
const msg = (id, extra = {}) => ({ conversationId: 'martha-graeff', id, date: '2024-08-28', time: '21:20', sender: 'DV', content: `mensagem ${id}`, ...extra });

beforeEach(() => {
  localStorage.clear();
  resetImportantMessages();
  vi.restoreAllMocks();
});

describe('important messages', () => {
  it('marks, lists newest first, and unmarks', () => {
    expect(toggleImportant(msg(1))).toBe(true);
    expect(toggleImportant(msg(2))).toBe(true);
    expect(importantMessages().map(m => m.messageId)).toEqual(['2', '1']);
    expect(isImportant('martha-graeff', 1)).toBe(true);
    expect(toggleImportant(msg(1))).toBe(false);
    expect(isImportant('martha-graeff', '1')).toBe(false);
  });

  it('survives a reload: saved in this browser', () => {
    toggleImportant(msg(7));
    resetImportantMessages();
    expect(importantMessages()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(KEY))[0]).toMatchObject({ conversationId: 'martha-graeff', messageId: '7', content: 'mensagem 7' });
  });

  it('keeps one conversation apart from the others', () => {
    toggleImportant(msg(1));
    toggleImportant({ ...msg(1), conversationId: 'alexandre-de-moraes' });
    expect(importantMessages('alexandre-de-moraes')).toHaveLength(1);
    expect(importantMessages()).toHaveLength(2);
  });

  it('drops what storage holds that is not a mark', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { conversationId: 'martha-graeff', messageId: '3', date: '2024-01-01', time: '', sender: 'DV', content: 'ok', markedAt: 'x' },
      { conversationId: '../../etc', messageId: '4', date: '', time: '', sender: '', content: '', markedAt: '' },
      { conversationId: 'martha-graeff', messageId: '<img>', date: '', time: '', sender: '', content: '', markedAt: '' },
      { conversationId: 'martha-graeff', messageId: '3', date: '2024-01-01', time: '', sender: 'DV', content: 'dup', markedAt: 'x' },
      'lixo', null,
    ]));
    expect(importantMessages().map(m => m.content)).toEqual(['ok']);
  });

  it('starts empty from unreadable storage, and still works for the visit', () => {
    localStorage.setItem(KEY, '{not json');
    expect(importantMessages()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(toggleImportant(msg(9))).toBe(true);
    expect(isImportant('martha-graeff', 9)).toBe(true);
  });
});

describe('the "Mensagens importantes" panel', () => {
  const nameOf = (id) => ({ 'martha-graeff': 'Martha Graeff' }[id] || id);

  it('lists the marks, opens one, and unmarks with the star', () => {
    toggleImportant(msg(1, { sender: 'Martha Graeff', content: 'oi' }));
    toggleImportant(msg(2));
    const onOpen = vi.fn();
    const panel = renderImportantPanel({ nameOf, onOpen, onBack() {} });
    const rows = panel.querySelectorAll('.important-item');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.search-result-sender').textContent).toBe('Martha Graeff');
    // DV's own message carries the double tick; the contact's does not.
    expect(rows[0].querySelector('.search-result-ticks')).not.toBeNull();
    expect(rows[1].querySelector('.search-result-ticks')).toBeNull();
    rows[1].click();
    expect(onOpen).toHaveBeenCalledWith('martha-graeff', '1');
    rows[0].querySelector('.important-unmark').click();
    expect(panel.querySelectorAll('.important-item')).toHaveLength(1);
    expect(isImportant('martha-graeff', 2)).toBe(false);
  });

  it('shows what to do when there is nothing marked', () => {
    const panel = renderImportantPanel({ nameOf, onOpen() {}, onBack() {} });
    expect(panel.querySelector('.important-empty').textContent).toContain('Nenhuma mensagem importante');
  });

  it('shows one conversation only when given one', () => {
    toggleImportant(msg(1));
    toggleImportant({ ...msg(5), conversationId: 'alexandre-de-moraes' });
    const panel = renderImportantPanel({ conversationId: 'alexandre-de-moraes', nameOf, onOpen() {}, onBack() {} });
    expect(panel.querySelectorAll('.important-item')).toHaveLength(1);
  });

  it('keeps the text as text', () => {
    toggleImportant(msg(1, { content: '<img src=x onerror=alert(1)>' }));
    const panel = renderImportantPanel({ nameOf, onOpen() {}, onBack() {} });
    expect(panel.querySelector('img')).toBeNull();
    expect(panel.querySelector('.search-result-content').textContent).toContain('<img src=x');
  });
});

describe('route', () => {
  it('reads #/importantes and #/importantes/<conversa>', () => {
    expect(HashRouter.parseHash('#/importantes')).toEqual({ route: 'importantes', param: null, messageId: null });
    expect(HashRouter.parseHash('#/importantes/martha-graeff')).toEqual({ route: 'importantes', param: 'martha-graeff', messageId: null });
    expect(HashRouter.parseHash('#/importantes/../x').route).toBe('home');
  });
});
