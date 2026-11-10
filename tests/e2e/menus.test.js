import { test, expect } from '@playwright/test';

// One floating menu at a time; anything outside closes it.
const MENUS = '.context-menu, .chat-dropdown-menu, .sidebar-dropdown-menu';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/chat/geraldo-brazil-journal');
  await page.locator('.chat-msg-bubble').first().waitFor();
  await page.waitForLoadState('networkidle');
});

test('a second menu replaces the first, wherever it opens', async ({ page }) => {
  await page.locator('.chat-msg-bubble').nth(1).click({ button: 'right' });
  await expect(page.locator('.context-menu')).toBeVisible();

  // Long press / right click on the chat background: its own menu, alone.
  const area = page.locator('.chat-messages');
  const box = await area.boundingBox();
  await page.mouse.click(box.x + 8, box.y + box.height - 8, { button: 'right' });
  await expect(page.locator('.chat-dropdown-menu')).toBeVisible();
  await expect(page.locator(MENUS)).toHaveCount(1);

  // Back to a message: the background menu goes.
  await page.locator('.chat-msg-bubble').nth(2).click({ button: 'right' });
  await expect(page.locator('.context-menu')).toBeVisible();
  await expect(page.locator(MENUS)).toHaveCount(1);
});

test('touching or clicking outside closes the menu', async ({ page }, info) => {
  await page.locator('.chat-msg-bubble').nth(1).click({ button: 'right' });
  await expect(page.locator('.context-menu')).toBeVisible();
  if (info.project.name === 'mobile') await page.locator('.chat-header-name').tap();
  else await page.locator('.chat-header-name').click();
  await expect(page.locator(MENUS)).toHaveCount(0);
});

test('Escape closes the menu', async ({ page }) => {
  await page.locator('.chat-msg-bubble').nth(1).click({ button: 'right' });
  await page.keyboard.press('Escape');
  await expect(page.locator(MENUS)).toHaveCount(0);
});

test('the ⋮ menu toggles, and a message menu replaces it', async ({ page }) => {
  const dots = page.locator('.chat-header-menu-btn[aria-label="Menu"]');
  await dots.click();
  await expect(page.locator('.chat-dropdown-menu')).toBeVisible();
  await dots.click();
  await expect(page.locator(MENUS)).toHaveCount(0);
  await dots.click();
  // The last bubble: on a phone the ⋮ menu covers the top of the chat.
  await page.locator('.chat-msg-bubble').last().click({ button: 'right' });
  await expect(page.locator(MENUS)).toHaveCount(1);
  await expect(page.locator('.context-menu')).toBeVisible();
});

test('day badges write the month in lowercase', async ({ page }) => {
  // innerText: the text as drawn, after CSS (a text-transform would show here).
  await expect(page.locator('.chat-date-badge').first()).toHaveText('26 de abril de 2024', { useInnerText: true });
});
