import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildCalendar } from '../../src/components/Calendar.js';
import { showMobileSearchBar } from '../../src/components/MobileSearchBar.js';
import { closeOpenMenu, openMenuElement } from '../../src/lib/menus.js';

const dateIndex = [
  { date: '2025-01-15', message_count: 2 },
  { date: '2025-03-05', message_count: 1 },
  { date: 'sem-data', message_count: 1 },
];

afterEach(() => closeOpenMenu());

describe('chat search calendar', () => {
  it('opens on the last month and only enables days with messages', () => {
    const calendar = buildCalendar(dateIndex);
    expect(calendar.querySelector('.chat-calendar-label').textContent).toBe('março 2025');
    expect(calendar.querySelector('[aria-label="5 de março de 2025"]').disabled).toBe(false);
    expect(calendar.querySelector('[aria-label="6 de março de 2025"]').disabled).toBe(true);
    expect(calendar.querySelector('[aria-label="Próximo mês"]').disabled).toBe(true);
  });

  it('moves within the conversation and stops at its first month', () => {
    const calendar = buildCalendar(dateIndex);
    calendar.querySelector('[aria-label="Mês anterior"]').click();
    expect(calendar.querySelector('.chat-calendar-label').textContent).toBe('fevereiro 2025');
    calendar.querySelector('[aria-label="Mês anterior"]').click();
    expect(calendar.querySelector('.chat-calendar-label').textContent).toBe('janeiro 2025');
    expect(calendar.querySelector('[aria-label="Mês anterior"]').disabled).toBe(true);
  });

  it('marks the day picked last and opens on its month', () => {
    let picked;
    const calendar = buildCalendar(dateIndex, (d) => { picked = d; }, '2025-01-15');
    expect(calendar.querySelector('.chat-calendar-label').textContent).toBe('janeiro 2025');
    const day = calendar.querySelector('[aria-label="15 de janeiro de 2025"]');
    expect(day.getAttribute('aria-pressed')).toBe('true');
    day.click();
    expect(picked).toBe('2025-01-15');
  });

  it('says so when there is no full date to pick', () => {
    const calendar = buildCalendar([{ date: 'sem-data' }]);
    expect(calendar.querySelector('.chat-calendar-empty').textContent).toBe('Nenhuma data disponível');
  });

  it('keeps the keyboard on the month arrow', () => {
    const calendar = buildCalendar([{ date: '2024-12-01' }, { date: '2025-01-01' }, { date: '2025-03-01' }]);
    document.body.appendChild(calendar);
    const arrow = calendar.querySelector('[aria-label="Mês anterior"]');
    const label = calendar.querySelector('.chat-calendar-label');
    arrow.focus(); // as the keyboard leaves it
    arrow.click();
    // Same nodes, new month: the focus stays put and the live label changes.
    expect(document.activeElement).toBe(arrow);
    expect(calendar.querySelector('.chat-calendar-label')).toBe(label);
    expect(label.textContent).toBe('fevereiro 2025');
    calendar.remove();
  });

});

describe('mobile search bar', () => {
  it('picks a date on the calendar, not in a prompt()', () => {
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const prompt = vi.spyOn(window, 'prompt').mockImplementation(() => null);
    const chatView = document.createElement('div');
    chatView.innerHTML = '<header class="chat-header"></header>';
    document.body.appendChild(chatView);
    const onDateSelect = vi.fn();
    const bar = showMobileSearchBar(chatView, 'conversa', { dateIndex, onDateSelect });

    chatView.querySelector('[aria-label="Pesquisar por data"]').click();
    expect(openMenuElement()).toBe(chatView.querySelector('.chat-calendar'));
    chatView.querySelector('[aria-label="5 de março de 2025"]').click();

    expect(prompt).not.toHaveBeenCalled();
    expect(onDateSelect).toHaveBeenCalledWith('2025-03-05');
    expect(chatView.querySelector('.chat-calendar')).toBeNull();
    expect(openMenuElement()).toBeNull();

    bar.destroy();
    chatView.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
