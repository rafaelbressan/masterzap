import { test, expect } from '@playwright/test';

test.describe('Layout — Batch 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the two-panel layout', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Two-panel only on desktop');
    const sidebar = page.locator('.sidebar');
    const mainArea = page.locator('.main-area');

    await expect(sidebar).toBeVisible();
    await expect(mainArea).toBeVisible();
  });

  test('sidebar has header with title', async ({ page }) => {
    const title = page.locator('.sidebar-header-title');
    await expect(title).toHaveText('MasterWhats');
  });

  test('sidebar has search input', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /Pesquisar/);
  });

  test('sidebar renders at least one conversation item', async ({ page }) => {
    const items = page.locator('.conversation-item');
    // Both leaks are loaded; assert there is a list rather than a fixed size,
    // so adding a conversation does not break the test. The list comes after
    // the data: wait for its first row before counting.
    await items.first().waitFor();
    expect(await items.count()).toBeGreaterThan(1);
  });

  test('conversation item shows name and time', async ({ page }) => {
    // The list is ordered by recency, so look the row up by id instead of
    // assuming which conversation sits on top.
    const item = page.locator('.conversation-item[data-id="martha-graeff"]');
    await expect(item.locator('.conversation-item-name')).toHaveText('Martha Graeff');
    await expect(item.locator('.conversation-item-time')).not.toBeEmpty();
  });

  test('empty state is visible when no conversation is selected (desktop)', async ({ page }) => {
    // On mobile, main area is hidden when no chat is open — skip if viewport is narrow
    const vw = page.viewportSize().width;
    test.skip(vw <= 600, 'Empty state is inside hidden main area on mobile');

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();

    const title = page.locator('.empty-state-title');
    await expect(title).toHaveText('MasterWhats');
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
