// @vitest-environment node
//
// One address for the whole site (src/config/site.js), and nothing that
// types it out by hand.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { siteUrlFrom, DEFAULT_SITE_URL, SITE_URL, SITE_URL_PLACEHOLDER } from '../../src/config/site.js';

const ROOT = join(import.meta.dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('siteUrlFrom', () => {
  it('prefers SITE_URL, then Vercel\'s production domain, then the default', () => {
    expect(siteUrlFrom({ SITE_URL: 'https://exemplo.org/', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })).toBe('https://exemplo.org');
    expect(siteUrlFrom({ VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })).toBe('https://x.vercel.app');
    expect(siteUrlFrom({})).toBe(DEFAULT_SITE_URL);
  });

  it('adds the scheme when only a host is given', () => {
    expect(siteUrlFrom({ SITE_URL: 'exemplo.org' })).toBe('https://exemplo.org');
  });
});

describe('the address in the source', () => {
  const domain = new URL(DEFAULT_SITE_URL).host;
  const files = (dir) => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));

  it('is typed out only in src/config/site.js', () => {
    const typed = [...files(join(ROOT, 'src')), ...files(join(ROOT, 'scripts')), ...files(join(ROOT, 'tests/unit')),
      join(ROOT, 'index.html'), ...files(join(ROOT, 'public')).filter(f => f.endsWith('.txt'))]
      .filter(f => !f.endsWith(join('src', 'config', 'site.js')) && /\.(m?js|py|html|txt)$/.test(f))
      .filter(f => readFileSync(f, 'utf-8').includes(domain));
    expect(typed).toEqual([]);
  });

  it.skipIf(!existsSync(join(DIST, 'index.html')))('leaves no placeholder in the build', () => {
    for (const name of ['index.html', 'llms.txt', 'robots.txt', 'chat/alexandre-de-moraes/index.html']) {
      const text = readFileSync(join(DIST, name), 'utf-8');
      expect(text, name).not.toContain(SITE_URL_PLACEHOLDER);
      expect(text, name).toContain(SITE_URL);
    }
  });
});
