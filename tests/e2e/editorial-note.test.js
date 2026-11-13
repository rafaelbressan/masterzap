import { test, expect } from '@playwright/test';

// A note from whoever put the data together (msg.note): an ⓘ by the time,
// as the star, that opens the message's info with it — not a bubble, so it
// is nobody's message in the chat.
const NOTE = 'Ordem dentro do dia e horário exato não publicados; posição estimada pela narrativa da reportagem.';

test.beforeEach(async ({ page }) => {
  await page.route(/\/data\/ciro-soares\/2024-04-14\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.messages.find(m => m.id === 2).note = NOTE;
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#/chat/ciro-soares/msg/2');
  await page.locator('.chat-msg-row[data-id="2"]').waitFor();
});

test('a message with a note shows the ⓘ by its time, and only it', async ({ page }) => {
  const flag = page.locator('.chat-msg-row[data-id="2"] .chat-msg-meta .chat-msg-note-flag');
  await expect(flag).toBeVisible();
  await expect(flag).toHaveAccessibleName('Ver nota do MasterWhats sobre esta mensagem');
  await expect(page.locator('.chat-msg-note-flag')).toHaveCount(1);
  // Not a bubble of its own: the note text is nowhere in the chat.
  await expect(page.locator('.chat-messages')).not.toContainText(NOTE);
});

test('tapping the ⓘ opens the message info with the note', async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="2"] .chat-msg-note-flag').click();
  const info = page.locator('.msg-info-drawer');
  await expect(info).toBeVisible();
  await expect(info.locator('.msg-info-note')).toContainText('Nota do MasterWhats');
  await expect(info.locator('.msg-info-note')).toContainText(NOTE);
  // Ciro's message, not the owner's: not in the green of a sent one.
  await expect(info.locator('.msg-info-preview')).toHaveClass(/incoming/);
});

test("the message menu's info shows the note too", async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="2"] .chat-msg-bubble').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Info da mensagem' }).click();
  await expect(page.locator('.msg-info-drawer .msg-info-note')).toContainText(NOTE);
});
