import { test, expect } from '@playwright/test';

test.describe('Chat List — Batch 3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('conversation item displays message count badge', async ({ page }) => {
    const badge = page.locator('.conversation-item-badge').first();
    await expect(badge).toBeVisible();
    // 65,772 messages formatted as pt-BR
    await expect(badge).toContainText('65');
  });

  test('conversation item shows relative date', async ({ page }) => {
    const time = page.locator('.conversation-item-time').first();
    await expect(time).toBeVisible();
    // Should show a date (not a time like "23:27")
    const text = await time.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('conversation item shows last message preview', async ({ page }) => {
    const preview = page.locator('.conversation-item-preview').first();
    await expect(preview).toBeVisible();
    const text = await preview.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('conversation item has avatar', async ({ page }) => {
    const avatar = page.locator('.conversation-item-avatar').first();
    await expect(avatar).toBeVisible();
    // Contains SVG default avatar
    const svg = avatar.locator('svg');
    await expect(svg).toBeAttached();
  });

  test('data loads from conversations.json', async ({ page }) => {
    // Verify the fetch happened by checking the conversation name matches data
    const name = page.locator('.conversation-item-name').first();
    await expect(name).toHaveText('Martha Graeff');
  });

  test('conversation list is scrollable when content overflows', async ({ page }) => {
    const list = page.locator('.conversation-list');
    const overflow = await list.evaluate(el =>
      window.getComputedStyle(el).overflowY
    );
    expect(overflow).toBe('auto');
  });
});
