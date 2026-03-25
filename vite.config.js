import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'jsdom',
  },
});
