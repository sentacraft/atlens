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

  // Second invariant: no dynamic route may be `fallback: false`.
  //
  // On our deploy target (Cloudflare Workers via OpenNext), a route whose
  // prerender-manifest entry is `fallback: false` (which is exactly what
  // `export const dynamicParams = false` emits) gets a 404 on EVERY request —
  // even the ids that were prerendered and whose HTML is in the cache. This is
  // invisible to `next build` and `next start` (they serve such routes fine),
  // so it cannot be caught by typecheck/build/unit tests. PR #397 set
  // dynamicParams=false on [id]/[slug] and took down every detail page in
  // production; #398 reverted it. This gate encodes that invariant.
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
