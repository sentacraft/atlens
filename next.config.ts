import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  async redirects() {
    // Backward compat: old /lenses/[id] → /lenses/x/[id].
    // All lens IDs contain at least one hyphen (e.g. "fujifilm-xf-35mmf14-r-x"),
    // while every reserved sub-path (x, gfx, compare) does not.
    // Matching on "must contain a hyphen" is a safe whitelist that won't
    // collide with static assets, mount segments, or future sub-routes.
    const legacyLensId = ":id([a-z0-9]+-[a-z0-9-]+)";
    return [
      { source: `/lenses/${legacyLensId}`, destination: "/lenses/x/:id", permanent: false },
      { source: `/:locale(en|zh)/lenses/${legacyLensId}`, destination: "/:locale/lenses/x/:id", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
