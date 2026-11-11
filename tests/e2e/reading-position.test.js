import { test, expect } from '@playwright/test';

// Leaving a conversation and coming back lands where the reader stopped, not
// at the end — for the rest of the session.

/** Scroll up a few loads and return the first message in view. */
async function readSomewhereUp(page) {
  await page.waitForSelector('.chat-day');
  await page.waitForLoadState('networkidle');
  for (let i = 0; i < 3; i++) {
    const days = await page.locator('.chat-messages .chat-day').count();
    await page.evaluate(() => { document.querySelector('.chat-messages').scrollTop = 150; });
    await expect.poll(() => page.locator('.chat-messages .chat-day').count()).toBeGreaterThan(days);
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => { document.querySelector('.chat-messages').scrollTop += 600; });
  await page.waitForTimeout(300);
  return firstInView(page);
}

function firstInView(page) {
  return page.evaluate(() => {
    const c = document.querySelector('.chat-messages');
    const top = c.getBoundingClientRect().top;
    const row = [...c.querySelectorAll('[data-id]')].find(r => r.getBoundingClientRect().bottom > top);
    return { id: row.dataset.id, offset: Math.round(row.getBoundingClientRect().top - top) };
  });
}

async function expectBackAt(page, spot) {
  await page.waitForSelector(`.chat-messages [data-id="${spot.id}"]`);
  await page.waitForTimeout(300);
  const now = await firstInView(page);
  expect(now.id).toBe(spot.id);
  expect(Math.abs(now.offset - spot.offset)).toBeLessThan(4);
}

test('desktop: another contact and back keeps the place', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  const spot = await readSomewhereUp(page);

  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await expect(page.locator('.chat-header-name')).not.toHaveText('Martha Graeff');
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  await expectBackAt(page, spot);
});

test('mobile: back to the list and in again keeps the place', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/');
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  const spot = await readSomewhereUp(page);

  await page.locator('.chat-header-back').click();
  await expect(page.locator('.chat-view')).toHaveCount(0);
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  await expectBackAt(page, spot);
});

test('a reader at the end comes back to the end', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  await page.waitForSelector('.chat-day');
  await page.waitForLoadState('networkidle');
  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await page.locator('.conversation-item[data-id="martha-graeff"]').click();
  await page.waitForSelector('.chat-day');
  await page.waitForTimeout(300);
  const gap = await page.evaluate(() => { const c = document.querySelector('.chat-messages'); return c.scrollHeight - c.scrollTop - c.clientHeight; });
  expect(gap).toBeLessThan(48);
});

test('a link to a message wins over the saved place', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.locator('.conversation-item[data-id="alexandre-de-moraes"]').click();
  await readSomewhereUp(page).catch(() => {}); // a short chat may run out of days; any place will do
  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await page.goto('/#/chat/alexandre-de-moraes/msg/39');
  await expect(page.locator('.chat-messages [data-id="39"]')).toBeInViewport();
});
