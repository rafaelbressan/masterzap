// @vitest-environment jsdom
//
// The drawing itself needs a real browser (tests/e2e/screenshot.test.js
// compares the print with the screen). Here: what goes into the copy.
import { describe, it, expect } from 'vitest';
import { visibleClone, xmlSafe } from '../../src/lib/dom-snapshot.js';

describe('xmlSafe()', () => {
  it('drops what XML cannot hold and keeps the rest', () => {
    expect(xmlSafe('a\u0008b\u0000c￾d')).toBe('abcd');
    expect(xmlSafe('meio \uD83D emoji')).toBe('meio  emoji'); // half an emoji
    expect(xmlSafe('fim \uDE00')).toBe('fim ');
    expect(xmlSafe('inteiro 😀 ok\n\tsim')).toBe('inteiro 😀 ok\n\tsim');
  });
});

/** A box at [top, bottom) in screen coordinates. */
function at(el, top, bottom) {
  el.getBoundingClientRect = () => ({ top, bottom, height: bottom - top, left: 0, right: 100, width: 100 });
  return el;
}

/**
 * A scrolled list showing 1000..1400: day A wholly above, day B crossing the
 * top edge (badge, then rows 0..9 of 50px from 600), day C wholly below.
 */
function chat() {
  const area = document.createElement('div');
  const list = at(document.createElement('div'), 1000, 1400);
  list.className = 'list';
  list.style.overflowY = 'auto';
  Object.defineProperty(list, 'scrollHeight', { value: 5000 });
  Object.defineProperty(list, 'clientHeight', { value: 400 });
  const dayA = at(document.createElement('section'), 0, 500);
  dayA.className = 'day-a';
  const dayB = at(document.createElement('section'), 550, 1450);
  dayB.className = 'day-b';
  const badge = at(document.createElement('span'), 560, 590);
  badge.className = 'badge';
  badge.style.display = 'inline-block';
  dayB.append(badge);
  for (let i = 0; i < 17; i++) {
    const row = at(document.createElement('div'), 600 + i * 50, 650 + i * 50);
    row.className = `row r${i}`;
    row.textContent = `linha ${i}`;
    dayB.append(row);
  }
  const dayC = at(document.createElement('section'), 1500, 2000);
  dayC.className = 'day-c';
  list.append(dayA, dayB, dayC);
  area.append(list);
  return area;
}

describe('visibleClone()', () => {
  it('keeps only the days on screen, placed where they show', () => {
    const { clone } = visibleClone(chat());
    const list = clone.querySelector('.list');
    expect(list.querySelector('.day-a')).toBeNull();
    expect(list.querySelector('.day-c')).toBeNull();
    // Day B starts 450px above the list's top edge.
    expect(list.querySelector('.day-b').style.marginTop).toBe('-450px');
    expect(list.style.overflow).toBe('hidden');
  });

  it('turns the rows above the screen into one box and drops the ones below', () => {
    const { clone } = visibleClone(chat());
    const day = clone.querySelector('.day-b');
    // Rows 0..7 end at or above 1000: 0..6 become one box (on row 6's copy,
    // which keeps its classes), row 7 stays whole for row 8's sake.
    const box = day.querySelector('.r6');
    expect(box.style.height).toBe('350px'); // 600 → 950
    expect(box.style.visibility).toBe('hidden');
    expect(box.textContent).toBe('');
    for (let i = 0; i < 6; i++) expect(day.querySelector(`.r${i}`)).toBeNull();
    expect(day.querySelector('.r7').textContent).toBe('linha 7');
    // 8..15 show (row 15 starts at 1350); 16 starts at 1400, below the edge.
    expect(day.querySelector('.r15')).not.toBeNull();
    expect(day.querySelector('.r16')).toBeNull();
    // The inline badge stays as it is.
    expect(day.querySelector('.badge')).not.toBeNull();
  });

  it('leaves out what is asked, and copies what the user typed', () => {
    const area = document.createElement('div');
    area.innerHTML = '<div class="menu">menu</div><input><textarea></textarea><input type="checkbox">';
    area.querySelector('input').value = 'busca';
    area.querySelector('textarea').value = 'texto';
    area.querySelector('[type=checkbox]').checked = true;
    const { clone } = visibleClone(area, el => el.classList.contains('menu'));
    expect(clone.querySelector('.menu')).toBeNull();
    expect(clone.querySelector('input').getAttribute('value')).toBe('busca');
    expect(clone.querySelector('textarea').textContent).toBe('texto');
    expect(clone.querySelector('[type=checkbox]').hasAttribute('checked')).toBe(true);
  });
});
