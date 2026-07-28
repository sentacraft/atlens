import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Anchored at the project root, so only this tree's src/ is collected.
    // Vitest's default is `**/*.{test,spec}...`, whose leading `**/` also
    // matches src/ copies inside nested git worktrees — those sit on older
    // commits and fail against the current tree. Anchoring fixes that for any
    // nested checkout regardless of where it lives; .gitignore has no effect
    // on test collection. e2e/ is Playwright's, run by `test:e2e`.
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
