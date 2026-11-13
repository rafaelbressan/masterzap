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

  test('follows the device changing while the page is open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().waitFor();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(page)).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => theme(page)).toBe('dark');
  });
});
