import { test, expect } from '@playwright/test';

// The Calls screen is a record, not a phone: every call the material holds,
// newest first, and a tap goes to the message where that call is.

const openCalls = async (page) => {
  await page.goto('/#/calls');
  await expect(page.locator('.calls-panel')).toBeVisible();
  await expect(page.locator('.calls-item').first()).toBeVisible({ timeout: 20000 });
};

test.describe('Calls screen', () => {
  test('lists the calls, newest first, with who called whom', async ({ page }) => {
    await openCalls(page);
    expect(await page.locator('.calls-item').count()).toBeGreaterThan(500);
    // The newest call in the data, whoever it was with.
    const { newest, contact } = await page.evaluate(async () => {
      const [{ calls }, { conversations }] = await Promise.all(
        ['/data/calls.json', '/data/conversations.json'].map(u => fetch(u).then(r => r.json())));
      const c = conversations.find(x => x.id === calls[0].conversation_id);
      return { newest: calls[0], contact: c.contact };
    });
    const first = page.locator('.calls-item').first();
    await expect(first.locator('.calls-item-name')).toContainText(contact);
    await expect(first.locator('.calls-item-arrow')).toHaveAttribute('aria-label', /Chamada (feita|recebida)/);
    await expect(first.locator('.calls-item-meta')).toContainText(newest.date.slice(0, 4));
  });

  test('draws a missed incoming call in red', async ({ page }) => {
    await openCalls(page);
    const missed = page.locator('.calls-item.missed').first();
    await expect(missed).toBeAttached();
    await expect(missed.locator('.calls-item-meta')).toContainText('Perdida');
    const color = await missed.locator('.calls-item-name').evaluate(el => getComputedStyle(el).color);
    expect(color).toMatch(/^rgb\(229, 57, 53\)$/);
  });

  test('the buttons across the top are there and do nothing', async ({ page }) => {
    await openCalls(page);
    for (const label of ['Ligar', 'Agendar', 'Teclado', 'Favoritos', 'Pesquisar chamadas', 'Menu']) {
      await expect(page.locator(`.calls-panel button[aria-label="${label}"]`)).toBeDisabled();
    }
  });

  test('tapping a call opens the conversation at that call', async ({ page }) => {
    await openCalls(page);
    const row = page.locator('.calls-item[data-conversation="fabio-faria"][data-message="134"]');
    await row.scrollIntoViewIfNeeded();
    await row.locator('.calls-item-main').click();
    await expect(page).toHaveURL(/#\/chat\/fabio-faria\/msg\/134$/);
    await expect(page.locator('.chat-msg-row[data-id="134"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.chat-msg-row[data-id="134"] .chat-call-label')).toContainText('04:34');
  });

  test('the phone icon at the right does the same', async ({ page }) => {
    await openCalls(page);
    const row = page.locator('.calls-item[data-conversation="fabio-faria"][data-message="88"]');
    await row.scrollIntoViewIfNeeded();
    await row.locator('.calls-item-kind').click();
    await expect(page).toHaveURL(/#\/chat\/fabio-faria\/msg\/88$/);
    await expect(page.locator('.chat-msg-row[data-id="88"]')).toBeVisible({ timeout: 20000 });
  });

  test('folds consecutive calls with the same person on the same day', async ({ page }) => {
    await openCalls(page);
    await expect(page.locator('.calls-item-name', { hasText: /\(\d+\)$/ }).first()).toBeAttached();
  });
});

test.describe('Getting there', () => {
  test('from the Chamadas tab, and back to the list from Conversas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.conversation-item').first()).toBeVisible();
    const isMobile = page.viewportSize().width <= 600;
    if (isMobile) {
      await page.locator('.sidebar-bottom-tab[data-tab="calls"]').click();
    } else {
      await page.locator('.nav-rail button[aria-label="Chamadas"], button[aria-label="Chamadas"]').first().click();
    }
    await expect(page).toHaveURL(/#\/calls$/);
    await expect(page.locator('.calls-panel')).toBeVisible();
    await expect(page.locator('.conversation-list')).toBeHidden();

    if (isMobile) {
      await page.locator('.sidebar-bottom-tab[data-tab="chats"]').click();
    } else {
      await page.locator('button[aria-label="Conversas"]').first().click();
    }
    await expect(page.locator('.conversation-list')).toBeVisible();
    await expect(page.locator('.calls-panel')).toBeHidden();
  });
});
