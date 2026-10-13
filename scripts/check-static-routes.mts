#!/usr/bin/env node
// Fails the build when an expected static route was not prerendered: request context read up
// the layout tree silently makes every descendant dynamic.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  expectedStaticRoutes,
  INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS,
} from "../src/config/static-routes.ts";

interface PrerenderManifest {
  routes: Record<string, unknown>;
  dynamicRoutes: Record<string, { fallback?: string | false | null }>;
}

async function main(): Promise<void> {
  const manifestPath = resolve(process.cwd(), ".next/prerender-manifest.json");
  let manifest: PrerenderManifest;
  try {
    const raw = await readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw) as PrerenderManifest;
  } catch (err) {
    console.error(
      `\n✗ Could not read ${manifestPath}.\n` +
        `  Run \`next build\` first; this script is meant to run after the\n` +
        `  Next.js build step has completed.\n`
    );
    console.error(err);
    process.exit(1);
  }

  const prerendered = new Set(Object.keys(manifest.routes ?? {}));
  const expected = expectedStaticRoutes();
  const missing = expected.filter((r) => !prerendered.has(r));

  if (missing.length > 0) {
    console.error(
      `\n✗ Static route regression detected.\n\n` +
        `  ${missing.length} route(s) declared as static in\n` +
        `  src/config/static-routes.ts are missing from\n` +
        `  .next/prerender-manifest.json. This usually means something in a\n` +
        `  layout or page accessed request-time context (cookies, headers,\n` +
        `  getLocale, dynamic searchParams, etc.) and forced the route into\n` +
        `  dynamic rendering.\n\n` +
        `  First few missing routes:\n`
    );
    for (const route of missing.slice(0, 10)) {
      console.error(`    - ${route}`);
    }
    if (missing.length > 10) {
      console.error(`    ... and ${missing.length - 10} more`);
    }
    console.error(
      `\n  Check recent changes to:\n` +
        `    - src/app/layout.tsx              (must be pass-through)\n` +
        `    - src/app/[locale]/layout.tsx     (must call setRequestLocale)\n` +
        `    - the affected page files         (must call setRequestLocale)\n\n` +
        `  If a route was intentionally made dynamic, remove it from\n` +
        `  STATIC_LOCALIZED_SUBPATHS / STATIC_NON_LOCALIZED_ROUTES and add\n` +
        `  its pattern to INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS in\n` +
        `  src/config/static-routes.ts.\n`
    );
    process.exit(1);
  }

  // No dynamic route may be `fallback: false`: OpenNext then 404s every request to it, while
  // `next start` serves it fine (PR #397).
  const cfUnsafe = Object.entries(manifest.dynamicRoutes ?? {})
    .filter(([, entry]) => entry?.fallback === false)
    .map(([route]) => route);

  if (cfUnsafe.length > 0) {
    console.error(
      `\n✗ Cloudflare-unsafe route(s) detected (\`fallback: false\`).\n\n` +
        `  ${cfUnsafe.length} dynamic route(s) are marked \`fallback: false\` in\n` +
        `  .next/prerender-manifest.json. On Cloudflare Workers via OpenNext,\n` +
        `  these 404 on EVERY request — including prerendered ids in cache —\n` +
        `  while \`next start\` serves them fine (so it passes locally). This is\n` +
        `  the #397 outage that took down all detail pages.\n\n` +
        `  Offending route(s):\n`
    );
    for (const route of cfUnsafe) {
      console.error(`    - ${route}`);
    }
    console.error(
      `\n  Cause: \`export const dynamicParams = false\` on the page (or a\n` +
        `  parent). Remove it — the default (true) emits \`fallback: null\`,\n` +
        `  which serves prerendered ids from cache and notFound()s the rest.\n`
    );
    process.exit(1);
  }

  console.log(
    `✓ Static route check passed (${expected.length} routes prerendered, ` +
      `${INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS.length} intentionally dynamic, ` +
      `0 routes fallback:false).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
