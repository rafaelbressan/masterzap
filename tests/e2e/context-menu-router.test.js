import { test, expect } from '@playwright/test';

test.describe('Context Menu — Batch 6', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });
  });

  test('right-clicking a message shows context menu', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });

    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();
  });

  test('context menu has "Copiar texto" option', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });

    const copyItem = page.locator('.context-menu-item', { hasText: 'Copiar texto' });
    await expect(copyItem).toBeVisible();
  });

  test('context menu has "Info da mensagem" option', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });

    const infoItem = page.locator('.context-menu-item', { hasText: 'Info da mensagem' });
    await expect(infoItem).toBeVisible();
  });

  test('clicking outside closes context menu', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });

    await expect(page.locator('.context-menu')).toBeVisible();

    // Click on the chat area (not on the menu)
    await page.locator('.chat-header').click();
    await expect(page.locator('.context-menu')).not.toBeVisible();
  });

  test('pressing Escape closes context menu', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });

    await expect(page.locator('.context-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.context-menu')).not.toBeVisible();
  });

  test('right-clicking outside a bubble does not show menu', async ({ page }) => {
    const chatMessages = page.locator('.chat-messages');
    // Click on the messages area but not on a bubble
    await chatMessages.click({ button: 'right', position: { x: 5, y: 5 } });
    await expect(page.locator('.context-menu')).not.toBeVisible();
  });
});

test.describe('Hash Router — Batch 6', () => {
  test('navigating to #/chat/martha-graeff opens the conversation', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff');
    // Should directly open the chat view
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });

    const name = page.locator('.chat-header-name');
    await expect(name).toHaveText('Martha Graeff');
  });

  test('navigating to #/ shows empty state', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Empty state hidden on mobile');
    await page.goto('/#/');
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
  });

  test('clicking a conversation updates the URL hash', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();

    // Hash should now contain the conversation id
    const url = page.url();
    expect(url).toContain('#/chat/martha-graeff');
  });

  test('sidebar item is active when navigating via URL', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Sidebar hidden when chat open on mobile');
    await page.goto('/#/chat/martha-graeff');
    const item = page.locator('.conversation-item.active');
    await expect(item).toBeVisible({ timeout: 10000 });
  });

  test('back button navigates to empty state', async ({ page }) => {
    test.skip(page.viewportSize().width <= 600, 'Empty state hidden on mobile');
    await page.goto('/#/chat/martha-graeff');
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });

    // Click back button (hidden on desktop, force display)
    const backBtn = page.locator('.chat-header-back');
    await backBtn.evaluate(el => el.style.display = 'block');
    await backBtn.click();

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
  });
});
