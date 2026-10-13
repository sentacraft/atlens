#!/usr/bin/env node
// Checks prod serves SSG pages from the incremental cache: without the cache override every
// SSG page silently re-renders per request, which no build-time check can see.

const rawBase = process.env.BASE_URL;
if (!rawBase) {
  console.error("✗ BASE_URL is required (e.g. https://atlens.app). Refusing to guess.");
  process.exit(1);
}
const BASE_URL = rawBase.replace(/\/$/, "");
const TIMEOUT_MS = 15000;

const SSG_PATHS = ["/en/about", "/en/lenses/x/browse"];
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
