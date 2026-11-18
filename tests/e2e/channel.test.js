import { test, expect } from '@playwright/test';

// "Atualizações": the MasterWhats channel, its flights as WhatsApp's
// location cards, a flight opened full screen.

// The app's loading screen and the channel's first fetch come before it.
const FIRST_OPEN = { timeout: 15000 };

/** On a phone the details are in a sheet: open it. */
async function details(page) {
  const summary = page.locator('.flight-viewer-summary');
  if (await summary.isVisible()) await summary.click();
  return page.locator('.flight-viewer');
}

test('the channel lists the flights, each map opening the flight', async ({ page }) => {
  await page.goto('/#/canal/masterwhats');
  await expect(page.locator('.channel-header-name')).toContainText('MasterWhats', FIRST_OPEN);
  const post = page.locator('.channel-post[data-id="voo-2025-08-28-pr-ngm"]');
  await expect(post).toContainText('Brasília 15h36 → Congonhas 16h57');
  // The map is drawn by the site: a route and a pin, no map service.
  await expect(post.locator('.flight-map-route')).toHaveCount(1);
  await expect(post.locator('.flight-map-pin')).toHaveCount(1);
  await post.locator('.channel-post-map').click();
  await expect(page).toHaveURL(/#\/canal\/masterwhats\/voo-2025-08-28-pr-ngm$/);
  const viewer = await details(page);
  await expect(viewer.locator('.flight-map-label')).toHaveText(['Brasília · 15h36', 'Congonhas · 16h57']);
  await expect(viewer.locator('.flight-viewer-person', { hasText: 'Daniel Vorcaro' })).toContainText('ver perfil');
  await expect(viewer.locator('.flight-viewer-person', { hasText: 'Fábio Faria' })).toContainText('abrir conversa');
  // Nobody cites this aircraft: no button for it.
  await expect(viewer.getByText(/mensagens que citam/)).toHaveCount(0);
  const open = viewer.getByRole('link', { name: 'Abrir no mapa' });
  await expect(open).toHaveAttribute('href', /Aeroporto%20de%20Congonhas/);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(page).toHaveURL(/#\/canal\/masterwhats$/);
});

test('a passenger with a chat here opens it; the messages that cite the aircraft open the search', async ({ page }) => {
  await page.goto('/#/canal/masterwhats/voo-2024-06-28-pp-nlr');
  await expect(page.locator('.flight-viewer')).toBeVisible(FIRST_OPEN);
  const viewer = await details(page);
  await viewer.getByRole('button', { name: 'Ver as 3 mensagens que citam o PP-NLR' }).click();
  await expect(viewer).toHaveCount(0);
  await expect(page.locator('.sidebar-search-input')).toHaveValue('PP-NLR');
  await expect(page.locator('.search-result-item')).toHaveCount(3);

  await page.goto('/#/canal/masterwhats/voo-2025-08-28-pr-ngm');
  await expect(page.locator('.flight-viewer')).toBeVisible(FIRST_OPEN);
  await details(page);
  await page.locator('.flight-viewer-person', { hasText: 'Fábio Faria' }).click();
  await expect(page).toHaveURL(/#\/chat\/fabio-faria/);
  await expect(page.locator('.flight-viewer')).toHaveCount(0);
});

test('on a phone: the tab, the channel, and the details in a sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.sidebar-bottom-tab[data-tab="updates"]').click(FIRST_OPEN);
  await expect(page).toHaveURL(/#\/atualizacoes$/);
  await page.locator('.updates-channel').click();
  await expect(page.locator('.channel-view')).toBeVisible();
  await page.locator('.channel-post[data-id="voo-2024-06-28-pp-nlr"] .channel-post-map').click();
  const sheet = page.locator('.flight-viewer-info');
  await expect(sheet.locator('.flight-viewer-details')).toBeHidden();
  await sheet.locator('.flight-viewer-summary').click();
  await expect(sheet.locator('.flight-viewer-details')).toBeVisible();
  // The route stays in sight above the open sheet.
  const pin = await page.locator('.flight-viewer .flight-map-pin').boundingBox();
  const top = (await sheet.boundingBox()).y;
  expect(pin.y + pin.height).toBeLessThan(top);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.flight-viewer-close').click();
  await expect(page.locator('.flight-viewer')).toHaveCount(0);
  await page.locator('.channel-back').click();
  await expect(page).toHaveURL(/#\/atualizacoes$/);
});
