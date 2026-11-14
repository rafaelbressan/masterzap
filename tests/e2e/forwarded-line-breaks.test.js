import { test, expect } from '@playwright/test';

// What WhatsApp shows of a message that the data carries and the bubble used
// to drop: the "Encaminhada" over a forwarded message, and the line breaks
// of one written in several lines. Fábio Faria's message 5 has both: the car
// and the plate, forwarded, one per line.

test.beforeEach(async ({ page }) => {
  await page.goto('/#/chat/fabio-faria/msg/5');
  await page.locator('.chat-msg-row[data-id="5"]').waitFor();
});

test('a forwarded message says "Encaminhada" over its text', async ({ page }) => {
  const bubble = page.locator('.chat-msg-row[data-id="5"] .chat-msg-bubble');
  const tag = bubble.locator('.chat-msg-forwarded');
  await expect(tag).toHaveText('Encaminhada');
  // Over the text, not under it.
  const [tagBox, textBox] = [await tag.boundingBox(), await bubble.locator('.chat-msg-content').boundingBox()];
  expect(tagBox.y + tagBox.height).toBeLessThanOrEqual(textBox.y + 1);
  // Only on forwarded ones: the message before it was not.
  await expect(page.locator('.chat-msg-row[data-id="4"] .chat-msg-forwarded')).toHaveCount(0);
});

test('a message written in lines keeps them', async ({ page }) => {
  const text = page.locator('.chat-msg-row[data-id="5"] .chat-msg-content');
  // innerText follows the layout: the break is there only if it is drawn.
  expect(await text.evaluate(el => el.innerText)).toBe('Range Rover Vogue\nRSB7C37');
  // Two lines on screen, not one run together.
  const lines = await text.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
  });
  expect(lines).toBe(2);
});

test("a deleted message does not say it was forwarded, as on WhatsApp", async ({ page }) => {
  // Message 10 was forwarded, then deleted.
  const row = page.locator('.chat-msg-row[data-id="10"]');
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('.chat-msg-content')).toContainText('apagada');
  await expect(row.locator('.chat-msg-forwarded')).toHaveCount(0);
});

test('the message info shows "Encaminhada" and the line breaks too', async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="5"] .chat-msg-bubble').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Info da mensagem' }).click();
  const preview = page.locator('.msg-info-preview');
  await expect(preview.locator('.chat-msg-forwarded')).toHaveText('Encaminhada');
  expect(await preview.locator('.msg-info-preview-content').evaluate(el => el.innerText)).toBe('Range Rover Vogue\nRSB7C37');
});
