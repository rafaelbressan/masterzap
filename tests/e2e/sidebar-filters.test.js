import { test, expect } from '@playwright/test';

const list = '.conversation-list';
const items = '.conversation-item';
const visibleItems = '.conversation-item:visible';

/**
 * Return to the conversation list.
 *
 * On mobile the sidebar is replaced by the open chat, so the list is only
 * reachable through the back button; on desktop both are on screen already.
 */
async function backToList(page) {
  if (page.viewportSize().width <= 600) {
    // Wait for the chat to actually mount before reaching for its back button —
    // probing visibility too early silently skips the tap.
    await expect(page.locator('.chat-header-back')).toBeVisible();
    await page.locator('.chat-header-back').click();
  }
  await expect(page.locator('.sidebar-tags')).toBeVisible();
  await expect(page.locator(items).first()).toBeVisible();
}

test.describe('Filter tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(items).first()).toBeVisible();
  });

  test('opens on "Todas"', async ({ page }) => {
    await expect(page.locator('.sidebar-tag.active')).toHaveText('Todas');
  });

  test('"Todas" shows every conversation', async ({ page }) => {
    const total = await page.locator(items).count();
    expect(await page.locator(visibleItems).count()).toBe(total);
  });

  test('"Favoritas" shows only the two leaks', async ({ page }) => {
    await page.locator('[data-filter="favoritas"]').click();

    await expect(page.locator(visibleItems)).toHaveCount(2);
    await expect(page.locator(`${items}[data-id="alexandre-de-moraes"]`)).toBeVisible();
    await expect(page.locator(`${items}[data-id="martha-graeff"]`)).toBeVisible();
    await expect(page.locator(`${items}[data-id="ciro-soares"]`)).toBeHidden();
  });

  test('switching tabs moves the active state', async ({ page }) => {
    await page.locator('[data-filter="favoritas"]').click();
    await expect(page.locator('.sidebar-tag.active')).toHaveText('Favoritas');

    await page.locator('[data-filter="todas"]').click();
    await expect(page.locator('.sidebar-tag.active')).toHaveText('Todas');
  });

  test('"Grupos" is a filter like the others, and no tab is disabled', async ({ page }) => {
    await expect(page.locator('.sidebar-tag.disabled')).toHaveCount(0);
    await page.locator('.sidebar-tag[data-filter="grupos"]').click();
    await expect(page.locator('.sidebar-tag.active')).toHaveText('Grupos');
    await expect(page.locator(`${items}:visible`)).toHaveCount(4);
  });
});

test.describe('Unread state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(items).first()).toBeVisible();
  });

  test('counts every conversation before anything is opened', async ({ page }) => {
    const shown = await page.locator('.sidebar-tag-count').textContent();
    expect(Number(shown.replace(/\D/g, ''))).toBeGreaterThan(0);

    await page.locator('[data-filter="nao-lidas"]').click();
    const total = await page.locator(items).count();
    expect(await page.locator(visibleItems).count()).toBe(total);
  });

  test('opening a conversation clears its badge and lowers the tally', async ({ page }) => {
    const tally = page.locator('.sidebar-tag-count');
    const before = Number((await tally.textContent()).replace(/\D/g, ''));

    const row = page.locator(`${items}[data-id="ciro-soares"]`);
    const badge = Number(await row.locator('.conversation-item-unread').textContent());
    await row.click();
    await backToList(page);

    // The sidebar repaints in place — no reload needed for the count to move.
    await expect(row.locator('.conversation-item-unread')).toBeHidden();
    await expect
      .poll(async () => Number((await tally.textContent()).replace(/\D/g, '')))
      .toBe(before - badge);
  });

  test('a read conversation drops out of "Não lidas"', async ({ page }) => {
    const total = await page.locator(items).count();
    await page.locator(`${items}[data-id="ciro-soares"]`).click();
    await backToList(page);
    await page.locator('[data-filter="nao-lidas"]').click();

    await expect(page.locator(visibleItems)).toHaveCount(total - 1);
    await expect(page.locator(`${items}[data-id="ciro-soares"]`)).toBeHidden();
  });

  test('the read state survives a reload', async ({ page }) => {
    await page.locator(`${items}[data-id="ciro-soares"]`).click();

    // A real reload, not a hash change — the browser treats dropping the hash
    // as a same-document navigation and would not reload at all.
    await page.reload();
    await backToList(page);

    await expect(page.locator(`${items}[data-id="ciro-soares"] .conversation-item-unread`)).toBeHidden();
  });
});

test.describe('Conversation list scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(items).first()).toBeVisible();
  });

  // The list is a flex child; without min-height:0 it grows to its content
  // instead of scrolling, and since body is overflow:hidden nothing scrolls at
  // all. That is invisible on desktop and fatal on a phone.
  test('the list has its own scroll', async ({ page }) => {
    const box = await page.locator(list).evaluate(el => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
  });

  test('scrolling the list actually moves it', async ({ page }) => {
    const moved = await page.locator(list).evaluate(el => {
      el.scrollTop = 400;
      return el.scrollTop;
    });

    expect(moved).toBeGreaterThan(0);
  });

  test('the page body itself never scrolls', async ({ page }) => {
    const bodyOverflow = await page.evaluate(
      () => getComputedStyle(document.body).overflow
    );
    expect(bodyOverflow).toBe('hidden');
  });
});

test.describe('Hover is pointer-gated', () => {
  // On touch, :hover latches onto the last element the finger passed over and
  // never clears, so dragging through the list leaves a trail of highlighted
  // rows. The rule has to live behind a hover-capable media query.
  test('the row hover rule sits inside a (hover: hover) query', async ({ page }) => {
    await page.goto('/');

    const guarded = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules) {
          if (rule.type !== CSSRule.MEDIA_RULE) continue;
          if (!rule.conditionText.includes('hover')) continue;
          for (const inner of rule.cssRules) {
            if (inner.selectorText === '.conversation-item:hover') return true;
          }
        }
      }
      return false;
    });

    expect(guarded).toBe(true);
  });

  test('no bare .conversation-item:hover rule survives', async ({ page }) => {
    await page.goto('/');

    const bare = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules) {
          if (rule.type === CSSRule.STYLE_RULE
              && rule.selectorText === '.conversation-item:hover') return true;
        }
      }
      return false;
    });

    expect(bare).toBe(false);
  });
});
