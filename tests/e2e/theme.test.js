import { test, expect } from '@playwright/test';

// Light, dark or the device's, as WhatsApp's "Tema" (menu ⋮ → Tema).
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const bg = (page, selector) => page.locator(selector).first().evaluate(el => getComputedStyle(el).backgroundColor);

async function openDialog(page) {
  await page.locator('.sidebar-menu-btn').click();
  await page.locator('.sidebar-dropdown-item', { hasText: 'Tema' }).click();
  return page.locator('dialog.theme-dialog');
}

test.describe('on a light device', () => {
  test.use({ colorScheme: 'light' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
  });

  test('choosing Escuro and OK turns the app dark, and it stays after a reload', async ({ page }) => {
    expect(await theme(page)).toBe('light');
    const dialog = await openDialog(page);
    await expect(dialog.getByRole('heading', { name: 'Tema' })).toBeVisible();
    // The saved choice is the one marked: none yet, so the device's.
    await expect(dialog.getByLabel('Padrão do sistema')).toBeChecked();
    await dialog.getByLabel('Escuro').check();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await theme(page)).toBe('dark');
    // WhatsApp's dark surface, and the browser bar with it.
    expect(await bg(page, '.sidebar')).toBe('rgb(22, 23, 23)');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#161717');
    await page.reload();
    await page.locator('.conversation-item').first().waitFor();
    expect(await theme(page)).toBe('dark');
  });

  test('Cancelar, Escape and a tap outside change nothing', async ({ page }) => {
    for (const close of [
      d => d.getByRole('button', { name: 'Cancelar' }).click(),
      () => page.keyboard.press('Escape'),
      () => page.mouse.click(5, 5),
    ]) {
      const dialog = await openDialog(page);
      await dialog.getByLabel('Escuro').check();
      await close(dialog);
      await expect(dialog).toHaveCount(0);
      expect(await theme(page)).toBe('light');
    }
  });

  test('from the keyboard: arrows choose, Enter is OK, focus goes back to the menu', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'keyboard');
    const dialog = await openDialog(page);
    await expect(dialog.getByLabel('Padrão do sistema')).toBeFocused();
    await page.keyboard.press('ArrowUp'); // Escuro
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    expect(await theme(page)).toBe('dark');
    await expect(page.locator('.sidebar-menu-btn')).toBeFocused();
  });

  test('Escape cancels the dialog only, not the contact info behind it', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the drawer sits beside the list on a desktop');
    await page.goto('/#/chat/alexandre-de-moraes');
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    await page.locator('.chat-header-info, .chat-header-name').first().click();
    const drawer = page.locator('.contact-info-drawer');
    await expect(drawer).toBeVisible();
    const dialog = await openDialog(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(drawer).toBeVisible();
  });

  test('a press that starts on an option and ends outside does not cancel', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'mouse');
    const dialog = await openDialog(page);
    const option = await dialog.getByText('Escuro').boundingBox();
    await page.mouse.move(option.x + 5, option.y + 5);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();
    await expect(dialog).toBeVisible();
  });

  test('the dialog is centred and fits a phone', async ({ page }) => {
    const dialog = await openDialog(page);
    const box = await dialog.boundingBox();
    const vw = page.viewportSize().width;
    expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThan(2);
    expect(box.width).toBeLessThanOrEqual(vw - 48 + 1);
  });
});

test.describe('on a dark device', () => {
  test.use({ colorScheme: 'dark' });

  test('with nothing chosen the app is dark from the first paint', async ({ page }) => {
    // Read before any app script runs: the <head> script set it.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        window.__themeAtLoad = document.documentElement.dataset.theme;
      });
    });
    await page.goto('/');
    expect(await page.evaluate(() => window.__themeAtLoad)).toBe('dark');
    await page.locator('.conversation-item').first().waitFor();
    expect(await theme(page)).toBe('dark');
  });

  test('before the stylesheets arrive the page is already dark, with nothing unstyled on it', async ({ page }) => {
    // Firefox paints before the CSS has come: hold it back to see that paint.
    let release;
    const held = new Promise(r => { release = r; });
    await page.route(/\/(base\.css|assets\/index-[^/]*\.css)/, async (route) => { await held; await route.continue(); });
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('#loading-screen', { state: 'attached' });
    const before = await page.evaluate(() => ({
      bg: getComputedStyle(document.documentElement).backgroundColor,
      loading: getComputedStyle(document.getElementById('loading-screen')).visibility,
    }));
    expect(before).toEqual({ bg: 'rgb(22, 23, 23)', loading: 'hidden' });
    release();
    await expect(page.locator('#loading-screen, #app').first()).toBeVisible();
    await page.locator('.conversation-item').first().waitFor();
  });

  test('Claro overrides the device; Padrão do sistema follows it again', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    let dialog = await openDialog(page);
    await dialog.getByLabel('Claro').check();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await theme(page)).toBe('light');
    dialog = await openDialog(page);
    await expect(dialog.getByLabel('Claro')).toBeChecked();
    await dialog.getByLabel('Padrão do sistema').check();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await theme(page)).toBe('dark');
  });

  test('the list search keeps its green match, not the chat search yellow', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    await page.locator('.sidebar-search-input').fill('amor');
    const match = page.locator('.search-results .search-highlight').first();
    await expect(match).toBeVisible();
    expect(await match.evaluate(el => getComputedStyle(el).color)).toBe('rgb(33, 192, 99)');
    expect(await match.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });

  test('the chat print comes out dark, as the screen', async ({ page }) => {
    await page.goto('/#/chat/alexandre-de-moraes');
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    await page.evaluate(() => {
      window.__png = null;
      const original = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const reader = new FileReader();
        reader.onload = () => { window.__png = reader.result; };
        reader.readAsDataURL(blob);
        return original(blob);
      };
      HTMLAnchorElement.prototype.click = function () {};
    });
    await page.locator('.chat-header button[aria-label="Menu"]').click();
    await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();
    await expect.poll(() => page.evaluate(() => window.__png), { timeout: 20000 }).not.toBeNull();
    // A pixel of the chat's background, just under the header.
    const pixel = await page.evaluate(() => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve([...ctx.getImageData(4, Math.round(img.naturalHeight * 0.3), 1, 1).data]);
      };
      img.src = window.__png;
    }));
    expect(Math.max(...pixel.slice(0, 3))).toBeLessThan(60);
  });

  test('a chosen theme stays when the device changes', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    const dialog = await openDialog(page);
    await dialog.getByLabel('Escuro').check();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toHaveCount(0);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(200);
    expect(await theme(page)).toBe('dark');
  });

  test('a choice made in another tab shows here', async ({ page, context }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    const other = await context.newPage();
    await other.goto('/');
    await other.locator('.conversation-item').first().waitFor();
    const dialog = await openDialog(other);
    await dialog.getByLabel('Claro').check();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => theme(page)).toBe('light');
  });

  test('if the stylesheets never come, the page still shows after a few seconds', async ({ page }) => {
    await page.route(/\/(base\.css|assets\/index-[^/]*\.css)/, route => route.abort());
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForSelector('#app', { state: 'attached' });
    await expect.poll(
      () => page.evaluate(() => getComputedStyle(document.getElementById('app')).visibility),
      { timeout: 6000 },
    ).toBe('visible');
  });

  test('follows the device changing while the page is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(page)).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('dark');
  });
});
