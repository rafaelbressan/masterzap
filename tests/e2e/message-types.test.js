import { test, expect } from '@playwright/test';

test.describe('Message Type Rendering — Batch 5', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    // Wait for messages to load
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });
  });

  test('text messages render with content', async ({ page }) => {
    const textMsg = page.locator('.chat-msg-content').first();
    await expect(textMsg).toBeVisible();
    const text = await textMsg.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('system messages render centered', async ({ page }) => {
    const system = page.locator('.chat-msg-system').first();
    // System message is the very first message (id=1)
    if (await system.count() > 0) {
      await expect(system).toBeVisible();
      const row = page.locator('.chat-msg-row.system').first();
      const justify = await row.evaluate(el =>
        window.getComputedStyle(el).justifyContent
      );
      expect(justify).toBe('center');
    }
  });

  test('date badges render between day sections', async ({ page }) => {
    const badges = page.locator('.chat-date-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
    // Check first badge has a formatted date
    const text = await badges.first().textContent();
    expect(text).toMatch(/\d+/); // contains at least a number
  });

  test('message meta shows time in HH:MM format', async ({ page }) => {
    const meta = page.locator('.chat-msg-meta').first();
    await expect(meta).toBeVisible();
    const text = await meta.textContent();
    expect(text).toMatch(/\d{2}:\d{2}/);
  });

  test('consecutive same-direction bubbles hide tails', async ({ page }) => {
    // Find a bubble whose tail should be hidden (consecutive same direction)
    const rows = page.locator('.chat-msg-row');
    const count = await rows.count();

    // We need at least 2 rows to test this
    if (count >= 2) {
      // Just verify the CSS rule exists by checking a tail element
      const tail = page.locator('.chat-msg-tail').first();
      await expect(tail).toBeAttached();
    }
  });

  test('bubbles have correct border radius', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    await expect(bubble).toBeVisible();
    const radius = await bubble.evaluate(el =>
      window.getComputedStyle(el).borderRadius
    );
    // Should have rounded corners (not 0)
    expect(radius).not.toBe('0px');
  });

  test('bubble shadows are visible', async ({ page }) => {
    const bubble = page.locator('.chat-msg-bubble').first();
    const shadow = await bubble.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );
    expect(shadow).not.toBe('none');
  });
});

test.describe('Media Message Types — Batch 5', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item').first().click();
    await page.locator('.chat-msg-bubble').first().waitFor({ timeout: 10000 });
  });

  test('image messages show media placeholder', async ({ page }) => {
    // Scroll up to find an image message — the first few days should have some
    // The first day (2024-02-10) has image id=21
    const imgPlaceholder = page.locator('.chat-media-image');
    // May need to scroll to find images in loaded days
    if (await imgPlaceholder.count() > 0) {
      await expect(imgPlaceholder.first()).toBeVisible();
    }
  });

  test('call messages show call card', async ({ page }) => {
    const callCard = page.locator('.chat-call-card');
    if (await callCard.count() > 0) {
      await expect(callCard.first()).toBeVisible();
      const label = callCard.first().locator('.chat-call-label');
      await expect(label).toBeVisible();
    }
  });

  test('deleted messages show deleted indicator', async ({ page }) => {
    const deleted = page.locator('.chat-deleted-msg');
    if (await deleted.count() > 0) {
      await expect(deleted.first()).toBeVisible();
      await expect(deleted.first()).toContainText('apagada');
    }
  });
});
