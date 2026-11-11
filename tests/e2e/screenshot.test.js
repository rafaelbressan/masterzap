import { test, expect } from '@playwright/test';
import { ATTRIBUTION_BAR_HEIGHT } from '../../src/lib/screenshot.js';

// The capture itself only exists in a real browser: the visible DOM is copied
// and painted by the browser into a canvas (src/lib/dom-snapshot.js). The delivery chain is unit-tested; what is
// checked here is that the button is wired, the picture comes out, and it
// frames the chat rather than the whole page.

const openChat = async (page) => {
  await page.goto('/#/chat/alexandre-de-moraes');
  await expect(page.locator('.chat-view')).toBeVisible();
  await expect(page.locator('.chat-msg-bubble').first()).toBeVisible();
};

const openMenu = (page) => page.locator('.chat-header button[aria-label="Menu"]').click();

/** Grab the PNG the app produces, whichever way it ends up delivering it. */
async function captureProducedImage(page) {
  await page.evaluate(() => {
    window.__png = null;
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const reader = new FileReader();
      reader.onload = () => { window.__png = reader.result; };
      reader.readAsDataURL(blob);
      return original(blob);
    };
    // Keep the download from actually navigating in the test browser.
    HTMLAnchorElement.prototype.click = function () {};
  });

  await openMenu(page);
  await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();

  await expect.poll(() => page.evaluate(() => window.__png), { timeout: 20000 })
    .not.toBeNull();
  return page.evaluate(() => window.__png);
}

test.describe('Chat screenshot', () => {
  test.beforeEach(async ({ page }) => { await openChat(page); });

  test('the menu offers it', async ({ page }) => {
    await openMenu(page);

    const item = page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' });
    await expect(item).toBeVisible();
    await expect(item).not.toHaveClass(/disabled/);
  });

  test('the menu closes when it is chosen', async ({ page }) => {
    await openMenu(page);
    await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();

    await expect(page.locator('.chat-dropdown-menu')).toBeHidden();
  });

  test('it produces a PNG', async ({ page }) => {
    const dataUrl = await captureProducedImage(page);

    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(5000);
  });

  test('the image frames the chat, not the sidebar', async ({ page }) => {
    const dataUrl = await captureProducedImage(page);

    const size = await page.evaluate(src => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = src;
    }), dataUrl);

    const area = await page.locator('.main-area').boundingBox();
    const ratio = size.width / size.height;
    // The bar with the site's address sits under the chat.
    const expected = area.width / (area.height + ATTRIBUTION_BAR_HEIGHT);

    // Rendered at devicePixelRatio, so compare shape rather than pixel counts.
    expect(Math.abs(ratio - expected)).toBeLessThan(0.05);

    // On desktop the sidebar sits outside the frame; the capture must be
    // narrower than the window.
    if (page.viewportSize().width > 600) {
      const sidebar = await page.locator('.sidebar').boundingBox();
      expect(area.width).toBeLessThan(page.viewportSize().width - sidebar.width + 1);
    }
  });

  test('it captures only what is on screen, not the whole scroll', async ({ page }) => {
    const dataUrl = await captureProducedImage(page);

    const height = await page.evaluate(src => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img.naturalHeight);
      img.src = src;
    }), dataUrl);

    const scrollHeight = await page.locator('.chat-messages')
      .evaluate(el => el.scrollHeight);
    const dpr = await page.evaluate(() => Math.min(window.devicePixelRatio || 1, 2));

    expect(height / dpr - ATTRIBUTION_BAR_HEIGHT).toBeLessThan(scrollHeight);
  });

  // A print travels further than a link; the bar is the only thing on it that
  // says where the conversation lives.
  test('carries the site address in a bar at the bottom', async ({ page }) => {
    const dataUrl = await captureProducedImage(page);
    const dpr = await page.evaluate(() => Math.min(window.devicePixelRatio || 1, 2));

    const rows = await page.evaluate(([src, barCss, scale]) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const bar = Math.round(barCss * scale);
        const mean = (y0, y1) => {
          const { data } = ctx.getImageData(0, y0, c.width, y1 - y0);
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
          return sum / (data.length / 4);
        };
        resolve({
          bar: mean(c.height - bar + 2, c.height - 2),
          chatAbove: mean(c.height - bar - 40, c.height - bar - 2),
        });
      };
      img.src = src;
    }), [dataUrl, ATTRIBUTION_BAR_HEIGHT, dpr]);

    // Dark bar under a light chat.
    expect(rows.bar).toBeLessThan(70);
    expect(rows.chatAbove).toBeGreaterThan(rows.bar + 60);
  });

  test('confirms with a toast when it lands on the clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only here');
    // localhost is a secure context, so the clipboard path is the live one.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await openMenu(page);
    await page.locator('.chat-dropdown-item', { hasText: 'Compartilhar print' }).click();

    await expect(page.locator('.search-toast')).toContainText(/copiada|salva/, { timeout: 20000 });
  });
});

