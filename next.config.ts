import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Without this, Turbopack in a nested worktree picks the parent repo's lockfile as the root.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: process.cwd(),
  },
  // Unoptimized: on Workers the image endpoint needs a paid IMAGES binding, and the lens images
  // are already optimized webp.
  images: {
    unoptimized: true,
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
        source: "/:locale(en|zh)/lenses/compare",
        destination: "/:locale/lenses/x/compare",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
