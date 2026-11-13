import { test, expect } from '@playwright/test';

// A note from whoever put the data together (msg.note): an ⓘ by the time,
// as the star, that opens the message's info with it — not a bubble, so it
// is nobody's message in the chat.
const NOTE = 'Ordem dentro do dia e horário exato não publicados; posição estimada pela narrativa da reportagem.';

async function openWithNote(page, note) {
  await page.route(/\/data\/ciro-soares\/2024-04-14\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.messages.find(m => m.id === 2).note = note;
    await route.fulfill({ response, json: data });
  });
  await page.goto('/#/chat/ciro-soares/msg/2');
  await page.locator('.chat-msg-row[data-id="2"]').waitFor();
}

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('a long note')) await openWithNote(page, NOTE);
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

test('a long note: the info scrolls as one, down to the last field', async ({ page }) => {
  await openWithNote(page, Array(40).fill(NOTE).join('\n\n'));
  await page.locator('.chat-msg-row[data-id="2"] .chat-msg-note-flag').click();
  const body = page.locator('.msg-info-drawer .msg-info-body');
  await expect(body).toBeVisible();
  const { scrollHeight, clientHeight } = await body.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
  expect(scrollHeight).toBeGreaterThan(clientHeight);
  await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.locator('.msg-info-fields .msg-info-field').last()).toBeInViewport();
  // The header stays put.
  await expect(page.locator('.msg-info-drawer-title')).toBeInViewport();
});

test('from the keyboard: the ⓘ takes the focus into the info, Esc brings it back', async ({ page }) => {
  const flag = page.locator('.chat-msg-row[data-id="2"] .chat-msg-note-flag');
  await flag.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.msg-info-drawer-close')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Info da mensagem' })).toContainText(NOTE);
  await page.keyboard.press('Escape');
  await expect(page.locator('.msg-info-drawer')).toHaveCount(0);
  await expect(flag).toBeFocused();
});

test('marked important, the star comes before the ⓘ, then the time', async ({ page }) => {
  await page.locator('.chat-msg-row[data-id="2"] .chat-msg-bubble').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Marcar como importante' }).click();
  const order = await page.locator('.chat-msg-row[data-id="2"] .chat-msg-meta').evaluate(meta =>
    [...meta.children].map(el => el.className).filter(c => /chat-msg-(star|note-flag|time)/.test(c)));
  expect(order).toEqual(['chat-msg-star', 'chat-msg-note-flag', 'chat-msg-time']);
});
