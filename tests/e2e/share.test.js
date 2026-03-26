import { test, expect } from '@playwright/test';

test.describe('Share Message Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });
  });

  test('context menu has "Compartilhar texto" option', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });
    const shareItem = page.locator('.context-menu-item', { hasText: 'Compartilhar texto' });
    await expect(shareItem).toBeVisible();
  });

  test('clicking "Compartilhar texto" shows toast', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await bubble.click({ button: 'right' });
    await page.locator('.context-menu-item', { hasText: 'Compartilhar texto' }).click();

    const toast = page.locator('.search-toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText('Link copiado');
  });
});

test.describe('Message URL Navigation', () => {
  test('navigating to /msg/13984 scrolls to peleleca message', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff/msg/13984');
    // Wait for the message to be loaded and highlighted
    const msg = page.locator('[data-id="13984"]');
    await expect(msg).toBeVisible({ timeout: 15000 });
  });

  test('navigating to /msg/2 scrolls to first day message', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff/msg/2');
    const msg = page.locator('[data-id="2"]');
    await expect(msg).toBeVisible({ timeout: 15000 });
  });

  test('backward compat: /chat/martha-graeff still works', async ({ page }) => {
    await page.goto('/#/chat/martha-graeff');
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Chat Header Click', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });
  });

  test('clicking 3-dot menu button opens dropdown', async ({ page }) => {
    const menuBtn = page.getByRole('button', { name: 'Menu' });
    await menuBtn.click();

    const dropdown = page.locator('.chat-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
  });

  test('dropdown has all expected items', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    const items = page.locator('.chat-dropdown-item');
    const count = await items.count();
    expect(count).toBe(6);
    await expect(items.first()).toContainText('Info do contato');
    await expect(items.last()).toContainText('Fechar conversa');
  });
});
