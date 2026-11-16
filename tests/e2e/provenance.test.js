import { test, expect } from '@playwright/test';

// The seal: in the header always, as the yellow notice atop the oldest day,
// and as a "Fonte" row in the contact drawer.
test.describe('Provenance seal', () => {
  test('a police-report conversation says where it came from', async ({ page }) => {
    // A chat with only the report's messages (Geraldo's now has the fork's too).
    await page.goto('/#/chat/motorista-brasilia-sidney');
    await expect(page.locator('.chat-header-info')).toHaveText(/8 mensagens · Verificado/);

    // One day only, so the oldest day — and its notice — is on screen.
    const notice = page.locator('.chat-seal-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Fonte: IPJ-A nº 3298613/2026 (Polícia Federal) · Verificado');

    // Verified messages in a verified conversation carry no glyph.
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
    await expect(page.locator('.chat-msg-seal')).toHaveCount(0);

    await notice.click();
    const source = page.locator('.contact-info-source');
    await expect(source).toBeVisible();
    await expect(source).toBeInViewport();
    // Tapping the notice again keeps the drawer open: it shows the source, it does not toggle.
    await notice.click({ force: true });
    await expect(source).toBeVisible();
    await expect(source).toContainText('Polícia Federal · 27/08/2026 · Verificado');
    await expect(source.locator('a', { hasText: 'Abrir documento' })).toHaveAttribute('href', /IPJ-A-3298613-2026\.pdf$/);
    await expect(source.locator('.contact-info-source-hash')).toContainText('SHA-256 23cfdfa4');
  });

  test('a report chat with messages added from other sources counts them and marks each one', async ({ page }) => {
    // Geraldo: 12 messages of the report and 24 the fork added, from prints with no outlet.
    await page.goto('/#/chat/geraldo-brazil-journal');
    await expect(page.locator('.chat-header-info')).toHaveText(/36 mensagens · Verificado/);
    const notice = page.locator('.chat-seal-notice');
    await expect(notice).toContainText('Fonte: IPJ-A nº 3298613/2026 (Polícia Federal) · Verificado · 24 mensagens marcadas como Não verificado');
    // The added ones carry the glyph; the report's do not. All 36 are on
    // screen (three days, loaded at once).
    await expect(page.locator('.chat-msg-row')).toHaveCount(36);
    await expect(page.locator('.chat-msg-seal')).toHaveCount(24);
  });

  test('the leak is labelled press, without marking every bubble', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item[data-id="martha-graeff"]').click();
    await expect(page.locator('.chat-header-info')).toHaveText(/65\.772 mensagens · Imprensa/);
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.chat-msg-seal')).toHaveCount(0);
  });
});
