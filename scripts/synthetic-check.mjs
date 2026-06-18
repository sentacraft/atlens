#!/usr/bin/env node
// Synthetic check: hit one canary URL per route TEMPLATE and assert it renders.
//
// Why one-per-template (not just the homepage): the #397 outage 404'd every
// lens/collection detail page on Cloudflare while the homepage, browse, etc.
// stayed up. A homepage-only check would have reported all-green through the
// entire outage. So the canary set must cover one URL of every route shape.
//
// Why derive from the live sitemap: the drift-prone canaries (a lens id, a
// collection slug) change as the catalog grows. Picking them from
// /sitemap.xml at run time keeps the check self-healing instead of pinning
// ids that rot. Note the sitemap emits absolute SITE.url (atlens.app) URLs, so
// we take only the pathname and re-base it onto BASE_URL — that lets the same
// script probe a local workerd (http://localhost:8787) in CI as well as prod.
//
// Used by:
//   - .github/workflows/synthetic.yml — cron, BASE_URL=https://atlens.app
//   - .github/workflows/cf-smoke.yml  — per-PR, BASE_URL=http://localhost:8787
//     against the real OpenNext/workerd runtime (the only gate that reproduces
//     CF behavior `next build`/`next start` cannot — see PR #397/#398).

const BASE_URL = (process.env.BASE_URL ?? "https://atlens.app").replace(/\/$/, "");
const LOCALE = process.env.CANARY_LOCALE ?? "en";
const TIMEOUT_MS = Number(process.env.CANARY_TIMEOUT_MS ?? 15000);

// Classify a path into a route-template bucket. We want exactly one canary per
// bucket. Order matters: more specific patterns first.
function bucketOf(path) {
  if (path === `/${LOCALE}`) return "home";
  if (/^\/[^/]+\/lenses\/[^/]+\/browse$/.test(path)) return "browse";
  if (/^\/[^/]+\/lenses\/[^/]+\/compare$/.test(path)) return "compare";
  if (/^\/[^/]+\/lenses\/[^/]+\/collections$/.test(path)) return "collectionsIndex";
  if (/^\/[^/]+\/lenses\/[^/]+\/collections\/[^/]+$/.test(path)) return "collectionDetail";
  if (/^\/[^/]+\/lenses\/[^/]+\/[^/]+$/.test(path)) return "lensDetail";
  if (/^\/[^/]+\/about$/.test(path)) return "about";
  if (/^\/[^/]+\/recently-added$/.test(path)) return "recentlyAdded";
  if (/^\/[^/]+\/get$/.test(path)) return "get";
  return null;
}

async function fetchText(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ac.signal,
      headers: { "user-agent": "atlens-synthetic-check" },
    });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

// Pick the first sitemap path for each bucket, for the chosen locale only.
async function pickCanaries() {
  const { status, body } = await fetchText(`${BASE_URL}/sitemap.xml`);
  if (status !== 200) {
    throw new Error(`sitemap.xml returned ${status} — cannot derive canaries`);
  }
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const picked = new Map();
  for (const loc of locs) {
    let path;
    try {
      path = new URL(loc).pathname;
    } catch {
      continue;
    }
    if (!path.startsWith(`/${LOCALE}`) && path !== "/") continue;
    const bucket = bucketOf(path);
    if (bucket && !picked.has(bucket)) {
      picked.set(bucket, path);
    }
  }
  return picked;
}

// Per-bucket render sentinels beyond status 200. Detail pages emit JSON-LD
// structured data, so its absence on a 200 means the page rendered empty/broken.
function sentinelFor(bucket) {
  if (bucket === "lensDetail" || bucket === "collectionDetail") {
    return (body) => body.includes("application/ld+json");
  }
  return (body) => /<title[ >]/i.test(body);
}

async function main() {
  console.log(`Synthetic check against ${BASE_URL} (locale=${LOCALE})\n`);

  const canaries = await pickCanaries();
  if (canaries.size === 0) {
    console.error("✗ No canaries derived from sitemap — sitemap empty or unparseable.");
    process.exit(1);
  }

  const failures = [];
  for (const [bucket, path] of canaries) {
    const url = `${BASE_URL}${path}`;
    try {
      const { status, body } = await fetchText(url);
      const sentinelOk = sentinelFor(bucket)(body);
      const ok = status === 200 && sentinelOk;
      const reason = status !== 200 ? `status ${status}` : sentinelOk ? "" : "render sentinel missing";
      console.log(`${ok ? "✓" : "✗"} ${bucket.padEnd(17)} ${path}${reason ? `  (${reason})` : ""}`);
      if (!ok) failures.push({ bucket, url, reason });
    } catch (err) {
      console.log(`✗ ${bucket.padEnd(17)} ${path}  (fetch failed: ${err.message})`);
      failures.push({ bucket, url, reason: `fetch failed: ${err.message}` });
    }
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length}/${canaries.size} canaries failed:`);
    for (const f of failures) {
      console.error(`    - [${f.bucket}] ${f.url} — ${f.reason}`);
    }
    process.exit(1);
  }

  console.log(`\n✓ All ${canaries.size} canaries healthy.`);
}

main().catch((err) => {
  console.error(`\n✗ Synthetic check crashed: ${err.message}`);
  process.exit(1);
});
