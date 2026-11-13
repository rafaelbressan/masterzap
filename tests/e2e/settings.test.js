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

  test('the legal channel comes after the highlights, before the sources and the credits', async ({ page }) => {
    // Opened from the list's menu, so the phone takes the same path.
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' }).click();
    const titles = await page.locator('.settings-drawer .profile-section-title').allTextContents();
    const channel = titles.indexOf('Canal Jurídico');
    expect(titles.filter(t => t === 'Canal Jurídico')).toHaveLength(1);
    expect(channel).toBeGreaterThan(titles.findLastIndex(t => t.startsWith('Destaques')));
    expect(titles[channel + 1]).toBe('Prazos de atendimento');
    // The deadlines are a list a screen reader announces as one.
    await expect(page.locator('.settings-drawer .profile-section', { hasText: 'Prazos de atendimento' }).getByRole('listitem')).toHaveCount(3);
    const form = page.locator('.settings-drawer .profile-section', { hasText: 'Canal Jurídico' }).getByRole('link', { name: 'formulário' });
    await expect(form).toHaveAttribute('href', /^https:\/\/app\.pipefy\.com\//);
    await expect(form).toHaveAttribute('target', '_blank');
    // In page order: the channel, then the sources, then the credits.
    const order = await page.locator('.settings-drawer').evaluate((el) => {
      const all = [...el.querySelectorAll('*')];
      const deadlines = [...el.querySelectorAll('.profile-section')].find(s => s.textContent.includes('Prazos de atendimento'));
      return [deadlines, el.querySelector('.profile-sources'), el.querySelector('.profile-credits')]
        .map(node => all.indexOf(node));
    });
    expect(order.every(i => i >= 0)).toBe(true);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  test('the donation keys copy with a tap, and say so where it can be seen', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' }).click();
    const support = page.locator('.settings-drawer .profile-section', { hasText: 'Apoie o MasterWhats' });
    await support.getByRole('button', { name: 'Copiar chave PIX' }).click();
    const toast = page.locator('.search-toast');
    await expect(toast).toContainText('Chave PIX copiada');
    await expect(toast).toBeInViewport();
    const pix = await support.locator('.profile-copy-value').first().textContent();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pix);
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
