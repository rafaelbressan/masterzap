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
  await expect(text).toHaveText('Range Rover Vogue\nRSB7C37');
  // Two lines on screen, not one run together.
  const lines = await text.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
  });
  expect(lines).toBe(2);
});
