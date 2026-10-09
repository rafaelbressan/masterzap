import { test, expect } from '@playwright/test';

// The API/MCP page opens from the list's menu, lives at #/api, and takes the
// place "Sobre" takes: beside the rail on a wide screen, the whole screen on
// a phone. It hands over the one URL people come for.

const openFromMenu = async (page) => {
  await page.goto('/');
  await expect(page.locator('.conversation-item').first()).toBeVisible();
  await page.locator('.sidebar-menu-btn').click();
  const item = page.locator('.sidebar-dropdown-item', { hasText: 'API/MCP' });
  await item.click();
  await expect(page.locator('.api-drawer')).toBeVisible();
};

test('opens from the menu, at its own address', async ({ page }) => {
  await openFromMenu(page);
  await expect(page).toHaveURL(/#\/api$/);
  await expect(page.locator('.api-drawer .profile-drawer-title')).toHaveText('API/MCP');
  await expect(page.locator('.api-drawer .api-code pre').first()).toHaveText('https://www.masterwhats.com.br/api/mcp');
});

test('opens straight from the address too', async ({ page }) => {
  await page.goto('/#/api');
  await expect(page.locator('.api-drawer')).toBeVisible({ timeout: 20000 });
});

test('lists every route of the table, each opening its example', async ({ page }) => {
  await openFromMenu(page);
  const routes = page.locator('.api-route');
  expect(await routes.count()).toBe(8);
  await expect(routes.first().locator('.api-route-path')).toHaveText('/conversations');
  await expect(routes.first()).toHaveAttribute('href', '/api/v1/conversations');
  await expect(routes.first()).toHaveAttribute('target', '_blank');
});

test('takes the place "Sobre" takes: beside the rail, or the whole screen', async ({ page }) => {
  await openFromMenu(page);
  const drawer = await page.locator('.api-drawer').boundingBox();
  const view = page.viewportSize();
  await expect(page.locator('.sidebar')).toBeHidden();
  if (view.width > 600) {
    expect(drawer.width).toBeLessThan(view.width * 0.6);
    await expect(page.locator('.profile-placeholder')).toBeVisible();
  } else {
    expect(drawer.width).toBeGreaterThan(view.width * 0.95);
  }
});

test('copies the MCP URL', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openFromMenu(page);
  await page.locator('.api-copy').first().click();
  await expect(page.locator('.api-copy').first()).toContainText('Copiado');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://www.masterwhats.com.br/api/mcp');
});

test('explains each client, with a command to copy', async ({ page }) => {
  await openFromMenu(page);
  for (const name of ['ChatGPT', 'Claude (claude.ai)', 'Claude Code', 'Cursor']) {
    await expect(page.locator('.profile-section-title', { hasText: `Como usar no ${name}` })).toBeVisible();
  }
  await expect(page.locator('.api-code pre', { hasText: 'claude mcp add' })).toBeVisible();
  await expect(page.locator('.api-limits')).toContainText('300/dia');
});

test('ends with examples to paste: curl for the API, questions for the MCP', async ({ page }) => {
  await openFromMenu(page);
  await expect(page.locator('.profile-section-title', { hasText: 'Exemplos com a API' })).toBeVisible();
  expect(await page.locator('.api-code pre', { hasText: 'curl -s' }).count()).toBeGreaterThan(5);
  await expect(page.locator('.profile-section-title', { hasText: 'Exemplos com o MCP' })).toBeVisible();
  await expect(page.locator('.api-code pre', { hasText: 'dois dias antes de ser preso' })).toBeVisible();
  // The base is set as code, not loose text.
  await expect(page.locator('.api-sections p code.inline-code').first()).toHaveText('https://www.masterwhats.com.br/api/v1');
});

test('closes back to the list', async ({ page }) => {
  await openFromMenu(page);
  await page.locator('.api-drawer .profile-drawer-close').click();
  await expect(page.locator('.api-drawer')).toHaveCount(0);
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page).toHaveURL(/#\/$|\/$/);
});

// Opening Sobre after the API page used to leave the address at #/api with no
// drawer; the next tap on API/MCP navigated to where it already was and did
// nothing. Drawers now close each other, and leaving the page leaves the address.
test('survives Sobre and Perfil in between', async ({ page }) => {
  await openFromMenu(page);
  await page.locator('.sidebar-menu-btn').click({ force: true }).catch(() => {});
  // Sobre from the Sobre shortcut in the rail or the menu, whichever this layout has.
  const sobre = page.locator('button[aria-label="Sobre"]');
  if (await sobre.first().isVisible()) await sobre.first().click();
  else { await page.locator('.api-drawer .profile-drawer-close').click(); await page.locator('.sidebar-menu-btn').click(); await page.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' }).click(); }
  await expect(page.locator('.settings-drawer:not(.api-drawer)')).toBeVisible();
  await expect(page.locator('.api-drawer')).toHaveCount(0);
  await expect(page).not.toHaveURL(/#\/api/);
  await page.locator('.profile-drawer-close').first().click();
  await expect(page.locator('.sidebar')).toBeVisible();

  await page.locator('.sidebar-menu-btn').click();
  await page.locator('.sidebar-dropdown-item', { hasText: 'API/MCP' }).click();
  await expect(page.locator('.api-drawer')).toBeVisible();
  await expect(page).toHaveURL(/#\/api$/);
});

test('the Sobre drawer carries a shortcut to the API page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.conversation-item').first()).toBeVisible();
  await page.locator('.sidebar-menu-btn').click();
  await page.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' }).click();
  const shortcut = page.locator('.settings-drawer .profile-drawer-action[aria-label="API/MCP"]');
  await expect(shortcut).toBeVisible();
  await shortcut.click();
  await expect(page.locator('.api-drawer')).toBeVisible();
  await expect(page.locator('.settings-drawer:not(.api-drawer)')).toHaveCount(0);
});

// A route opened in a new tab answers with the file, not with the app.
test('a route link opens the JSON', async ({ page, context }) => {
  await openFromMenu(page);
  const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('.api-route').first().click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toMatch(/\/api\/v1\/conversations$/);
  const body = await tab.evaluate(() => document.body.innerText);
  expect(JSON.parse(body).conversations.length).toBeGreaterThan(20);
});

test.describe('Aviso legal', () => {
  test('opens from the menu at #/legal, in the place Sobre takes, and closes back', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.conversation-item').first()).toBeVisible();
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Aviso legal' }).click();
    await expect(page.locator('.legal-drawer')).toBeVisible();
    await expect(page).toHaveURL(/#\/legal$/);
    await expect(page.locator('.legal-drawer .profile-section-title', { hasText: 'Veracidade' })).toBeVisible();
    await expect(page.locator('.legal-drawer')).toContainText('não afirma que os fatos narrados');
    await page.locator('.legal-drawer .profile-drawer-close').click();
    await expect(page.locator('.legal-drawer')).toHaveCount(0);
    await expect(page).not.toHaveURL(/#\/legal/);
  });

  test('the Sobre drawer ends with the short notice', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.conversation-item').first()).toBeVisible();
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' }).click();
    await expect(page.locator('.settings-drawer .profile-section-title', { hasText: 'Aviso legal' })).toBeAttached();
    await expect(page.locator('.settings-drawer')).toContainText('não atesta a veracidade');
  });
});
