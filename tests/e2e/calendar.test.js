import { test, expect } from '@playwright/test';

// Searching by date: a real calendar on both layouts, never a prompt().
async function openCalendar(page) {
  await page.goto('/#/chat/martha-graeff');
  await page.locator('.chat-msg-bubble').first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.locator('.chat-header [aria-label="Pesquisar"]').click();
  await page.locator('[aria-label="Pesquisar por data"]').click();
  const calendar = page.locator('.chat-calendar');
  await expect(calendar).toBeVisible();
  return calendar;
}

test('picking a day jumps to it', async ({ page }) => {
  page.on('dialog', () => { throw new Error('a native dialog opened'); });
  const calendar = await openCalendar(page);
  await calendar.locator('[aria-label="Mês anterior"]').click();
  await expect(calendar.locator('.chat-calendar-label')).toHaveText('julho 2025');
  const day = calendar.locator('.chat-calendar-day.has-messages').first();
  const label = await day.getAttribute('aria-label'); // "3 de julho de 2025"
  const date = `2025-07-${label.split(' ')[0].padStart(2, '0')}`;
  await day.click();
  await expect(calendar).toHaveCount(0);
  await expect(page.locator(`.chat-day[data-date="${date}"] .chat-msg-row`).first()).toBeInViewport();
});

test('a touch or click outside closes the calendar', async ({ page }, info) => {
  const calendar = await openCalendar(page);
  const area = page.locator('.chat-messages');
  const box = await area.boundingBox();
  if (info.project.name === 'mobile') await page.touchscreen.tap(box.x + 20, box.y + box.height - 20);
  else await page.mouse.click(box.x + 20, box.y + box.height - 20);
  await expect(calendar).toHaveCount(0);
});

test('Esc closes the calendar first, then the search', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const calendar = await openCalendar(page);
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(page.locator('.chat-search-drawer')).toBeVisible();
});
