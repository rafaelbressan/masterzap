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
    const first = page.locator('.calls-item').first();
    await expect(first.locator('.calls-item-name')).toContainText('Martha Graeff');
    await expect(first.locator('.calls-item-arrow')).toHaveAttribute('aria-label', /Chamada (feita|recebida)/);
    await expect(first.locator('.calls-item-meta')).toContainText('2025');
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
    for (const label of ['Teclado', 'Nova chamada']) {
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

test.describe('Finding a call', () => {
  test('the chips narrow the list; the search, always there, narrows it by name', async ({ page }) => {
    await openCalls(page);
    await expect(page.locator('.calls-search .sidebar-search-input')).toBeVisible();
    const total = await page.locator('.calls-item').count();
    await page.locator('.calls-panel .sidebar-tag[data-filter="perdida"]').click();
    const missed = await page.locator('.calls-item').count();
    expect(missed).toBeGreaterThan(0);
    expect(missed).toBeLessThan(total);
    // "Perdidas" holds both a call that came in unanswered (red) and one
    // Vorcaro made that nobody took ("Não atendida", not red).
    for (const meta of await page.locator('.calls-item-meta').allTextContents()) expect(meta).toMatch(/Perdida|Não atendida/);
    await expect(page.locator('.calls-recent')).toContainText('de');

    await page.locator('.calls-search .sidebar-search-input').fill('fabio');
    await expect(page.locator('.calls-item').first().locator('.calls-item-name')).toContainText('Fábio Faria');
    await page.locator('.calls-panel .sidebar-tag[data-filter="todas"]').click();
    expect(await page.locator('.calls-item').count()).toBeGreaterThanOrEqual(3);
  });

  test('the ⋮ opens the same menu the list has', async ({ page }) => {
    await openCalls(page);
    await page.locator('.calls-header-btn[aria-label="Menu"]').click();
    const menu = page.locator('.sidebar-dropdown-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.sidebar-dropdown-item', { hasText: 'Sobre o MasterWhats' })).toBeVisible();
    await expect(menu.locator('.sidebar-dropdown-item', { hasText: 'API/MCP' })).toBeVisible();
  });
});
