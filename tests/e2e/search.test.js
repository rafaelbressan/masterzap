import { test, expect } from '@playwright/test';

test.describe('Search — Batch 7', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('search input is visible in sidebar', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await expect(input).toBeVisible();
  });

  test('typing in search shows results panel', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    // Wait for debounce + index load
    await page.locator('.search-results').waitFor({ timeout: 10000 });
    await expect(page.locator('.search-results')).toBeVisible();
  });

  test('search results contain matching messages', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const items = page.locator('.search-result-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search results show sender and date', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const sender = page.locator('.search-result-sender').first();
    await expect(sender).toBeVisible();

    const date = page.locator('.search-result-date').first();
    await expect(date).toBeVisible();
  });

  test('search results highlight the matching text', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    const highlight = page.locator('.search-highlight').first();
    await expect(highlight).toBeVisible();
    const text = await highlight.textContent();
    expect(text.toLowerCase()).toContain('bom dia');
  });

  test('conversation list is hidden during search', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    const convList = page.locator('.conversation-list');
    await expect(convList).not.toBeVisible();
  });

  test('clearing search restores conversation list', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    // Clear the input
    await input.fill('');
    const convList = page.locator('.conversation-list');
    await expect(convList).toBeVisible();
  });

  test('pressing Escape clears search', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    await input.press('Escape');
    const convList = page.locator('.conversation-list');
    await expect(convList).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('no results shows empty message', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('xyzzyxyzzy12345');
    await page.locator('.search-results').waitFor({ timeout: 10000 });

    const empty = page.locator('.search-empty');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveText('Nenhuma conversa, contato ou mensagem encontrada');
  });

  test('search is accent-insensitive', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    // "voce" finds "você", and the mark covers the accented word.
    await input.fill('voce');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });
    await expect(page.locator('.search-result-content .search-highlight').first()).toHaveText(/voc[eê]/i);
  });

  test('clicking a search result opens the conversation', async ({ page }) => {
    const input = page.locator('.sidebar-search-input');
    await input.fill('Bom dia');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });

    await page.locator('.search-result-item').first().click();

    // Should navigate to the chat view
    const chatView = page.locator('.chat-view');
    await expect(chatView).toBeVisible({ timeout: 10000 });
  });
});

