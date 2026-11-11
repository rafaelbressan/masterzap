import { test, expect } from '@playwright/test';

// "Mensagens importantes": the star on a message, as WhatsApp. Saved in the
// reader's browser only.
async function openChat(page) {
  await page.goto('/#/chat/alexandre-de-moraes');
  await page.locator('.chat-msg-bubble').first().waitFor();
  await page.waitForLoadState('networkidle');
}

/** The fourth bubble on screen, by its id: older days load above while the test runs. */
async function pick(page) {
  const id = await page.locator('.chat-msg-bubble').nth(3).evaluate(b => b.closest('.chat-msg-row').dataset.id);
  return { id, bubble: page.locator(`.chat-msg-row[data-id="${id}"] .chat-msg-bubble`) };
}

async function mark(page, bubble) {
  await bubble.click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Marcar como importante' }).click();
}

test('a message marked as important gets the star, and the menu offers to unmark it', async ({ page }) => {
  await openChat(page);
  const { bubble } = await pick(page);
  await mark(page, bubble);
  await expect(bubble.locator('.chat-msg-star')).toBeVisible();
  await bubble.click({ button: 'right' });
  await expect(page.locator('.context-menu-item', { hasText: 'Desmarcar como importante' })).toBeVisible();
  await page.locator('.context-menu-item', { hasText: 'Desmarcar como importante' }).click();
  await expect(bubble.locator('.chat-msg-star')).toHaveCount(0);
});

test('the list opens from the menu, opens the message, and keeps the mark after a reload', async ({ page }, info) => {
  await openChat(page);
  const { id, bubble } = await pick(page);
  await mark(page, bubble);

  await page.reload();
  await page.locator('.chat-msg-bubble').first().waitFor();
  await expect(page.locator(`.chat-msg-row[data-id="${id}"] .chat-msg-star`)).toBeVisible();

  if (info.project.name === 'mobile') await page.locator('.chat-back-btn, [aria-label="Voltar"]').first().click();
  await page.locator('.sidebar-menu-btn').click();
  await page.locator('.sidebar-dropdown-item', { hasText: 'Mensagens importantes' }).click();
  await expect(page).toHaveURL(/#\/importantes$/);
  const row = page.locator('.important-item');
  await expect(row).toHaveCount(1);
  await expect(row.locator('.search-result-sender')).toHaveText(/Alexandre de Moraes/);

  await row.click();
  await expect(page).toHaveURL(new RegExp(`#/chat/alexandre-de-moraes/msg/${id}$`));
  await expect(page.locator('.msg-highlight')).toBeInViewport();
});

test("the contact's info lists that chat's important messages", async ({ page }, info) => {
  await openChat(page);
  await mark(page, (await pick(page)).bubble);
  await page.locator('.chat-header-info, .chat-header-name').first().click();
  const item = page.locator('.contact-info-action-item', { hasText: 'Mensagens importantes' });
  await expect(item).toContainText('1');
  await item.click();
  await expect(page).toHaveURL(/#\/importantes\/alexandre-de-moraes$/);
  await expect(page.locator('.important-item')).toHaveCount(1);
  // Back returns to the chat it came from.
  await page.locator('.important-back').click();
  await expect(page).toHaveURL(/#\/chat\/alexandre-de-moraes$/);
  if (info.project.name === 'desktop') await expect(page.locator('.conversation-list')).toBeVisible();
});

test('nothing marked: the list says how to mark', async ({ page }) => {
  await page.goto('/#/importantes');
  await expect(page.locator('.important-empty')).toContainText('Nenhuma mensagem importante');
});

test.describe('beside an open chat (desktop)', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'the list beside a chat is a desktop layout'); });

  test('the back arrow closes the list and leaves the chat being read', async ({ page }) => {
    await openChat(page);
    const { id, bubble } = await pick(page);
    await mark(page, bubble);
    await page.goto('/#/');
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Mensagens importantes' }).click();
    await page.locator('.important-item').click();
    await expect(page).toHaveURL(new RegExp(`/msg/${id}$`));
    await expect(page.locator('.important-panel')).toBeVisible();
    await page.locator('.important-back').click();
    await expect(page.locator('.conversation-list')).toBeVisible();
    await expect(page.locator('.chat-view[data-conversation-id="alexandre-de-moraes"]')).toBeVisible();
    await expect(page).toHaveURL(/#\/chat\/alexandre-de-moraes$/);
  });

  test('unmarking in the list takes the star off the open bubble, and marking adds to the list', async ({ page }) => {
    await openChat(page);
    const { id, bubble } = await pick(page);
    await mark(page, bubble);
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Mensagens importantes' }).click();
    await expect(page.locator('.important-item')).toHaveCount(1);
    await page.locator('.important-unmark').click();
    await expect(page.locator(`.chat-msg-row[data-id="${id}"] .chat-msg-star`)).toHaveCount(0);
    await mark(page, bubble);
    await expect(page.locator('.important-item')).toHaveCount(1);
  });

  test("the browser's back from the list to the chat shows the conversation list", async ({ page }) => {
    await openChat(page);
    await page.locator('.sidebar-menu-btn').click();
    await page.locator('.sidebar-dropdown-item', { hasText: 'Mensagens importantes' }).click();
    await expect(page.locator('.important-panel')).toBeVisible();
    await page.goBack();
    await expect(page.locator('.conversation-list')).toBeVisible();
    await expect(page.locator('.important-panel')).toHaveCount(0);
  });
});

test('a system line cannot be marked, as on WhatsApp', async ({ page }) => {
  await page.goto('/#/chat/vivi-moraes/msg/3');
  const row = page.locator('.chat-msg-row.system[data-id="3"]');
  await row.waitFor();
  await row.locator('.chat-msg-system, .chat-msg-bubble').first().click({ button: 'right' });
  await expect(page.locator('.context-menu')).toBeVisible();
  await expect(page.locator('.context-menu-item', { hasText: 'importante' })).toHaveCount(0);
});
