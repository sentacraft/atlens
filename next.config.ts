import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to the directory `next dev` was launched
  // from. Without this, when running the dev server inside a git worktree
  // located under `.claude/worktrees/<name>/`, Turbopack walks up the tree,
  // finds the parent repo's package-lock.json, and picks the parent as the
  // workspace root — leading to a "multiple lockfiles" warning and broken
  // module resolution for files like the local fonts in `src/app/layout.tsx`
  // (which use paths relative to the worktree's own node_modules).
  //
  // process.cwd() is the directory where `npm run dev` was invoked, which is
  // always the worktree's own root, so this works for both the main repo
  // and any worktree without further configuration.
  //
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);
