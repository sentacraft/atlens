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
  // Path-level redirects handled by the routing layer (before any React
  // rendering). Replaces the prior page components at /[locale]/lenses and
  // /[locale]/lenses/compare that only existed to call `redirect()`. Query
  // strings (e.g. ?ids=A,B,C) are forwarded automatically by Next.js.
  async redirects() {
    return [
      {
        source: "/:locale(en|zh)/lenses",
        destination: "/:locale/lenses/x",
        permanent: false,
      },
      {
        source: "/:locale(en|zh)/lenses/compare",
        destination: "/:locale/lenses/x/compare",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
