// @vitest-environment jsdom
//
// The drawing needs a real browser and lives in the E2E suite. What matters
// here is the delivery chain — which platform API gets the image, and what
// happens when one is missing, refuses, or refuses *because the tap that
// started everything has expired*.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const canvasStub = {
  toBlob: (cb) => cb(new Blob(['png'], { type: 'image/png' })),
};
const draw = vi.fn(async () => canvasStub); // the drawing: snapshotElement
vi.mock('../../src/lib/dom-snapshot.js', () => ({
  snapshotElement: (...args) => draw(...args),
  preloadSnapshot: () => Promise.resolve(),
}));

const {
  shareChatScreenshot,
  prepareScreenshot,
  clearPreparedScreenshot,
  clearPendingScreenshot,
  screenshotFilename,
  canShareFiles,
  hasSecureContext,
} = await import('../../src/lib/screenshot.js');

const element = () => document.createElement('div');

/** Errors the platform raises when the activation has run out. */
const spentActivation = () => Object.assign(new Error('spent'), { name: 'NotAllowedError' });

describe('screenshotFilename()', () => {
  it('builds a name from the contact', () => {
    expect(screenshotFilename('Ciro Soares')).toBe('masterwhats-ciro-soares.png');
  });

  it('strips accents and punctuation', () => {
    expect(screenshotFilename('Alexandre de Moraes BRASILIA'))
      .toBe('masterwhats-alexandre-de-moraes-brasilia.png');
    expect(screenshotFilename('Luiz Rennó')).toBe('masterwhats-luiz-renno.png');
    expect(screenshotFilename('DV (autoenvio)')).toBe('masterwhats-dv-autoenvio.png');
  });

  it('falls back when there is no usable name', () => {
    expect(screenshotFilename('')).toBe('masterwhats-conversa.png');
    expect(screenshotFilename('!!!')).toBe('masterwhats-conversa.png');
    expect(screenshotFilename(undefined)).toBe('masterwhats-conversa.png');
  });
});

