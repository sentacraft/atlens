#!/usr/bin/env node
// Synthetic check: probe EVERY URL in the sitemap and assert each renders.
//
// Decoupling: this script knows nothing about the app's route shapes. Its only
// contract is the sitemap protocol — `/sitemap.xml` with <loc> entries — which
// is a stable web standard the app already maintains for SEO. It treats the
// sitemap as an opaque list of URLs. (An earlier version classified URLs into
// route-template "buckets" via regex to test one-per-type; that re-encoded the
// app's routing taxonomy and broke silently when routes changed. A full sweep
// is empirically cheap — ~538 URLs in ~40s with a concurrency pool — so the
// classification was dropped: full coverage, zero coupling to route shapes.)
//
// Why a full sweep beats homepage-only: the #397 outage 404'd every detail page
// while the homepage stayed up. Sweeping the whole sitemap catches that on the
// first failing URL — and also catches a single broken page, which a
// one-per-type sample would miss.
//
// The sitemap emits absolute SITE.url (atlens.app) URLs, so we take only the
// pathname and re-base onto BASE_URL — the same script probes a local workerd
// (http://localhost:8787) in CI as well as prod.
//
// Used by:
//   - .github/workflows/synthetic.yml — cron, BASE_URL=https://atlens.app
//   - .github/workflows/cf-smoke.yml  — per-PR, BASE_URL=http://localhost:8787
//     against the real OpenNext/workerd runtime (the only gate that reproduces
//     CF behavior `next build`/`next start` cannot — see PR #397/#398).

const rawBase = process.env.BASE_URL;
if (!rawBase) {
  console.error(
    "✗ BASE_URL is required (e.g. https://atlens.app or http://localhost:8787).\n" +
      "  Refusing to guess a target — set BASE_URL explicitly."
  );
  process.exit(1);
}
const BASE_URL = rawBase.replace(/\/$/, "");
const TIMEOUT_MS = 15000;
const CONCURRENCY = 20;

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

// Every <loc> in the sitemap, re-based onto BASE_URL (pathname only).
async function sitemapPaths() {
  const { status, body } = await fetchText(`${BASE_URL}/sitemap.xml`);
  if (status !== 200) {
    throw new Error(`sitemap.xml returned ${status} — cannot derive targets`);
  }
  const paths = [];
  for (const m of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      paths.push(new URL(m[1]).pathname);
    } catch {
      // skip unparseable <loc>
    }
  }
  return paths;
}

// A page is healthy if it returns 200 with a fully-rendered document. Status
// alone catches the #397 class (hard 404s); the closing </html> guards against
// a 200 that streamed an empty/broken shell.
async function check(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const { status, body } = await fetchText(url);
    if (status !== 200) {
      return { path, reason: `status ${status}` };
    }
    if (!/<\/html>/i.test(body)) {
      return { path, reason: "no </html> — empty/broken render" };
    }
    return null;
  } catch (err) {
    return { path, reason: `fetch failed: ${err.message}` };
  }
}

async function runPool(items, concurrency, worker) {
  const queue = [...items];
  const failures = [];
  async function drain() {
    let item;
    while ((item = queue.pop()) !== undefined) {
      const failure = await worker(item);
      if (failure) {
        failures.push(failure);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, drain));
  return failures;
}

async function main() {
  console.log(`Synthetic check against ${BASE_URL}`);

  const paths = await sitemapPaths();
  if (paths.length === 0) {
    console.error("✗ Sitemap yielded no URLs — empty or unparseable.");
    process.exit(1);
  }
  console.log(`Probing ${paths.length} sitemap URLs (concurrency ${CONCURRENCY})…\n`);

  const startedAt = Date.now();
  const failures = await runPool(paths, CONCURRENCY, check);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (failures.length > 0) {
    console.error(`✗ ${failures.length}/${paths.length} URLs failed (${elapsed}s):`);
    for (const f of failures) {
      console.error(`    - ${f.path} — ${f.reason}`);
    }
    process.exit(1);
  }

  console.log(`✓ All ${paths.length} URLs healthy (${elapsed}s).`);
}

main().catch((err) => {
  console.error(`\n✗ Synthetic check crashed: ${err.message}`);
  process.exit(1);
});
