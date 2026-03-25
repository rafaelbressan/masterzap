import { test, expect } from '@playwright/test';

test.describe('Layout — Batch 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the two-panel layout', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    const mainArea = page.locator('.main-area');

    await expect(sidebar).toBeVisible();
    await expect(mainArea).toBeVisible();
  });

  test('sidebar has header with title', async ({ page }) => {
    const title = page.locator('.sidebar-header-title');
    await expect(title).toHaveText('MasterZap');
  });

  test('sidebar has search input', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Pesquisar/);
  });

  test('sidebar renders at least one conversation item', async ({ page }) => {
    const items = page.locator('.conversation-item');
    await expect(items).toHaveCount(1); // Only martha-graeff for now
  });

  test('conversation item shows name and time', async ({ page }) => {
    const name = page.locator('.conversation-item-name').first();
    const time = page.locator('.conversation-item-time').first();

    await expect(name).toHaveText('Martha Graeff');
    await expect(time).not.toBeEmpty();
  });

  test('empty state is visible when no conversation is selected', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();

    const title = page.locator('.empty-state-title');
    await expect(title).toHaveText('MasterZap Web');
  });

  test('clicking a conversation marks it active', async ({ page }) => {
    const item = page.locator('.conversation-item').first();
    await item.click();
    await expect(item).toHaveClass(/active/);
  });

  test('green header bar is present', async ({ page }) => {
    const bar = page.locator('.app-header-bar');
    await expect(bar).toBeAttached();
  });

  test('app container constrains layout width', async ({ page }) => {
    const container = page.locator('.app-container');
    await expect(container).toBeVisible();
    const box = await container.boundingBox();
    expect(box.width).toBeLessThanOrEqual(1600);
  });
});