// Across every conversation, as WhatsApp: the chats whose name matches, then
// the messages of all chats, newest first, more as the reader scrolls.
test.describe('Search across conversations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.sidebar-search-input').waitFor();
  });

  test('a name shows its chats first, then the messages that mention it', async ({ page }) => {
    await page.locator('.sidebar-search-input').fill('moraes');
    const headings = page.locator('.search-results-heading');
    await expect(headings).toHaveText(['Conversas', 'Mensagens'], { timeout: 10000 });
    const chats = page.locator('.search-results .conversation-item');
    await expect(chats.first()).toBeVisible();
    await expect(chats.locator('.search-highlight').first()).toHaveText(/moraes/i);
    await expect(page.locator('.search-result-item').first()).toBeVisible();
  });

  test('messages come from every conversation, newest first', async ({ page }) => {
    await page.locator('.sidebar-search-input').fill('moraes');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });
    const contacts = await page.locator('.search-result-sender').allTextContents();
    expect(new Set(contacts).size).toBeGreaterThan(1);
    const dates = await page.locator('.search-result-date').allTextContents();
    const iso = dates.map(d => d.split('/').reverse().join('-'));
    expect(iso).toEqual([...iso].sort().reverse());
  });

  test('no count and no cap: more messages come as the list scrolls', async ({ page }) => {
    await page.locator('.sidebar-search-input').fill('amor');
    const rows = page.locator('.search-result-item');
    await rows.first().waitFor({ timeout: 10000 });
    const first = await rows.count();
    await page.locator('.search-results').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => rows.count()).toBeGreaterThan(first);
    await expect(page.locator('.search-results')).not.toContainText(/resultados? encontrados?|Exibindo/);
  });

  test("a message of another conversation opens that conversation at it", async ({ page }, info) => {
    await page.goto('/#/chat/alexandre-de-moraes');
    await page.locator('.chat-msg-bubble').first().waitFor();
    // On a phone the open chat hides the list: back to it first.
    if (info.project.name === 'mobile') await page.goBack();
    await page.locator('.sidebar-search-input').fill('amor');
    const row = page.locator('.search-result-item').filter({ has: page.locator('.search-result-sender', { hasText: 'Martha Graeff' }) }).first();
    await row.waitFor({ timeout: 10000 });
    const text = (await row.locator('.search-result-content').textContent()).replace(/^…/, '').slice(0, 20);
    await row.click();
    await expect(page.locator('.chat-header-name').first()).toHaveText('Martha Graeff');
    await expect(page).toHaveURL(/#\/chat\/martha-graeff\/msg\/\d+/);
    // The very message clicked, flashed and on screen.
    const target = page.locator('.msg-highlight');
    await expect(target).toBeInViewport();
    await expect(target).toContainText(text);
  });

  test('back on a phone returns to the results, as they were', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile');
    const input = page.locator('.sidebar-search-input');
    await input.fill('amor');
    const results = page.locator('.search-results');
    await page.locator('.search-result-item').nth(12).waitFor({ timeout: 10000 });
    const row = page.locator('.search-result-item').nth(12);
    await row.scrollIntoViewIfNeeded();
    const scrolled = await results.evaluate(el => el.scrollTop);
    expect(scrolled).toBeGreaterThan(0);
    await row.click();
    await page.locator('.chat-view').waitFor();
    await page.goBack();
    await expect(results).toBeVisible();
    await expect(input).toHaveValue('amor');
    expect(await results.evaluate(el => el.scrollTop)).toBe(scrolled);
  });

  // The tabs filter the list, not the search: a chat already opened (so not
  // "unread") still shows when searched for, with its badge as in the list.
  test('the list tabs do not hide search results', async ({ page }, info) => {
    await page.goto('/#/chat/vivi-moraes');
    await page.locator('.chat-msg-bubble').first().waitFor();
    if (info.project.name === 'mobile') await page.goBack();
    await page.locator('.sidebar-tag[data-filter="nao-lidas"]').click();
    await page.locator('.sidebar-search-input').fill('vivi');
    const row = page.locator('.search-results .conversation-item[data-id="vivi-moraes"]');
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('.conversation-item-unread')).toBeHidden();
  });

  // "Pesquisar nas favoritas" searches the favorites only.
  test('on the Favoritas tab the search covers the favorites only', async ({ page }) => {
    await page.locator('.sidebar-tag[data-filter="favoritas"]').click();
    await expect(page.locator('.sidebar-search-input')).toHaveAttribute('placeholder', 'Pesquisar nas favoritas');
    // "moraes" names Vivi Moraes too, and is in Ana Matos's messages: neither
    // is a favorite.
    await page.locator('.sidebar-search-input').fill('moraes');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });
    await expect(page.locator('.search-results .conversation-item')).toHaveCount(1);
    await expect(page.locator('.search-results .conversation-item[data-id="alexandre-de-moraes"]')).toBeVisible();
    const contacts = new Set(await page.locator('.search-result-sender').allTextContents());
    for (const c of contacts) expect(['Martha Graeff', 'Alexandre de Moraes BRASILIA']).toContain(c);
    // Back to "Todas": the same words cover every chat again.
    await page.locator('.sidebar-tag[data-filter="todas"]').click();
    await page.locator('.sidebar-search-input').fill('moraes');
    await expect(page.locator('.search-results .conversation-item[data-id="vivi-moraes"]')).toBeVisible();
  });

  test("DV's own messages carry the double tick", async ({ page }) => {
    await page.locator('.sidebar-search-input').fill('amor');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });
    await expect(page.locator('.search-result-ticks').first()).toBeVisible();
  });

  test('the calls screen hides the search results', async ({ page }, info) => {
    await page.locator('.sidebar-search-input').fill('amor');
    await page.locator('.search-result-item').first().waitFor({ timeout: 10000 });
    if (info.project.name === 'mobile') await page.locator('.sidebar-bottom-tab[data-tab="calls"]').click();
    else await page.getByRole('button', { name: 'Chamadas' }).first().click();
    await expect(page.locator('.search-results')).toBeHidden();
  });
});
