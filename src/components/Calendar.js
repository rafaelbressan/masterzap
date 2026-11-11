/**
 * Calendar — pick a day of a conversation. Only days with messages can be
 * picked; the month arrows stop at the conversation's first and last month.
 *
 * Shared by the chat search drawer (desktop) and the mobile search bar.
 * Security note: no innerHTML; every label is textContent.
 */

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {Array<{date: string}>} dateIndex - the conversation's days
 * @param {function} onSelect - (date) => void, with 'YYYY-MM-DD'
 * @param {string|null} [selectedDate] - the day picked last time: the
 *   calendar opens on its month and reports it as pressed
 * @returns {HTMLElement}
 */
export function buildCalendar(dateIndex = [], onSelect = () => {}, selectedDate = null) {
  // Only full dates have a cell; a month-only or undated day is reached by
  // scrolling (data/README.md, partial dates).
  const days = dateIndex.map(d => d?.date).filter(d => FULL_DATE.test(d || '')).sort();
  const available = new Set(days);

  const el = document.createElement('div');
  el.className = 'chat-calendar';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Pesquisar por data');

  if (!days.length) {
    const empty = document.createElement('p');
    empty.className = 'chat-calendar-empty';
    empty.textContent = 'Nenhuma data disponível';
    el.appendChild(empty);
    return el;
  }

  const [firstY, firstM] = days[0].split('-').map(Number);
  const [lastY, lastM] = days.at(-1).split('-').map(Number);
  // Open on the month of the day picked last, else the conversation's last.
  let [year, month] = (selectedDate && available.has(selectedDate) ? selectedDate : days.at(-1)).split('-').map(Number);
  month -= 1;

  // Built once; a month change only rewrites the label, the arrows' state and
  // the days. The label stays the same node, so a screen reader announces the
  // new month, and the arrow keeps the keyboard focus.
  const nav = document.createElement('div');
  nav.className = 'chat-calendar-nav';
  const arrow = (text, ariaLabel, step) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-calendar-nav-btn';
    btn.textContent = text;
    btn.setAttribute('aria-label', ariaLabel);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      month += step;
      if (month < 0) { month = 11; year--; }
      if (month > 11) { month = 0; year++; }
      render();
    });
    return btn;
  };
  const prev = arrow('‹', 'Mês anterior', -1);
  const next = arrow('›', 'Próximo mês', 1);
  const label = document.createElement('span');
  label.className = 'chat-calendar-label';
  label.setAttribute('aria-live', 'polite');
  nav.append(prev, label, next);

  const headers = document.createElement('div');
  headers.className = 'chat-calendar-grid';
  for (const d of WEEKDAYS) {
    const hd = document.createElement('span');
    hd.className = 'chat-calendar-header';
    hd.textContent = d;
    headers.appendChild(hd);
  }

  const grid = document.createElement('div');
  grid.className = 'chat-calendar-grid';
  el.append(nav, headers, grid);

  function render() {
    label.textContent = `${MONTHS[month]} ${year}`;
    const atFirst = year === firstY && month === firstM - 1;
    const atLast = year === lastY && month === lastM - 1;
    for (const [btn, disabled] of [[prev, atFirst], [next, atLast]]) {
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    }

    while (grid.firstChild) grid.removeChild(grid.firstChild);
    // Monday first, as WhatsApp in pt-BR.
    const startDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < startDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'chat-calendar-day empty';
      grid.appendChild(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'chat-calendar-day';
      cell.textContent = d;
      cell.setAttribute('aria-label', `${d} de ${MONTHS[month]} de ${year}`);
      if (available.has(date)) {
        cell.classList.add('has-messages');
        cell.setAttribute('aria-pressed', String(date === selectedDate));
        cell.addEventListener('click', (e) => { e.stopPropagation(); onSelect(date); });
      } else {
        cell.classList.add('disabled');
        cell.disabled = true;
      }
      grid.appendChild(cell);
    }
  }

  render();
  return el;
}
