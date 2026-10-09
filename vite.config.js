import { defineConfig } from 'vite';
import { resolve as resolveApi } from './src/lib/api-routes.js';

/**
 * Vercel serves /api/v1/* by rewrite (vercel.json); the dev and preview
 * servers do the same from the same table, so a link opened here answers
 * with the file, not with the app.
 */
const apiRewrites = () => ({
  name: 'masterwhats-api-rewrites',
  // Braces matter: a function returned from these hooks is run as a post-hook.
  configureServer: (server) => { server.middlewares.use(rewrite); },
  configurePreviewServer: (server) => { server.middlewares.use(rewrite); },
});
function rewrite(req, _res, next) {
  const hit = resolveApi((req.url || '').split('?')[0]);
  if (hit) req.url = hit.file;
  next();
}

export default defineConfig({
  plugins: [apiRewrites()],
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
