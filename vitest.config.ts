import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Anchored at the root: the default `**/` glob also collects tests from nested worktrees.
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // `server-only` throws outside a bundler's react-server condition, so tests alias it.
      'server-only': resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