// The picture is the page's DOM redrawn with the page's own CSS. Asking the
// network for the stylesheets a second time (as html2canvas's clone did) can
// fail, and then the capture comes out as raw HTML — serif text, no bubbles,
// no colours — with nothing reporting a failure. The rules are already parsed
// and in memory; the picture must not depend on the network a second time.
test.describe('Chat screenshot without the network', () => {
  /** Fraction of the image within reach of a colour, 0..1. */
  const shareOfColour = (page, dataUrl, rgb) => page.evaluate(([src, want]) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const { data } = canvas.getContext('2d')
          .getImageData(0, 0, canvas.width, canvas.height);
        let hits = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (Math.abs(data[i] - want[0]) < 12
            && Math.abs(data[i + 1] - want[1]) < 12
            && Math.abs(data[i + 2] - want[2]) < 12) hits++;
        }
        resolve(hits / (data.length / 4));
      };
      img.src = src;
    }), [dataUrl, rgb]);

  const OUTGOING_BUBBLE = [0xd9, 0xfd, 0xd3];

  test('keeps the styling when the stylesheets cannot be fetched again', async ({ page }) => {
    await openChat(page);
    // Everything the page needs is already parsed and on screen. From here on,
    // a stylesheet request can only be the clone asking for it a second time.
    await page.route('**/*.css', route => route.abort());

    const dataUrl = await captureProducedImage(page);

    expect(await shareOfColour(page, dataUrl, OUTGOING_BUBBLE)).toBeGreaterThan(0.02);
  });
});

// The print is the screen: same messages, same place, mid-scroll included.
// Only what is visible is copied, and each scrolled list is cut down to what
// is on screen; a slip in that shows up as a picture shifted or empty.
test('the print matches what is on screen, scrolled to the middle', async ({ page }) => {
  await page.goto('/#/chat/martha-graeff');
  await page.locator('.chat-msg-bubble').first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.locator('.chat-messages').evaluate((el) => { el.scrollTop -= 700; });
  await page.waitForLoadState('networkidle');
  // The floating day badge shows only while scrolling; let it fade.
  await page.waitForTimeout(1500);
  const screen = `data:image/png;base64,${(await page.locator('.main-area').screenshot()).toString('base64')}`;

  const print = await captureProducedImage(page);

  // Mean difference per channel over the chat (the print's bar left out),
  // 0..255, compared at the print's size: a phone's screen has more pixels
  // than the print, which caps the ratio at 2.
  const diff = await page.evaluate(async ([a, b, barCss]) => {
    const load = (src) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const cssWidth = ia.naturalWidth / devicePixelRatio;
    const scale = ib.naturalWidth / cssWidth;
    const w = ib.naturalWidth;
    const h = ib.naturalHeight - Math.round(barCss * scale);
    if (Math.abs(ia.naturalHeight / devicePixelRatio * scale - h) > 1) return { size: [ia.naturalWidth, ia.naturalHeight, ib.naturalWidth, ib.naturalHeight] };
    const pixels = (img) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      // The screen resampled to the print's size; the print as it is, its bar
      // falling outside the canvas.
      if (img === ia) ctx.drawImage(img, 0, 0, w, h);
      else ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const pa = pixels(ia);
    const pb = pixels(ib);
    let sum = 0;
    for (let i = 0; i < pa.length; i += 4) {
      sum += Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
    }
    return { mean: sum / (w * h * 3) };
  }, [screen, print, ATTRIBUTION_BAR_HEIGHT]);

  expect(diff.size).toBeUndefined();
  expect(diff.mean).toBeLessThan(3);
});
