/**
 * Capture the open chat as an image and hand it to the platform.
 *
 * Browsers have no screenshot API without a permission prompt, so the picture
 * is redrawn from the DOM (dom-snapshot.js) rather than grabbed from the screen.
 * What you get is what is on screen right now: the main area is viewport-sized,
 * and the scrolled message list is clipped by its own box.
 *
 * ## Why this is not a straight line
 *
 * `navigator.share` and `navigator.clipboard.write` both need *transient user
 * activation* — they must be reached while the tap that started everything is
 * still "live", a window of a few seconds. Redrawing the DOM takes long enough
 * on a phone to spend it, so the obvious shape
 *
 *     await capture(); await navigator.share(...)
 *
 * fails with NotAllowedError, silently falls through, and lands on a download.
 *
 * Two different answers, because the two APIs differ:
 *
 *   - The clipboard accepts a **Promise** inside ClipboardItem. `write()` is
 *     called immediately, while the activation is fresh, and the browser waits
 *     on the capture itself.
 *   - Sharing takes no promise. The capture is reused instead: when the share
 *     is refused for a spent activation, the image is kept and the next tap
 *     shares it straight away.
 *
 * Both APIs also require a secure context. Served over plain http neither
 * exists, and every capture falls through to a download.
 */

import { SITE_HOST } from '../config/site.js';
import { snapshotElement, preloadSnapshot } from './dom-snapshot.js';

/**
 * Fetch what the capture draws with — stylesheets, wallpaper, web font — ahead
 * of the tap, so the tap only has to draw. Network only: drawing ahead would
 * hold up whichever item of the menu is tapped next.
 */
export function preloadScreenshot() {
  preloadSnapshot();
}