describe('delivery', () => {
  let clickSpy;

  beforeEach(() => {
    clearPreparedScreenshot();
    clearPendingScreenshot();
    draw.mockClear();
    globalThis.ClipboardItem = class { constructor(data) { this.data = data; } };
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    navigator.share = undefined;
    navigator.canShare = undefined;
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  afterEach(() => vi.restoreAllMocks());

  const enableShare = (impl) => {
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn(impl);
  };
  const enableClipboard = (write) =>
    Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true });

  it('prefers the native share sheet', async () => {
    enableShare(() => Promise.resolve());
    enableClipboard(vi.fn());

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('shared');
    expect(navigator.clipboard.write).not.toHaveBeenCalled();
  });

  it('treats a dismissed share sheet as a decision, not a failure', async () => {
    enableShare(() => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })));
    enableClipboard(vi.fn());

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('cancelled');
    expect(navigator.clipboard.write).not.toHaveBeenCalled();
  });

  // The bug this whole design exists for: redrawing the DOM outlives the tap,
  // so share() is refused and the image would otherwise land in a download the
  // user never asked for.
  it('holds the image and asks for another tap when the activation expired', async () => {
    enableShare(() => Promise.reject(spentActivation()));
    enableClipboard(vi.fn());

    const result = await shareChatScreenshot(element(), 'Ciro');

    expect(result.outcome).toBe('retry');
    expect(navigator.clipboard.write).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('shares the held image on the next tap without capturing again', async () => {
    enableShare(() => Promise.reject(spentActivation()));
    await shareChatScreenshot(element(), 'Ciro');
    const capturesSoFar = draw.mock.calls.length;

    enableShare(() => Promise.resolve());
    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('shared');
    expect(draw).toHaveBeenCalledTimes(capturesSoFar);
  });

  it('does not reuse an image held for a different conversation', async () => {
    enableShare(() => Promise.reject(spentActivation()));
    await shareChatScreenshot(element(), 'Ciro');
    const capturesSoFar = draw.mock.calls.length;

    enableShare(() => Promise.resolve());
    await shareChatScreenshot(element(), 'Martha Graeff');

    expect(draw.mock.calls.length).toBeGreaterThan(capturesSoFar);
  });

  it('falls back to the clipboard when sharing fails for another reason', async () => {
    enableShare(() => Promise.reject(new Error('boom')));
    enableClipboard(vi.fn(() => Promise.resolve()));

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('copied');
  });

  // The clipboard accepts a promise, so write() is reached while the tap is
  // still live and the browser waits on the capture itself.
  it('hands the clipboard a promise rather than an awaited blob', async () => {
    const write = vi.fn(() => Promise.resolve());
    enableClipboard(write);

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('copied');

    const [[item]] = write.mock.calls[0];
    expect(typeof item.data['image/png'].then).toBe('function');
  });

  // Neither API is available: hand the image back so it can go on screen,
  // where a long press reaches the browser's own share menu. Downloading
  // silently was the old behaviour, and it is not what anyone asked for.
  it('returns the image for preview when nothing can take it', async () => {
    const result = await shareChatScreenshot(element(), 'Ciro');

    expect(result.outcome).toBe('preview');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toBe('masterwhats-ciro.png');
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('returns the image for preview when the clipboard refuses it', async () => {
    enableClipboard(vi.fn(() => Promise.reject(
      Object.assign(new Error('no'), { name: 'NotAllowedError' })
    )));

    const result = await shareChatScreenshot(element(), 'Ciro');

    expect(result.outcome).toBe('preview');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  // What Rafael's browser reports: it shares text but not files, and its
  // clipboard refuses images. Both doors shut.
  it('previews when the browser shares text but not files', async () => {
    navigator.share = vi.fn();
    navigator.canShare = vi.fn(() => false);
    enableClipboard(vi.fn(() => Promise.reject(
      Object.assign(new Error('no'), { name: 'NotAllowedError' })
    )));

    const result = await shareChatScreenshot(element(), 'Ciro');

    expect(result.outcome).toBe('preview');
    expect(result.diag).toContain('csf=0');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('reports a capture that never produced an image', async () => {
    draw.mockImplementationOnce(() => Promise.reject(new Error('canvas morreu')));
    enableShare(() => Promise.resolve());

    const result = await shareChatScreenshot(element(), 'Ciro');

    expect(result.outcome).toBe('failed');
    expect(result.reason).toContain('canvas');
  });
});

describe('preparing ahead of the tap', () => {
  beforeEach(() => {
    clearPreparedScreenshot();
    clearPendingScreenshot();
    draw.mockClear();
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn(() => Promise.resolve());
  });
  afterEach(() => vi.restoreAllMocks());

  it('captures when the menu opens', async () => {
    prepareScreenshot(element(), 'Ciro');
    await new Promise(r => setTimeout(r, 0));

    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('reuses that capture on the tap instead of making another', async () => {
    prepareScreenshot(element(), 'Ciro');
    await new Promise(r => setTimeout(r, 0));

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('shared');
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('ignores a capture prepared for a different conversation', async () => {
    prepareScreenshot(element(), 'Ciro');
    await new Promise(r => setTimeout(r, 0));

    await shareChatScreenshot(element(), 'Martha Graeff');

    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('recaptures after the prepared image is dropped', async () => {
    prepareScreenshot(element(), 'Ciro');
    await new Promise(r => setTimeout(r, 0));
    clearPreparedScreenshot();

    await shareChatScreenshot(element(), 'Ciro');

    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('still delivers when the prepared capture failed', async () => {
    draw.mockImplementationOnce(() => Promise.reject(new Error('falhou')));
    prepareScreenshot(element(), 'Ciro');
    await new Promise(r => setTimeout(r, 0));

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('shared');
  });
});

describe('what gets drawn', () => {
  beforeEach(() => {
    clearPreparedScreenshot();
    clearPendingScreenshot();
    draw.mockClear();
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn(() => Promise.resolve());
  });
  afterEach(() => vi.restoreAllMocks());

  // The dropdown that asked for the print sits inside the captured area, and
  // the capture now starts while it is still open.
  it('leaves the dropdown out of the picture', async () => {
    await shareChatScreenshot(element(), 'Ciro');

    const [, options] = draw.mock.calls[0];
    const menu = document.createElement('div');
    menu.className = 'chat-dropdown-menu';
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg-bubble';

    expect(options.ignore(menu)).toBe(true);
    expect(options.ignore(bubble)).toBeFalsy();
  });

  it('caps the pixel ratio so a 3x screen does not triple the file', async () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });

    await shareChatScreenshot(element(), 'Ciro');

    expect(draw.mock.calls[0][1].scale).toBe(2);
  });
});

describe('capability probes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('canShareFiles is false without the API', () => {
    navigator.share = undefined;
    navigator.canShare = undefined;
    expect(canShareFiles()).toBe(false);
  });

  it('canShareFiles asks the browser about a png', () => {
    navigator.share = vi.fn();
    navigator.canShare = vi.fn(() => true);

    expect(canShareFiles()).toBe(true);
    const [{ files }] = navigator.canShare.mock.calls[0];
    expect(files[0].type).toBe('image/png');
  });

  it('hasSecureContext reports what the browser says', () => {
    expect(typeof hasSecureContext()).toBe('boolean');
  });
});

describe('capabilityReport()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names every capability the delivery depends on', async () => {
    const { capabilityReport } = await import('../../src/lib/screenshot.js');

    for (const key of ['sec', 'shr', 'csf', 'clip', 'ci']) {
      expect(capabilityReport()).toContain(`${key}=`);
    }
  });

  it('reports each capability as present or absent', async () => {
    const { capabilityReport } = await import('../../src/lib/screenshot.js');
    navigator.share = undefined;
    navigator.canShare = undefined;

    expect(capabilityReport()).toContain('shr=0');
    expect(capabilityReport()).toContain('csf=0');
  });
});

describe('shareImageFile()', () => {
  beforeEach(() => {
    navigator.share = undefined;
    navigator.canShare = undefined;
  });
  afterEach(() => vi.restoreAllMocks());

  it('hands the blob straight to the share sheet', async () => {
    const { shareImageFile } = await import('../../src/lib/screenshot.js');
    navigator.share = vi.fn(() => Promise.resolve());

    const blob = new Blob(['png'], { type: 'image/png' });
    expect(await shareImageFile(blob, 'a.png')).toBe('shared');

    // No canShare probe in the way: the platform answers for itself.
    const [{ files }] = navigator.share.mock.calls[0];
    expect(files[0].name).toBe('a.png');
    expect(files[0].type).toBe('image/png');
  });

  it('separates a dismissal from a refusal', async () => {
    const { shareImageFile } = await import('../../src/lib/screenshot.js');
    const blob = new Blob(['png'], { type: 'image/png' });

    navigator.share = vi.fn(() => Promise.reject(
      Object.assign(new Error('x'), { name: 'AbortError' })
    ));
    expect(await shareImageFile(blob, 'a.png')).toBe('cancelled');

    navigator.share = vi.fn(() => Promise.reject(
      Object.assign(new Error('x'), { name: 'NotAllowedError' })
    ));
    expect(await shareImageFile(blob, 'a.png')).toBe('unsupported');
  });

  it('is unsupported when there is no share at all', async () => {
    const { shareImageFile } = await import('../../src/lib/screenshot.js');
    expect(await shareImageFile(new Blob([]), 'a.png')).toBe('unsupported');
  });
});

describe('canShareFiles() probe', () => {
  afterEach(() => vi.restoreAllMocks());

  // An empty File is the obvious probe and it is wrong: implementations that
  // validate the payload answer "no", which reads as "this device cannot share
  // images" when it can.
  it('probes with a file that has bytes in it', async () => {
    const { canShareFiles } = await import('../../src/lib/screenshot.js');
    navigator.share = vi.fn();
    navigator.canShare = vi.fn(() => true);

    canShareFiles();

    const [{ files }] = navigator.canShare.mock.calls[0];
    expect(files[0].size).toBeGreaterThan(0);
    expect(files[0].type).toBe('image/png');
  });
});

describe('the retry is offered once, not forever', () => {
  beforeEach(() => {
    clearPreparedScreenshot();
    clearPendingScreenshot();
    draw.mockClear();
    globalThis.ClipboardItem = class { constructor(data) { this.data = data; } };
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    navigator.canShare = vi.fn(() => true);
  });
  afterEach(() => vi.restoreAllMocks());

  // NotAllowedError covers both "your tap expired" and "this platform will not
  // share images". One more tap tells them apart; asking again after that would
  // just loop a browser of the second kind.
  it('gives up after the second refusal instead of asking again', async () => {
    navigator.share = vi.fn(() => Promise.reject(
      Object.assign(new Error('no'), { name: 'NotAllowedError' })
    ));

    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('retry');

    const second = await shareChatScreenshot(element(), 'Ciro');
    expect(second.outcome).toBe('preview');
    expect(second.blob).toBeInstanceOf(Blob);
  });

  it('still shares when the second tap is the one that works', async () => {
    navigator.share = vi.fn(() => Promise.reject(
      Object.assign(new Error('no'), { name: 'NotAllowedError' })
    ));
    await shareChatScreenshot(element(), 'Ciro');

    navigator.share = vi.fn(() => Promise.resolve());
    expect((await shareChatScreenshot(element(), 'Ciro')).outcome).toBe('shared');
  });
});
