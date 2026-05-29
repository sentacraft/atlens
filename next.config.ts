import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Wire wrangler-style bindings into `next dev` so Analytics Engine writes
// don't silently no-op locally. Reads bindings from wrangler.toml.
initOpenNextCloudflareForDev();

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
  // Disable Next.js's /_next/image optimization endpoint.
  //
  // On Cloudflare Workers via OpenNext, that endpoint requires an `IMAGES`
  // binding (Cloudflare Images, paid). Without it, every <Image> request
  // round-trips through the Worker for a no-op passthrough — eating CPU and
  // slowing down list pages with many thumbnails. Since our lens images are
  // already pre-optimized webp at fixed sizes, Next.js's on-the-fly resize/
  // format-conversion adds no value. Unoptimized mode emits plain <img>
  // tags, served straight from the ASSETS binding by Cloudflare's CDN.
  images: {
    unoptimized: true,
  },
  // Path-level redirects handled by the routing layer (before any React
  // rendering). Replaces the prior page components at /[locale]/lenses and
  // /[locale]/lenses/compare that only existed to call `redirect()`. Query
  // strings (e.g. ?ids=A,B,C) are forwarded automatically by Next.js.
  async redirects() {
    return [
      {
        source: "/:locale(en|zh)/lenses",
        destination: "/:locale/lenses/x/browse",
        permanent: false,
      },
      // The all-lenses list lives at /lenses/[mount]/browse so it sits as a
      // true sibling of /lenses/[mount]/collections. The bare mount path is a
      // permanent (308) redirect to the list, so any old inbound link or
      // bookmark to /lenses/x lands on the canonical browse URL.
      {
        source: "/:locale(en|zh)/lenses/:mount(x|gfx)",
        destination: "/:locale/lenses/:mount/browse",
        permanent: true,
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