/** True when the browser exposes the APIs that need https. */
export function hasSecureContext() {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

/** The eight-byte PNG signature — enough to look like a real file. */
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Whether this platform can share image files at all.
 *
 * The probe carries actual bytes. An empty File is the obvious thing to reach
 * for and it is wrong: some implementations validate the payload and answer
 * "no" for a zero-byte file, which reads as "this device cannot share images"
 * when it can.
 *
 * Answered before the capture so the decision stays out of the tap's window.
 */
export function canShareFiles() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const probe = new File([PNG_SIGNATURE], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Hand a blob to the native share sheet.
 *
 * Meant to be called straight from a click, so the activation is fresh and the
 * image is already in hand — no probing, no capture, nothing between the tap
 * and the call. Whether the platform accepts it is then the platform's answer,
 * not a guess made earlier from a probe.
 *
 * @returns {Promise<'shared'|'cancelled'|'unsupported'>}
 */
export async function shareImageFile(blob, filename) {
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported';
  try {
    await navigator.share({
      files: [new File([blob], filename, { type: 'image/png' })],
    });
    return 'shared';
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/**
 * A one-line account of what this browser actually offers.
 *
 * There is no console on a phone, so when the delivery does not go the way it
 * should this is the only way to find out which capability is missing rather
 * than guessing at it.
 *
 *   sec  — secure context (https or localhost); without it none of the rest exists
 *   shr  — navigator.share
 *   csf  — navigator.canShare accepts a png file
 *   clip — navigator.clipboard.write
 *   ci   — the ClipboardItem constructor
 */
export function capabilityReport() {
  const yes = (v) => (v ? '1' : '0');
  return [
    `sec=${yes(typeof window !== 'undefined' && window.isSecureContext)}`,
    `shr=${yes(typeof navigator !== 'undefined' && navigator.share)}`,
    `csf=${yes(canShareFiles())}`,
    `clip=${yes(typeof navigator !== 'undefined' && navigator.clipboard?.write)}`,
    `ci=${yes(typeof ClipboardItem !== 'undefined')}`,
  ].join(' ');
}

function canUseClipboard() {
  return typeof navigator !== 'undefined'
    && !!navigator.clipboard?.write
    && typeof ClipboardItem !== 'undefined';
}

/** A refusal that is really "your tap expired", not "you may not do this". */
function isSpentActivation(err) {
  return err?.name === 'NotAllowedError' || err?.name === 'InvalidStateError';
}

/** Height, in CSS pixels, of the bar with the site's address under every print. */
export const ATTRIBUTION_BAR_HEIGHT = 44;
const ATTRIBUTION_URL = SITE_HOST;
const ATTRIBUTION_NAME = 'MasterWhats';
const ATTRIBUTION_LOGO = '/assets/masterzap-logo.png';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Add a bar under the picture saying where it came from — the way a
 * screenshot shared from Reddit carries "Posted in r/…". A print travels
 * further than a link does, and this is the only thing on it that says where
 * the rest of the conversation is.
 *
 * @param {HTMLCanvasElement} canvas - the rendered chat
 * @param {number} scale - device pixels per CSS pixel the canvas was drawn at
 * @returns {Promise<HTMLCanvasElement>}
 */
async function withAttributionBar(canvas, scale) {
  const barHeight = Math.round(ATTRIBUTION_BAR_HEIGHT * scale);
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height + barHeight;
  const ctx = out.getContext('2d');
  // No 2D context means no browser (jsdom); the picture goes out as it is.
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);

  const top = canvas.height;
  const middle = top + barHeight / 2;
  const pad = 16 * scale;
  ctx.fillStyle = '#111b21';
  ctx.fillRect(0, top, out.width, barHeight);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e9edef';
  ctx.font = `500 ${15 * scale}px Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(ATTRIBUTION_URL, pad, middle);

  // Logo and name on the right; the name alone if the logo does not load.
  const logo = await loadImage(ATTRIBUTION_LOGO);
  const logoSize = 26 * scale;
  ctx.textAlign = 'right';
  ctx.font = `700 ${15 * scale}px Roboto, "Helvetica Neue", Arial, sans-serif`;
  const nameRight = out.width - pad;
  ctx.fillText(ATTRIBUTION_NAME, nameRight, middle);
  if (logo) {
    const nameWidth = ctx.measureText(ATTRIBUTION_NAME).width;
    ctx.drawImage(logo, nameRight - nameWidth - 8 * scale - logoSize, middle - logoSize / 2, logoSize, logoSize);
  }
  return out;
}

/**
 * Render an element to a PNG blob, clipped to what is visible, with the
 * attribution bar underneath.
 * @param {HTMLElement} element
 * @returns {Promise<Blob>}
 */
export async function captureElement(element) {
  // Cap the pixel ratio: a 3x phone screen would otherwise produce an image
  // several times larger than anything needs.
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = await snapshotElement(element, {
    scale,
    // The dropdown that started this, and any toast, sit inside the captured
    // area; the picture should show the conversation, not them.
    ignore: el => el.classList?.contains('chat-dropdown-menu') || el.classList?.contains('search-toast'),
  });

  const framed = await withAttributionBar(canvas, scale);
  const blob = await new Promise(resolve => framed.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  return blob;
}

/** A filename that says which conversation the image came from. */
export function screenshotFilename(conversationName) {
  const slug = (conversationName || 'conversa')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `masterwhats-${slug || 'conversa'}.png`;
}

/**
 * A capture started when the menu opened, so the tap that follows finds the
 * image already made and reaches navigator.share() with its activation intact.
 * That is the whole trick: redrawing the DOM takes seconds, and the tap does
 * not survive it.
 */
const PREPARED_WINDOW_MS = 15_000;
let prepared = null;

/**
 * Begin capturing ahead of the tap. Safe to call repeatedly; a failure here is
 * not surfaced, because the tap path captures again if this produced nothing.
 *
 * @param {HTMLElement} element
 * @param {string} conversationName
 */
export function prepareScreenshot(element, conversationName) {
  const filename = screenshotFilename(conversationName);
  const promise = captureElement(element).catch(() => null);
  prepared = { filename, promise, at: Date.now() };
}

async function takePrepared(filename) {
  if (!prepared) return null;
  const fresh = prepared.filename === filename
    && Date.now() - prepared.at < PREPARED_WINDOW_MS;
  const promise = fresh ? prepared.promise : null;
  prepared = null;
  return promise ? await promise : null;
}

/** Drop any capture started ahead of time (leaving a chat). */
export function clearPreparedScreenshot() {
  prepared = null;
}

/**
 * An image held from a tap whose activation ran out, so the retry is instant.
 * Short-lived on purpose: sharing a picture of a screen the user has already
 * scrolled away from would be worse than capturing again.
 */
const RETRY_WINDOW_MS = 30_000;
let pending = null;

function takePending(filename) {
  if (!pending) return null;
  const fresh = pending.filename === filename
    && Date.now() - pending.at < RETRY_WINDOW_MS;
  const blob = fresh ? pending.blob : null;
  pending = null;
  return blob;
}

/** Forget any held capture (exported for tests and for leaving a chat). */
export function clearPendingScreenshot() {
  pending = null;
}

/**
 * Try the clipboard with a blob already in hand.
 * @returns {Promise<boolean>} whether it took it
 */
export async function copyImageToClipboard(blob) {
  if (!canUseClipboard()) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture a chat and deliver it.
 *
 * Call this straight from the click handler and do not await anything before
 * it, or the activation both APIs depend on will already be gone.
 *
 * @param {HTMLElement} element - the area to capture
 * @param {string} conversationName - used for the filename
 * @returns {Promise<{outcome: string, reason?: string}>}
 *   outcome is one of: shared | cancelled | retry | copied | preview | failed
 *   'preview' carries { blob, filename } for the caller to put on screen
 */
export async function shareChatScreenshot(element, conversationName) {
  const filename = screenshotFilename(conversationName);
  const diag = capabilityReport();

  if (canShareFiles()) {
    // Reuse the image from a tap that lost its activation, so this one is
    // instant and the share sheet still opens.
    // Prefer an image already made: from a previous tap that ran out of
    // activation, or from the capture started when the menu opened. Awaiting a
    // settled promise costs only a microtask, which the activation survives.
    const held = takePending(filename);
    let blob;
    try {
      blob = held || await takePrepared(filename) || await captureElement(element);
    } catch (err) {
      return { outcome: 'failed', reason: err?.message, diag };
    }

    try {
      await navigator.share({ files: [new File([blob], filename, { type: 'image/png' })] });
      return { outcome: 'shared', diag };
    } catch (err) {
      if (err?.name === 'AbortError') return { outcome: 'cancelled', diag };

      // NotAllowedError is ambiguous: it covers both "your tap expired" and
      // "this platform will not share images". Ask for one more tap, which
      // settles it — but only once, or a browser of the second kind would keep
      // being asked forever.
      if (isSpentActivation(err) && !held) {
        pending = { filename, blob, at: Date.now() };
        return { outcome: 'retry', reason: err?.name, diag };
      }

      if (await copyImageToClipboard(blob)) {
        return { outcome: 'copied', reason: err?.name, diag };
      }
      return { outcome: 'preview', blob, filename, reason: err?.name, diag };
    }
  }

  // No share sheet. The clipboard takes a promise, so write() runs now — while
  // the tap is still live — and the browser waits on the capture.
  if (canUseClipboard()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': prepared?.promise?.then(b => b || captureElement(element))
          || captureElement(element) }),
      ]);
      prepared = null;
      return { outcome: 'copied', diag };
    } catch (err) {
      // Some builds reject a promise-valued ClipboardItem, and some accept the
      // call but refuse images outright. Capture once more and let the caller
      // put the picture on screen, where the platform's own long-press menu can
      // reach it.
      try {
        const blob = await captureElement(element);
        if (await copyImageToClipboard(blob)) {
          return { outcome: 'copied', diag };
        }
        return { outcome: 'preview', blob, filename, reason: err?.name, diag };
      } catch (captureErr) {
        return { outcome: 'failed', reason: captureErr?.message || err?.name, diag };
      }
    }
  }

  try {
    return { outcome: 'preview', blob: await captureElement(element), filename, diag };
  } catch (err) {
    return { outcome: 'failed', reason: err?.message, diag };
  }
}
