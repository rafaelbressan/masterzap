import { test, expect } from '@playwright/test';

test.describe('Chat View — Batch 4', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click on the conversation to open chat view
    await page.locator('.conversation-item').first().click();
  });

  test('clicking a conversation opens the chat view', async ({ page }) => {
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible();
  });

  test('chat header shows contact name', async ({ page }) => {
    const name = page.locator('.chat-header-name');
    await expect(name).toHaveText('Martha Graeff');
  });

  test('chat header shows message count', async ({ page }) => {
    const info = page.locator('.chat-header-info');
    await expect(info).toContainText('mensagens');
  });

  test('chat header has avatar', async ({ page }) => {
    const avatar = page.locator('.chat-header-avatar');
    await expect(avatar).toBeVisible();
  });

  test('empty state is replaced by chat view', async ({ page }) => {
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).not.toBeVisible();
  });

  test('messages are loaded and visible', async ({ page }) => {
    // Wait for messages to render
    const bubble = page.locator('.chat-msg-bubble').first();
    await expect(bubble).toBeVisible({ timeout: 10000 });
  });

  test('date badges are visible', async ({ page }) => {
    const badge = page.locator('.chat-date-badge').first();
    await expect(badge).toBeVisible({ timeout: 10000 });
  });

  test('outgoing messages are right-aligned', async ({ page }) => {
    const outgoing = page.locator('.chat-msg-row.outgoing').first();
    await expect(outgoing).toBeVisible({ timeout: 10000 });
    const justify = await outgoing.evaluate(el =>
      window.getComputedStyle(el).justifyContent
    );
    expect(justify).toBe('flex-end');
  });

  test('incoming messages are left-aligned', async ({ page }) => {
    const incoming = page.locator('.chat-msg-row.incoming').first();
    await expect(incoming).toBeVisible({ timeout: 10000 });
    const justify = await incoming.evaluate(el =>
      window.getComputedStyle(el).justifyContent
    );
    expect(justify).toBe('flex-start');
  });

  test('message bubbles have correct background colors', async ({ page }) => {
    const outgoing = page.locator('.chat-msg-bubble.outgoing').first();
    await expect(outgoing).toBeVisible({ timeout: 10000 });

    const outBg = await outgoing.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    // --WDS-systems-bubble-surface-outgoing: #D9FDD3 = rgb(217, 253, 211)
    expect(outBg).toBe('rgb(217, 253, 211)');

    const incoming = page.locator('.chat-msg-bubble.incoming').first();
    if (await incoming.count() > 0) {
      const inBg = await incoming.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      // --WDS-systems-bubble-surface-incoming: #FFFFFF = rgb(255, 255, 255)
      expect(inBg).toBe('rgb(255, 255, 255)');
    }
  });

  test('messages area is scrollable', async ({ page }) => {
    const area = page.locator('.chat-messages');
    await expect(area).toBeVisible();
    const overflow = await area.evaluate(el =>
      window.getComputedStyle(el).overflowY
    );
    expect(overflow).toBe('auto');
  });
});
