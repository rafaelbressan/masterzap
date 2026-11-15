import { test, expect } from '@playwright/test';

// A reply shows the message it answers on top, as WhatsApp does: who wrote it
// and the start of it. In Fábio Faria's chat, message 104 quotes his own
// message 103, which is in the chat (the quote goes there); message 77 quotes
// a message of Vorcaro's that the report did not print (the quote goes
// nowhere, but still says who wrote it).

test.beforeEach(async ({ page }) => {
  await page.goto('/#/chat/fabio-faria/msg/104');
  await page.locator('.chat-msg-row[data-id="104"]').waitFor();
});

test("a reply shows the quoted message's author and text over its own", async ({ page }) => {
  const bubble = page.locator('.chat-msg-row[data-id="104"] .chat-msg-bubble');
  const quote = bubble.locator('.chat-msg-quote');
  await expect(quote.locator('.chat-msg-quote-author')).toHaveText('Fábio Faria');
  await expect(quote.locator('.chat-msg-quote-text')).toHaveText('Podem entrar em contato lá na PF. Ele aceitou');
  await expect(quote).toHaveClass(/from-contact/);
  const [quoteBox, textBox] = [await quote.boundingBox(), await bubble.locator('.chat-msg-content').boundingBox()];
  expect(quoteBox.y + quoteBox.height).toBeLessThanOrEqual(textBox.y + 1);
  // Inside the bubble, not wider than it.
  const bubbleBox = await bubble.boundingBox();
  expect(quoteBox.x).toBeGreaterThanOrEqual(bubbleBox.x);
  expect(quoteBox.x + quoteBox.width).toBeLessThanOrEqual(bubbleBox.x + bubbleBox.width + 0.5);
  // Only on replies.
  await expect(page.locator('.chat-msg-row[data-id="103"] .chat-msg-quote')).toHaveCount(0);
});

test('tapping the quote goes to the quoted message', async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="104"] .chat-msg-quote').click();
  await expect(page.locator('.chat-msg-row[data-id="103"]')).toHaveClass(/msg-highlight/);
  // In the same chat, without a new page in the history.
  await expect(page).toHaveURL(/#\/chat\/fabio-faria\/msg\/104$/);
});

test('a quote of a message the report did not print still names its author', async ({ page }) => {
  const row = page.locator('.chat-msg-row[data-id="77"]');
  await row.scrollIntoViewIfNeeded();
  const quote = row.locator('.chat-msg-quote');
  await expect(quote.locator('.chat-msg-quote-author')).toHaveText('Você');
  await expect(quote).toHaveClass(/from-owner/);
  // Nothing to go to: not a button.
  expect(await quote.evaluate(el => el.tagName)).toBe('DIV');
});

test('the message info shows the quote too', async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="104"] .chat-msg-content').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Info da mensagem' }).click();
  const quote = page.locator('.msg-info-preview .chat-msg-quote');
  await expect(quote.locator('.chat-msg-quote-author')).toHaveText('Fábio Faria');
  expect(await quote.evaluate(el => el.tagName)).toBe('DIV');
});
