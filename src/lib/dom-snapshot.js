/**
 * Draw what is on screen inside an element to a canvas, by the browser itself.
 *
 * html2canvas re-implements CSS in JavaScript and repaints a copy of the whole
 * document: on a phone, with a chat a few hundred messages deep, that took
 * tens of seconds. Here only what is visible is copied — the scrolled lists
 * cut down to the rows on screen — and the copy goes into an SVG
 * <foreignObject>, which the browser lays out and paints natively, with the
 * page's own stylesheets. Then it is one drawImage onto a canvas.
 *
 * An SVG used as an image loads nothing from the network, so what the copy
 * needs from outside is put inside it as data: URLs — the images on screen,
 * the url()s of the stylesheets (the wallpaper) and the web font.
 *
 * Security note: the markup is the page's own DOM, serialized; nothing from
 * outside the page is parsed as HTML.
 */

const XHTML = 'http://www.w3.org/1999/xhtml';

// Stylesheets, their url()s and the font: fetched once per visit, since they
// do not change while the page is open. A failed fetch is not kept, so the
// next print tries again.
const assets = new Map(); // url → Promise<string|null>
// Images on screen (avatars, media): a few dozen kept, the oldest dropped.
const images = new Map();
const IMAGE_CACHE = 60;
let fontCss = null; // Promise<string>
let pageCss = null; // Promise<string>

function fetchDataUrl(url) {
  return fetch(url)
    .then(r => (r.ok ? r.blob() : null))
    .then(blob => blob && new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);
}

function cached(cache, url, limit = Infinity) {
  if (cache.has(url)) {
    const hit = cache.get(url);
    cache.delete(url); // most recent last
    cache.set(url, hit);
    return hit;
  }
  const promise = fetchDataUrl(url).then((data) => {
    if (!data) cache.delete(url);
    return data;
  });
  cache.set(url, promise);
  while (cache.size > limit) cache.delete(cache.keys().next().value);
  return promise;
}

const URL_IN_CSS = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/**
 * Replace every url(...) in some CSS with its data: URL; an unreachable one
 * becomes `none`.
 * @returns {Promise<{css: string, complete: boolean}>}
 */
async function inlineCssUrls(css, base) {
  const found = new Map();
  for (const m of css.matchAll(URL_IN_CSS)) {
    const raw = m[2];
    if (raw.startsWith('data:') || raw.startsWith('#')) continue;
    found.set(raw, new URL(raw, base).href);
  }
  const resolved = new Map();
  await Promise.all([...found].map(async ([raw, abs]) => resolved.set(raw, await cached(assets, abs))));
  let complete = true;
  const out = css.replace(URL_IN_CSS, (whole, q, raw) => {
    if (!resolved.has(raw)) return whole;
    const data = resolved.get(raw);
    if (!data) complete = false;
    return data ? `url("${data}")` : 'none';
  });
  return { css: out, complete };
}

/** Keep a result for the visit only if nothing in it failed. */
function keepIfComplete(build, forget) {
  const promise = build();
  promise.then(({ complete }) => { if (!complete) forget(); }, forget);
  return promise.then(({ css }) => css, () => '');
}

/** The page's own rules, with what they point to inlined. */
function pageStyles() {
  if (!pageCss) {
    pageCss = keepIfComplete(async () => {
      const results = await Promise.all(Array.from(document.styleSheets).map((sheet) => {
        let rules;
        try { rules = Array.from(sheet.cssRules); } catch { return null; } // another origin
        return inlineCssUrls(rules.map(rule => rule.cssText).join('\n'), sheet.href || location.href);
      }));
      const done = results.filter(Boolean);
      return { css: done.map(r => r.css).join('\n'), complete: done.every(r => r.complete) };
    }, () => { pageCss = null; });
  }
  return pageCss;
}

/**
 * The web font, as data: URLs. Its stylesheet comes from another origin and
 * cannot be read through document.styleSheets, so it is fetched (the font
 * service allows it) and only the Latin faces are kept — the text here is
 * Portuguese. Without it the picture uses the system's sans-serif.
 */
function webFontStyles() {
  if (!fontCss) {
    fontCss = keepIfComplete(async () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com"]'));
      const results = await Promise.all(links.map(async (link) => {
        try {
          const response = await fetch(link.href);
          if (!response.ok) return { css: '', complete: false };
          const latin = (await response.text()).split(/(?=\/\*)/).filter(block => /^\/\*\s*latin\s*\*\//.test(block));
          // `swap` would let the picture be painted before the font is ready.
          const blocking = latin.join('\n').replace(/font-display:\s*\w+/g, 'font-display: block');
          return await inlineCssUrls(blocking, link.href);
        } catch {
          return { css: '', complete: false };
        }
      }));
      return { css: results.map(r => r.css).join('\n'), complete: results.every(r => r.complete) };
    }, () => { fontCss = null; });
  }
  return fontCss;
}

