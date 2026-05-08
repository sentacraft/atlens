import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Backward compat: old /lenses/[id] → /lenses/x/[id]
      // Excludes known static paths (compare, x, gfx) and static assets (.webp etc.)
      {
        source: "/lenses/:id((?!x$|gfx$|compare$)[^.]+)",
        destination: "/lenses/x/:id",
        permanent: false,
      },
      // Same redirect but with locale prefix
      {
        source: "/:locale(en|zh)/lenses/:id((?!x$|gfx$|compare$)[^.]+)",
        destination: "/:locale/lenses/x/:id",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
