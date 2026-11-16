import { test, expect } from '@playwright/test';

// The seal: in the header always, as the yellow notice atop the oldest day,
// and as a "Fonte" row in the contact drawer.
test.describe('Provenance seal', () => {
  test('a police-report conversation says where it came from', async ({ page }) => {
    // A chat with only the report's messages (Geraldo's now has the fork's too).
    await page.goto('/#/chat/motorista-brasilia-sidney');
    await expect(page.locator('.chat-header-info-count')).toHaveText(/8 mensagens/);
    await expect(page.locator('.chat-header-info-seal')).toHaveAttribute('aria-label', 'Verificado');

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

  test('a chat most of whose messages came from elsewhere reads their seal, and marks the source\'s own', async ({ page }) => {
    // Geraldo: 12 messages of the report, 24 from prints with no outlet.
    await page.goto('/#/chat/geraldo-brazil-journal');
    await expect(page.locator('.chat-header-info-count')).toHaveText(/36 mensagens/);
    await expect(page.locator('.chat-header-info-seal')).toHaveAttribute('aria-label', 'Não verificado');
    // The notice leads with the majority and names the report's source.
    await expect(page.locator('.chat-seal-notice')).toContainText('Na maior parte, Não verificado · 12 mensagens marcadas como Verificado (IPJ-A nº 3298613/2026, Polícia Federal)');
    // All 36 on screen (three days, loaded at once): each bubble says its seal.
    await expect(page.locator('.chat-msg-row')).toHaveCount(36);
    await expect(page.locator('.chat-msg-seal')).toHaveCount(36);
  });

  test('a press majority stays plain; the report\'s own are marked', async ({ page }) => {
    // Ciro Soares: 60 press lines (O Globo, Noites Húngaras, Poder360), 51 of the report.
    await page.goto('/#/chat/ciro-soares/msg/52');
    await expect(page.locator('.chat-header-info-count')).toHaveText(/116 mensagens/);
    await expect(page.locator('.chat-header-info-seal')).toHaveAttribute('aria-label', 'Imprensa');
    await expect(page.locator('.chat-seal-notice')).toContainText('Na maior parte, Imprensa · 51 mensagens marcadas como Verificado (IPJ-A nº 3298613/2026, Polícia Federal)');
    // 31/01/2024: seven press lines, no glyph.
    const press = page.locator('[data-date="2024-01-31"]');
    await expect(press.locator('.chat-msg-row')).toHaveCount(7);
    await expect(press.locator('.chat-msg-seal')).toHaveCount(0);
    // 14/04/2024: the report's ten, each marked.
    await page.goto('/#/chat/ciro-soares/msg/1');
    const report = page.locator('[data-date="2024-04-14"]');
    await expect(report.locator('.chat-msg-row')).toHaveCount(10);
    await expect(report.locator('.chat-msg-seal')).toHaveCount(10);
  });

  test('the glyphs by the time sit on the centre of its digits', async ({ page }) => {
    // Geraldo msg 13: the seal and the note's ⓘ beside 15:59.
    await page.goto('/#/chat/geraldo-brazil-journal/msg/13');
    const meta = page.locator('.chat-msg-row[data-id="13"] .chat-msg-meta');
    await expect(meta.locator('svg')).toHaveCount(2);
    const offsets = await meta.evaluate((el) => {
      const time = el.querySelector('.chat-msg-time');
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      time.appendChild(probe);
      const baseline = probe.getBoundingClientRect().top;
      probe.remove();
      const cs = getComputedStyle(time);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
      const digits = baseline - ctx.measureText('0123456789').actualBoundingBoxAscent / 2;
      return [...el.querySelectorAll('svg')].map((svg) => {
        const r = svg.getBoundingClientRect();
        return r.top + r.height / 2 - digits;
      });
    });
    for (const off of offsets) expect(Math.abs(off)).toBeLessThan(0.6);
  });

  test('the leak is labelled press, without marking every bubble', async ({ page }) => {
    await page.goto('/');
    await page.locator('.conversation-item[data-id="martha-graeff"]').click();
    await expect(page.locator('.chat-header-info-count')).toHaveText(/65\.772 mensagens/);
    await expect(page.locator('.chat-header-info-seal')).toHaveAttribute('aria-label', 'Imprensa');
    await expect(page.locator('.chat-msg-bubble').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.chat-msg-seal')).toHaveCount(0);
  });
});
