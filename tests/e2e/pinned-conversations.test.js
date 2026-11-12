import { test, expect } from '@playwright/test';

// Up to three conversations pinned to the top of the list, as WhatsApp.
// Saved in the reader's browser only.
const row = (page, id) => page.locator(`.conversation-list > .conversation-item[data-id="${id}"]`);
const order = (page) => page.locator('.conversation-list > .conversation-item').evaluateAll(rs => rs.map(r => r.dataset.id));

async function pin(page, id) {
  await row(page, id).click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Fixar conversa' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.conversation-item').first().waitFor();
});

test('pinned conversations go to the top with the pin, newest first, and stay after a reload', async ({ page }) => {
  await pin(page, 'ciro-soares');
  await pin(page, 'vivi-moraes');
  expect((await order(page)).slice(0, 2)).toEqual(['vivi-moraes', 'ciro-soares']);
  await expect(row(page, 'vivi-moraes').locator('.conversation-item-pin')).toBeVisible();
  await expect(row(page, 'martha-graeff').locator('.conversation-item-pin')).toBeHidden();
  await page.reload();
  await page.locator('.conversation-item').first().waitFor();
  expect((await order(page)).slice(0, 2)).toEqual(['vivi-moraes', 'ciro-soares']);
});

test('a fourth pin is refused with the notice, as WhatsApp', async ({ page }) => {
  for (const id of ['ciro-soares', 'vivi-moraes', 'fabio-faria']) await pin(page, id);
  await pin(page, 'leo-palhares');
  await expect(page.locator('.search-toast')).toContainText('Você só pode fixar até 3 conversas');
  expect((await order(page)).slice(0, 3)).toEqual(['fabio-faria', 'vivi-moraes', 'ciro-soares']);
});

test('unpinning puts the conversation back where it was', async ({ page }) => {
  const before = await order(page);
  await pin(page, 'leo-palhares');
  await row(page, 'leo-palhares').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Desafixar conversa' }).click();
  expect(await order(page)).toEqual(before);
});

test('on a desktop the row shows a menu chevron on hover', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'hover is a desktop thing');
  const chevron = row(page, 'ciro-soares').locator('.conversation-item-chevron');
  // Transparent until hovered (it stays in the tab order for the keyboard).
  await expect(chevron).toHaveCSS('opacity', '0');
  await row(page, 'ciro-soares').hover();
  await expect(chevron).toHaveCSS('opacity', '1');
  await chevron.click();
  await expect(page.locator('.context-menu-item', { hasText: 'Fixar conversa' })).toBeVisible();
  // The chevron's click opens the menu, not the chat.
  await expect(page).not.toHaveURL(/#\/chat\//);
});

test('pinned rows still follow the Favoritas tab', async ({ page }) => {
  await pin(page, 'ciro-soares');
  await page.locator('.sidebar-tag[data-filter="favoritas"]').click();
  await expect(row(page, 'ciro-soares')).toBeHidden();
  await expect(row(page, 'martha-graeff')).toBeVisible();
});

// iOS Safari fires no contextmenu on a long press: the press is timed by the
// list itself, and the tap that ends it does not open the chat.
test('a long press opens the row menu on a touch screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch');
  const target = row(page, 'ciro-soares');
  const box = await target.boundingBox();
  const at = { pointerType: 'touch', clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, isPrimary: true };
  // A touch pointer held until the menu shows, no contextmenu event.
  await target.dispatchEvent('pointerdown', at);
  const item = page.locator('.context-menu-item', { hasText: 'Fixar conversa' });
  await expect(item).toBeVisible();
  // While the finger is down: the browser's own contextmenu for the same
  // press (Android) and a little jitter do not close it.
  await target.dispatchEvent('contextmenu', { clientX: at.clientX, clientY: at.clientY });
  await target.dispatchEvent('touchmove');
  await expect(item).toBeVisible();
  await target.dispatchEvent('pointerup', at);
  await target.dispatchEvent('click', { clientX: at.clientX, clientY: at.clientY });
  await expect(item).toBeVisible();
  await expect(page).not.toHaveURL(/#\/chat\//);
  await item.click();
  await expect(page.locator('.conversation-list > .conversation-item').first()).toHaveAttribute('data-id', 'ciro-soares');
});

test('from the keyboard: the menu key opens it by the row, and focus comes back to the row', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard');
  const target = row(page, 'ciro-soares');
  await target.focus();
  await target.dispatchEvent('contextmenu', { clientX: 0, clientY: 0, button: -1 });
  const menu = page.locator('.context-menu');
  const [mb, rb] = [await menu.boundingBox(), await target.boundingBox()];
  expect(Math.abs(mb.y - (rb.y + rb.height - 8))).toBeLessThan(4);
  await page.keyboard.press('Enter');
  await expect(page.locator('.conversation-list > .conversation-item').first()).toHaveAttribute('data-id', 'ciro-soares');
  await expect(row(page, 'ciro-soares')).toBeFocused();
});

test('the limit notice sits above the bottom tabs on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone layout');
  for (const id of ['ciro-soares', 'vivi-moraes', 'fabio-faria', 'leo-palhares']) await pin(page, id);
  const toast = await page.locator('.search-toast').boundingBox();
  const nav = await page.locator('.sidebar-bottom-nav').boundingBox();
  expect(toast.y + toast.height).toBeLessThanOrEqual(nav.y);
});

test('Escape closes the row menu and the keyboard stays on the row', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard');
  const target = row(page, 'ciro-soares');
  await target.focus();
  await target.dispatchEvent('contextmenu', { clientX: 0, clientY: 0, button: -1 });
  await expect(page.locator('.context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.context-menu')).toHaveCount(0);
  await expect(target).toBeFocused();
});
