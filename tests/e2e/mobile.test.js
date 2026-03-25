import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive — Batch 8', () => {
  // These tests only make sense on narrow viewports (mobile project)
  test.beforeEach(({ page }, testInfo) => {
    test.skip(page.viewportSize().width > 600, 'Mobile-only tests');
  });

  test('sidebar takes full width on mobile', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(370);
  });

  test('main area is hidden when no conversation selected', async ({ page }) => {
    await page.goto('/');
    const mainArea = page.locator('.main-area');
    // On mobile, main area should not be visible without chat-open
    const display = await mainArea.evaluate(el =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('clicking conversation hides sidebar and shows chat', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();

    // Sidebar should be hidden
    const sidebar = page.locator('.sidebar');
    const sidebarDisplay = await sidebar.evaluate(el =>
      window.getComputedStyle(el).display
    );
    expect(sidebarDisplay).toBe('none');

    // Chat view should be visible
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });
  });

  test('back button is visible on mobile chat view', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-view').waitFor({ timeout: 10000 });

    const backBtn = page.locator('.chat-header-back');
    await expect(backBtn).toBeVisible();
  });

  test('back button returns to sidebar', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-view').waitFor({ timeout: 10000 });

    await page.locator('.chat-header-back').click();

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('message bubbles are wider on mobile', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });

    const bubble = page.locator('.chat-msg-bubble').first();
    const maxWidth = await bubble.evaluate(el =>
      window.getComputedStyle(el).maxWidth
    );
    expect(maxWidth).toBe('85%');
  });

  test('green header bar is hidden on mobile', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('.app-header-bar');
    const display = await bar.evaluate(el =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('direct URL navigation works on mobile', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff');

    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });

    // Sidebar should be hidden
    const sidebar = page.locator('.sidebar');
    const display = await sidebar.evaluate(el =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });
});
