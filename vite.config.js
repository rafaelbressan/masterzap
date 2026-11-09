import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Versions every /data/ URL (src/lib/data-url.js): the commit on Vercel,
    // the build time anywhere else.
    __DATA_BUILD_ID__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || Date.now().toString(36)
    ),
  },
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
