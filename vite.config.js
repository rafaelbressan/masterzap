import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { siteUrlFrom, SITE_URL_PLACEHOLDER } from './src/config/site.js';

// The site's address (src/config/site.js): SITE_URL, else Vercel's production
// domain, else the default.
const SITE_URL = siteUrlFrom(process.env);
const withSite = (text) => text.replaceAll(SITE_URL_PLACEHOLDER, SITE_URL);

// public/ files that carry the address. Vite copies public/ as it is, so the
// placeholder is swapped in the built copy, and on the fly by the dev server.
const SITE_TEXT_FILES = ['llms.txt', 'robots.txt'];

/** %SITE_URL% → the address, in index.html and the text files above. */
function siteUrl() {
  let outDir = 'dist';
  return {
    name: 'site-url',
    configResolved(config) { outDir = config.build.outDir; },
    transformIndexHtml: { order: 'pre', handler: withSite },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\//, '');
        if (!SITE_TEXT_FILES.includes(name)) return next();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(withSite(readFileSync(join('public', name), 'utf-8')));
      });
    },
    closeBundle() {
      for (const name of SITE_TEXT_FILES) {
        const path = join(outDir, name);
        if (existsSync(path)) writeFileSync(path, withSite(readFileSync(path, 'utf-8')));
      }
    },
  };
}

export default defineConfig({
  define: {
    // Versions every /data/ URL (src/lib/data-url.js): the commit on Vercel,
    // the build time anywhere else.
    __DATA_BUILD_ID__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36)
    ),
    __SITE_URL__: JSON.stringify(SITE_URL),
  },
  plugins: [siteUrl()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  preview: {
    // Reached through `tailscale serve`, which fronts the loopback port with
    // HTTPS on a *.ts.net name. Vite rejects hostnames it does not know, and
    // the browser needs a secure context for the clipboard and the share sheet.
    allowedHosts: ['.ts.net'],
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
  },
});
