// vite.config.local.ts — local QA config that adds /api proxy to standalone verify server
// Run: pnpm vite --config vite.config.local.ts --port 5174
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest,
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html}', '**/*.{svg,png,jpg,jpeg,gif}'] },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: {
      // Local QA: forward /api/* to standalone verify server (functions/local-verify.cjs on :5050)
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
});