/** Fetch what every snapshot needs (stylesheets, wallpaper, font) ahead of time. */
export function preloadSnapshot() {
  return Promise.all([pageStyles(), webFontStyles()]).catch(() => {});
}

function isScrolled(el) {
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  const { overflowY } = getComputedStyle(el);
  return overflowY === 'auto' || overflowY === 'scroll';
}

/**
 * Turn `copy` into an empty box of `height`, with the given margins. It keeps
 * its tag and classes, so a sibling selector (`.row + .row`) setting the
 * margin of the row after it still matches.
 */
function hollowOut(copy, height, marginTop, marginBottom) {
  copy.replaceChildren();
  copy.removeAttribute('style');
  Object.assign(copy.style, {
    display: 'block', boxSizing: 'border-box', height: `${height}px`, padding: '0', border: '0',
    marginTop, marginBottom, flex: 'none', visibility: 'hidden',
  });
}

/**
 * Cut a scrolled list down to what shows. Its direct children (the chat's
 * days) that are off screen go; the first one left is moved, by its top
 * margin, to where it sits on screen. Inside a day that crosses an edge — a
 * busy one holds hundreds of rows — the rows below the screen go, and each
 * run of rows above it becomes one empty box spanning the run, measured end
 * to end: one box per run, since every box's height is rounded when drawn and
 * a hundred roundings add up to a visible shift. The last row of a run stays
 * as it is, so whatever comes after it sees the same neighbour.
 *
 * @param {Element} orig - the list on the page
 * @param {Element} copy - its copy
 * @param {Array<function>} work - changes to the copy, made once all is measured
 */
function trimScrolled(orig, copy, work) {
  const box = orig.getBoundingClientRect();
  const style = getComputedStyle(orig);
  const contentTop = box.top + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.paddingTop) || 0);
  const outside = r => r.bottom <= box.top || r.top >= box.bottom;
  let first = true;
  Array.from(orig.children).forEach((child, i) => {
    const r = child.getBoundingClientRect();
    const copyChild = copy.children[i];
    if (!copyChild) return;
    if (outside(r)) { work.push(() => copyChild.remove()); return; }
    const { position } = getComputedStyle(child);
    if (position === 'absolute' || position === 'fixed') return; // takes no room
    if (first) {
      const marginTop = `${r.top - contentTop}px`;
      work.push(() => { copyChild.style.marginTop = marginTop; });
      first = false;
    }
    if (r.top >= box.top && r.bottom <= box.bottom) return; // wholly on screen

    let run = []; // [row, copy, rect] above the screen, in flow, block-level
    const closeRun = () => {
      run.pop(); // the last row stays whole
      if (run.length) {
        const [head, , headRect] = run[0];
        const [tail, , tailRect] = run.at(-1);
        const height = tailRect.bottom - headRect.top;
        const marginTop = getComputedStyle(head).marginTop;
        const marginBottom = getComputedStyle(tail).marginBottom;
        // The tail's copy keeps its classes for the kept row after it.
        const [, tailCopy] = run.at(-1);
        const others = run.slice(0, -1).map(([, c]) => c);
        work.push(() => {
          hollowOut(tailCopy, height, marginTop, marginBottom);
          for (const c of others) c.remove();
        });
      }
      run = [];
    };
    Array.from(child.children).forEach((row, j) => {
      const rr = row.getBoundingClientRect();
      const copyRow = copyChild.children[j];
      if (!copyRow) return;
      const { display, position } = getComputedStyle(row);
      const outOfFlow = position === 'absolute' || position === 'fixed';
      if (rr.top >= box.bottom || (outOfFlow && outside(rr))) { work.push(() => copyRow.remove()); return; }
      // An inline one (the day badge) ends a run and stays: its line is taller
      // than its box, and it is one small element.
      if (rr.bottom <= box.top && !outOfFlow && !display.startsWith('inline')) run.push([row, copyRow, rr]);
      else closeRun();
    });
    closeRun();
  });
  copy.style.overflow = 'hidden';
}

/**
 * Copy `element`, keeping of each scrolled list only what is on screen.
 * @returns {{clone: Element, images: Array<[HTMLImageElement, HTMLImageElement]>}}
 */
