#!/usr/bin/env node
// Guards that the CF runtime actually SERVES SSG pages from the incremental
// cache instead of re-rendering them on every request (edge-SSR).
//
// Why this can't be a build-time check: Next's build classification (○/● in the
// build log) and the check-static-routes gate only see the prerender manifest.
// They cannot see whether the deployed Worker HONORS it. PR #400 wired a
// static-assets incremental cache; without that override the default is a no-op
// "dummy" cache that always misses, so every "SSG" page silently degrades to an
// on-demand edge-SSR render — functionally identical output, but full CPU/cost
// per request. This is the runtime gap the build gate is blind to.
//
// Runs against PROD, because only prod exercises the full chain (build +
// `populateCache remote` + deploy). The deterministic signal (verified on prod):
//   - an SSG page returns `x-nextjs-cache: HIT` (served from the cache);
//   - the dynamic compare page returns `cache-control: …no-store` and no HIT.
//
// The SSG/SSR split is declared in src/config/static-routes.ts
// (expectedStaticRoutes vs INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS). These probes
// use stable structural URLs from each side — not drift-prone lens ids.

const rawBase = process.env.BASE_URL;
if (!rawBase) {
  console.error("✗ BASE_URL is required (e.g. https://atlens.app). Refusing to guess.");
  process.exit(1);
}
const BASE_URL = rawBase.replace(/\/$/, "");
const TIMEOUT_MS = 15000;

// SSG pages: must be served from the incremental cache. Stable structural routes
// (not lens ids), so this never goes stale.
const SSG_PATHS = ["/en/about", "/en/lenses/x/browse"];
// The one dynamic page: reads ?ids= from searchParams, so it's no-store SSR.
const SSR_PATH = "/en/lenses/x/compare";

async function head(path) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      redirect: "follow",
      signal: ac.signal,
      headers: { "user-agent": "atlens-cache-check" },
    });
    return {
      status: res.status,
      cache: (res.headers.get("x-nextjs-cache") ?? "").toUpperCase(),
      cacheControl: (res.headers.get("cache-control") ?? "").toLowerCase(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`Cache-behavior check against ${BASE_URL}\n`);
  const failures = [];

  for (const path of SSG_PATHS) {
    const { status, cache } = await head(path);
    // HIT or STALE both mean "served from the cache"; MISS / "" / DYNAMIC do not.
    const servedFromCache = cache === "HIT" || cache === "STALE";
    const ok = status === 200 && servedFromCache;
    console.log(`${ok ? "✓" : "✗"} SSG  ${path}  (status ${status}, x-nextjs-cache: ${cache || "<none>"})`);
    if (!ok) {
      failures.push(
        `${path}: expected 200 + x-nextjs-cache HIT/STALE, got ${status} / "${cache || "<none>"}". ` +
          `SSG may be degrading to edge-SSR — check the incrementalCache override in open-next.config.ts and populateCache.`
      );
    }
  }

  const { cache, cacheControl } = await head(SSR_PATH);
  const isDynamic = cache !== "HIT" && cache !== "STALE" && cacheControl.includes("no-store");
  console.log(`${isDynamic ? "✓" : "✗"} SSR  ${SSR_PATH}  (x-nextjs-cache: ${cache || "<none>"}, cache-control: ${cacheControl || "<none>"})`);
  if (!isDynamic) {
    failures.push(
      `${SSR_PATH}: expected dynamic (no-store, no cache HIT), got x-nextjs-cache "${cache || "<none>"}" / ` +
        `cache-control "${cacheControl || "<none>"}". A dynamic page being cached would serve stale compare results.`
    );
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} cache-behavior assertion(s) failed:`);
    for (const f of failures) {
      console.error(`    - ${f}`);
    }
    process.exit(1);
  }
  console.log(`\n✓ Cache behavior correct: SSG served from cache, compare dynamic.`);
}

main().catch((err) => {
  console.error(`\n✗ Cache-behavior check crashed: ${err.message}`);
  process.exit(1);
});
