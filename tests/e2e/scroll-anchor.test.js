import { test, expect } from '@playwright/test';

// Loading older days above the reader must not move what the reader is
// looking at. The browser anchors the scroll itself (overflow-anchor); the
// loader's own correction has to add to that, not undo it.
test('scrolling up keeps the message in view where it was', async ({ page }) => {
  await page.goto('/#/chat/martha-graeff');
  await page.waitForSelector('.chat-day');
  await page.waitForTimeout(1000);

  for (let round = 0; round < 2; round++) {
    const before = await page.evaluate(() => {
      const c = document.querySelector('.chat-messages');
      c.scrollTop = 150;
      const top = c.getBoundingClientRect().top;
      const row = [...c.querySelectorAll('[data-id]')].find(r => r.getBoundingClientRect().bottom > top);
      return { id: row.dataset.id, offset: row.getBoundingClientRect().top - top, days: c.querySelectorAll('.chat-day').length };
    });
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.chat-messages .chat-day').length))
      .toBeGreaterThan(before.days);
    await page.waitForTimeout(300);
    const offset = await page.evaluate((id) => {
      const c = document.querySelector('.chat-messages');
      return c.querySelector(`[data-id="${id}"]`).getBoundingClientRect().top - c.getBoundingClientRect().top;
    }, before.id);
    expect(Math.abs(offset - before.offset)).toBeLessThan(4);
  }
});