export function visibleClone(element, ignore) {
  const clone = element.cloneNode(true);
  // Walk both trees in step to pair each original with its copy.
  const pairs = [];
  const a = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  const b = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
  for (let o = a.currentNode, c = b.currentNode; o && c; o = a.nextNode(), c = b.nextNode()) pairs.push([o, c]);

  const work = [];
  const imagePairs = [];
  for (const [orig, copy] of pairs) {
    if (ignore?.(orig)) { work.push(() => copy.remove()); continue; }
    if (orig instanceof HTMLImageElement) imagePairs.push([orig, copy]);
    // Form state lives in properties the serializer does not see.
    if (orig instanceof HTMLTextAreaElement) copy.textContent = orig.value;
    else if (orig instanceof HTMLInputElement) {
      copy.setAttribute('value', orig.value);
      if (orig.checked) copy.setAttribute('checked', '');
      else copy.removeAttribute('checked');
    }
    if (isScrolled(orig)) trimScrolled(orig, copy, work);
  }
  // Measured above, changed here: the copy is detached, so this order only
  // matters for reading the page, which is done.
  for (const change of work) change();
  return { clone, images: imagePairs.filter(([, copy]) => clone.contains(copy)) };
}

const BLANK_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** The copy's images, as data: URLs: an SVG image loads nothing itself. */
async function inlineImages(pairs) {
  await Promise.all(pairs.map(async ([orig, copy]) => {
    // The candidate on screen, read from the original (a copy has none yet).
    const src = orig.currentSrc || orig.getAttribute('src');
    copy.removeAttribute('srcset');
    if (!src || src.startsWith('data:')) return;
    const data = await cached(images, new URL(src, location.href).href, IMAGE_CACHE);
    // Unreachable: an empty picture of the same box, so nothing around it moves.
    copy.setAttribute('src', data || BLANK_GIF);
  }));
}

/**
 * The element's ancestors as empty, full-size boxes, so selectors that go
 * through them (`.app-container.chat-open .main-area …`) still match.
 */
function wrapInAncestors(clone, element, rect) {
  let inner = clone;
  Object.assign(clone.style, {
    position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, margin: '0',
  });
  for (let p = element.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const shell = p.cloneNode(false);
    shell.removeAttribute('id');
    Object.assign(shell.style, {
      position: 'absolute', inset: '0', margin: '0', padding: '0', border: '0',
      transform: 'none', overflow: 'hidden', display: 'block',
    });
    shell.appendChild(inner);
    inner = shell;
  }
  return inner;
}

// What <body> passes down. Its rules (body, html) match nothing inside the SVG.
const INHERITED = ['font-family', 'font-size', 'font-weight', 'line-height', 'color',
  'letter-spacing', 'word-break', 'overflow-wrap', 'text-rendering',
  '-webkit-font-smoothing', 'font-feature-settings'];

/**
 * Drop what XML does not allow — control characters, half of an emoji — or
 * one such character in a message would make the whole picture fail to parse.
 */
export function xmlSafe(text) {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

// WebKit may paint an SVG image's own data: images only from the second draw.
const isWebKit = typeof navigator !== 'undefined'
  && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);
const REDRAW_MS = isWebKit ? 100 : 30;

/**
 * @param {HTMLElement} element
 * @param {object} [options]
 * @param {number} [options.scale] - device pixels per CSS pixel
 * @param {function} [options.ignore] - (element) => true to leave it out
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function snapshotElement(element, { scale = 1, ignore } = {}) {
  const rect = element.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;

  const { clone, images: imagePairs } = visibleClone(element, ignore);
  const [css, fonts] = await Promise.all([pageStyles(), webFontStyles(), inlineImages(imagePairs)]);

  // The page is drawn whole-viewport so its media queries see the same width,
  // then cropped to the element.
  const root = document.createElementNS(XHTML, 'div');
  const body = getComputedStyle(document.body);
  for (const prop of INHERITED) root.style.setProperty(prop, body.getPropertyValue(prop));
  Object.assign(root.style, {
    position: 'relative', width: `${width}px`, height: `${height}px`, overflow: 'hidden',
  });
  const style = document.createElementNS(XHTML, 'style');
  // A still picture: an animation would be caught on its first frame.
  style.textContent = `${fonts}\n${css}\n*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`;
  root.append(style, wrapInAncestors(clone, element, rect));

  const markup = xmlSafe(new XMLSerializer().serializeToString(root));
  // Declared at CSS size: the media queries inside measure the SVG, so a
  // scaled one would get the layout of a wider screen. drawImage rasterizes
  // the vector at the size it draws to, so the picture stays sharp.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${markup}</foreignObject></svg>`;

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível gerar a imagem.');
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  };
  // Drawn again a moment later: the image may have been decoded before the
  // fonts inside it (any engine) or its images (WebKit) were ready, and each
  // drawImage paints the SVG afresh.
  draw();
  await new Promise(resolve => setTimeout(resolve, REDRAW_MS));
  draw();
  return canvas;
}
