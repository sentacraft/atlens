#!/usr/bin/env node
// CI gate: ensure routes that should be statically prerendered actually are.
//
// Motivation: in Next.js App Router, accessing request-time context
// (cookies(), headers(), getLocale()) anywhere up the layout tree silently
// forces every descendant route into dynamic rendering. The build doesn't
// fail — it just emits `ƒ Dynamic` instead of `○ Static` / `● SSG`. This
// regression is invisible until production CPU usage / TTFB suffers (or, on
// Cloudflare Workers, until the 10ms CPU limit causes 503s).
//
// This script reads .next/prerender-manifest.json after `next build` and
// compares it against the canonical expectation declared in
// src/config/static-routes.ts. Any expected static route that didn't get
// prerendered fails the build immediately.
//
// History: commit b20d263 ("fix(seo): move lang attr to <html> via
// getLocale() in root layout") unintentionally turned the entire [locale]
// tree dynamic and went unnoticed for weeks. This gate prevents that class
// of regression.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  expectedStaticRoutes,
  INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS,
} from "../src/config/static-routes.ts";

interface PrerenderManifest {
  routes: Record<string, unknown>;
  dynamicRoutes: Record<string, unknown>;
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

  console.log(
    `✓ Static route check passed (${expected.length} routes prerendered, ` +
      `${INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS.length} intentionally dynamic).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
