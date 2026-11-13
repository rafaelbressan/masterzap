import { test, expect } from '@playwright/test';

// A conversation from someone else's phone: conversations.json names its
// owner, and that person's messages are the green, outgoing ones. Every
// source today is Vorcaro's phone, so the data is rewritten here.
test("the owner named by the data sends the green bubbles, and the other side is the contact", async ({ page }) => {
  await page.route(/\/data\/conversations\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const ciro = data.conversations.find(c => c.id === 'ciro-soares');
    ciro.owner = 'Ciro Soares';
    ciro.contact = 'Daniel Vorcaro';
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#/chat/ciro-soares');
  const rows = page.locator('.chat-msg-row:not(.system)');
  await expect(rows.first()).toBeVisible();
  // Every message Ciro sent is outgoing; every one DV sent, incoming.
  const sides = await rows.evaluateAll(els => els.map(el => [el._message?.sender, el.classList.contains('outgoing')]));
  const bySender = Object.groupBy(sides, ([sender]) => sender);
  expect(bySender['Ciro Soares']?.length).toBeGreaterThan(0);
  expect(bySender['Ciro Soares'].every(([, out]) => out)).toBe(true);
  expect((bySender.DV || []).every(([, out]) => !out)).toBe(true);
  await expect(page.locator('.chat-header-name, .chat-header-info').first()).toContainText('Daniel Vorcaro');
});
