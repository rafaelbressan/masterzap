import { test, expect } from '@playwright/test';

// Group chats, as WhatsApp draws them: the list's "Grupos" tab, the sender's
// name and photo over the first bubble of each run, the members in the
// header and in "Info do grupo".

test('the "Grupos" tab lists the groups, with the sender in the preview', async ({ page }) => {
  await page.goto('/');
  await page.locator('.sidebar-tag[data-filter="grupos"]').click();
  const items = page.locator('.conversation-list > .conversation-item:visible');
  await expect(items).toHaveCount(4);
  await expect(page.locator('.conversation-item[data-id="martha-graeff"]')).toBeHidden();
  await expect(page.locator('.conversation-item[data-id="g002-ciro-daniel-fabio-hugo"] .conversation-item-preview')).toHaveText('Ciro Nogueira: Figurinha');
});

test('a run from one person opens with their name and photo; the next bubbles of the run do not', async ({ page }) => {
  await page.goto('/#/chat/g001-macallan');
  await expect(page.locator('.chat-header-name')).toHaveText('Macallan');
  await expect(page.locator('.chat-header-info-count')).toHaveText('Fábio Faria, Lucas kallas USA, Você');
  // Fábio's two in a row (2, 3): the name and photo on the first only.
  const first = page.locator('.chat-msg-row[data-id="2"]');
  await expect(first.locator('.chat-msg-sender')).toHaveText('Fábio Faria');
  await expect(first.locator('.chat-msg-group-avatar')).toBeVisible();
  await expect(page.locator('.chat-msg-row[data-id="3"] .chat-msg-sender')).toHaveCount(0);
  await expect(page.locator('.chat-msg-row[data-id="3"] .chat-msg-group-avatar')).toHaveCount(0);
  // The first bubble of a run has its tail, the next ones do not.
  await expect(first.locator('.chat-msg-tail')).toBeVisible();
  await expect(page.locator('.chat-msg-row[data-id="3"] .chat-msg-tail')).toBeHidden();
  // The owner's are never named.
  await expect(page.locator('.chat-msg-row.outgoing .chat-msg-sender')).toHaveCount(0);
  // Bubbles of the run line up with the first, past the photo.
  const [a, b] = await Promise.all(['2', '3'].map(id => page.locator(`.chat-msg-row[data-id="${id}"] .chat-msg-bubble`).boundingBox()));
  expect(Math.abs(a.x - b.x)).toBeLessThan(1);
});

test('"Info do grupo" lists the members, the creator marked admin, a member with a chat here opening it', async ({ page }) => {
  await page.goto('/#/chat/g002-ciro-daniel-fabio-hugo');
  await page.locator('.chat-header-info-wrapper').click();
  const info = page.locator('.contact-info-drawer');
  await expect(info.locator('.contact-info-title')).toHaveText('Info do grupo');
  await expect(info.locator('.group-info-member-name')).toHaveText(['Você', 'Ciro Nogueira', 'Hugo Motta', 'Fábio Faria']);
  await expect(info.locator('.group-info-member', { hasText: 'Ciro Nogueira' })).toContainText('Admin do grupo');
  await expect(info.locator('.contact-info-action-item', { hasText: 'Mensagens temporárias' })).toContainText('90 dias');
  await info.locator('button.group-info-member', { hasText: 'Fábio Faria' }).click();
  await expect(page).toHaveURL(/#\/chat\/fabio-faria/);
});

test('on a phone the group and its info fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/chat/g004-master');
  await expect(page.locator('.chat-msg-sender')).toHaveText('Belline Santana');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.locator('.chat-header-info-wrapper').click();
  await expect(page.locator('.group-info-member')).toHaveCount(3);
  // His chat here knows him by a shorter name; he is still the same person.
  await page.locator('button.group-info-member', { hasText: 'Paulo Sérgio Neves de Souza' }).click();
  await expect(page).toHaveURL(/#\/chat\/diretor-paulo-sergio-bacen/);
});
