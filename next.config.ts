import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { SITE } from './src/config/site';
import brandsData from './src/data/brands.json';

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/i18n/request.ts',
  experimental: { createMessagesDeclaration: './src/messages/en.json' },
});

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Without this, Turbopack in a nested worktree picks the parent repo's lockfile as the root.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Without it the persistent dev cache in .next/dev/cache only grows; a long-running dev server
    // reached 6.5 GB. https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackGc
    turbopackGc: true,
  },
  // Unoptimized: on Workers the image endpoint needs a paid IMAGES binding, and the lens images
  // are already optimized webp.
  images: {
    unoptimized: true,
  },
  // Cloudflare adds noindex to workers.dev Previews only, not to custom-domain ones.
  // https://developers.cloudflare.com/workers/previews/custom-domains/
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `.+\\.preview\\.${SITE.host.replaceAll(".", "\\.")}` }],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:locale(en|zh)/lenses",
        destination: "/:locale/lenses/x/browse",
        permanent: false,
      },
      {
        source: "/:locale(en|zh)/lenses/:mount(x|gfx)",
        destination: "/:locale/lenses/:mount/browse",
        permanent: true,
      },
      {
        source: "/:locale(en|zh)/lenses/x/charts",
        destination: "/:locale/lenses/x/charts/timeline",
        permanent: false,
      },
      {
        source: `/:locale(en|zh)/lenses/x/collections/:brand(${Object.keys(brandsData).join("|")})`,
        destination: "/:locale/lenses/x/brands/:brand",
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
