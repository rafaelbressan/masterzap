import { test, expect } from '@playwright/test';

test.describe('Settings/About Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('settings icon is visible on nav rail', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    const settingsBtn = page.locator('.nav-rail-btn[title="Sobre"]');
    await expect(settingsBtn).toBeVisible();
  });

  test('clicking settings opens the about drawer', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const drawer = page.locator('.settings-drawer');
    await expect(drawer).toBeVisible();
  });

  test('about drawer shows MasterWhats title', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const title = page.locator('.profile-drawer-title');
    await expect(title).toHaveText('Sobre o MasterWhats');
  });

  test('about drawer shows logo and app name', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const logoName = page.locator('.settings-logo-name');
    await expect(logoName).toHaveText('MasterWhats');
    const logoImg = page.locator('.settings-logo-img');
    await expect(logoImg).toBeVisible();
  });

  test('about drawer has profile sections with content', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const sections = page.locator('.profile-section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(5);
  });

  test('about drawer has action links for search terms', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const actionLinks = page.locator('.profile-action-link');
    const count = await actionLinks.count();
    expect(count).toBeGreaterThan(10);
  });

  test('closing settings drawer restores sidebar', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    await expect(page.locator('.settings-drawer')).toBeVisible();

    await page.locator('.profile-drawer-close').click();
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('main area shows placeholder when settings is open', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Nav rail hidden on mobile');
    await page.locator('.nav-rail-btn[title="Sobre"]').click();
    const placeholder = page.locator('.profile-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(page.locator('.profile-placeholder-text')).toHaveText('Sobre');
  });
});

test.describe('SEO & Favicons', () => {
  test('page has correct title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('MasterWhats');
    expect(title).toContain('Vorcaro');
  });

  test('favicon is served', async ({ page }) => {
    const response = await page.goto('/favicon.ico');
    expect(response.status()).toBe(200);
  });

  test('site.webmanifest is served', async ({ page }) => {
    const response = await page.goto('/site.webmanifest');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.name).toBe('MasterWhats');
  });

  test('robots.txt is served', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('Allow: /');
    expect(text).toContain('GPTBot');
  });

  test('sitemap.xml is served', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('masterwhats.com');
  });

  test('llms.txt is served', async ({ page }) => {
    const response = await page.goto('/llms.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('MasterWhats');
    expect(text).toContain('Daniel Vorcaro');
  });
});
