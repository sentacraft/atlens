#!/usr/bin/env node
// Probes sitemap URLs, then a few routes the sitemap leaves out: read-only API routes, the
// per-request compare page and the Ask Iris page.
// Used by .github/workflows/uptime.yml (prod) and cf-smoke.yml (local workerd).
import { readFileSync } from "node:fs";

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
const MAX_FETCH_ATTEMPTS = 3;
const CONCURRENCY = 20;

// Unset probes the whole sitemap; a positive integer samples ~N URLs per run (the prod cron).
const sampleRaw = process.env.UPTIME_SAMPLE;
let sampleSize = null;
let runIndex = 0;
if (sampleRaw !== undefined) {
  sampleSize = Number(sampleRaw);
  if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
    console.error(`✗ UPTIME_SAMPLE must be a positive integer; got "${sampleRaw}".`);
    process.exit(1);
  }
  const idxRaw = process.env.UPTIME_RUN_INDEX;
  runIndex = Number(idxRaw);
  if (!Number.isInteger(runIndex) || runIndex < 0) {
    console.error(
      `✗ UPTIME_RUN_INDEX (rotation seed) must be a non-negative integer when ` +
        `UPTIME_SAMPLE is set; got "${idxRaw}". Pass \${{ github.run_number }}.`
    );
    process.exit(1);
  }
}

// A build's prerender manifest maps each page to its route template; one page per template and
// locale/mount stands in for the rest, which share its code and were already rendered at build time.
const manifestPath = process.env.UPTIME_PRERENDER_MANIFEST;

function oneEachTemplate(paths, manifest) {
  const seen = new Set();
  const picked = [];
  for (const path of paths.slice().sort()) {
    const template = manifest.routes[path]?.srcRoute;
    if (!template) {
      picked.push(path);
      continue;
    }
    const pathParts = path.split("/");
    const templateParts = template.split("/");
    const dynamic = templateParts.flatMap((part, i) => (part.startsWith("[") ? [i] : []));
    const last = templateParts.length - 1;
    const key = templateParts
      .map((part, i) => (part.startsWith("[") && !(i === last && dynamic.length > 1) ? pathParts[i] : part))
      .join("/");
    if (!seen.has(key)) {
      seen.add(key);
      picked.push(path);
    }
  }
  return picked;
}

function rotatingSample(paths) {
  const sorted = paths.slice().sort();
  const step = Math.ceil(sorted.length / sampleSize);
  const start = runIndex % step;
  const picked = [];
  for (let i = start; i < sorted.length; i += step) {
    picked.push(sorted[i]);
  }
  return picked;
}

async function fetchText(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: ac.signal,
        headers: { "user-agent": "atlens-uptime-check" },
      });
      const body = await res.text();

      if (attempt < MAX_FETCH_ATTEMPTS && (res.status === 408 || res.status === 429 || res.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
        continue;
      }
      return { status: res.status, body };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

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
    }
  }
  return paths;
}

// The closing </html> catches a 200 that streamed a broken shell.
async function check(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const { status, body } = await fetchText(url);
    if (status !== 200) {
      return { path, reason: `status ${status}` };
    }
    if (path.startsWith("/api/")) {
      JSON.parse(body);
    } else if (!/<\/html>/i.test(body)) {
      return { path, reason: "no </html> — empty/broken render" };
    }
    return null;
  } catch (err) {
    return { path, reason: `fetch failed: ${err.message}` };
  }
}

// Routes the sitemap leaves out. All are GETs without side effects, safe against production.
async function extraPaths() {
  const chatData = "/api/askiris/chat-data?locale=en";
  const paths = [chatData, "/api/feedback", "/api/auth/get-session", "/en/askiris"];
  try {
    const { lenses } = JSON.parse((await fetchText(`${BASE_URL}${chatData}`)).body);
    const ids = lenses.filter((lens) => lens.mount === "X").slice(0, 2).map((lens) => lens.id);
    paths.push(`/en/lenses/x/compare?ids=${ids.join(",")}`);
  } catch {
    // The chat-data probe itself reports the failure.
  }
  return paths;
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
  console.log(`Uptime check against ${BASE_URL}`);

  const paths = await sitemapPaths();
  if (paths.length === 0) {
    console.error("✗ Sitemap yielded no URLs — empty or unparseable.");
    process.exit(1);
  }

  let targets = paths;
  if (manifestPath) {
    targets = oneEachTemplate(paths, JSON.parse(readFileSync(manifestPath, "utf8")));
    console.log(`Probing ${targets.length} of ${paths.length} URLs, one per route template (concurrency ${CONCURRENCY})…\n`);
  } else if (sampleSize !== null && sampleSize < paths.length) {
    targets = rotatingSample(paths);
    console.log(
      `Sampling ${targets.length} of ${paths.length} URLs ` +
        `(deterministic rotation, run ${runIndex}, concurrency ${CONCURRENCY})…\n`
    );
  } else {
    console.log(`Probing all ${paths.length} sitemap URLs (concurrency ${CONCURRENCY})…\n`);
  }

  targets = [...targets, ...(await extraPaths())];
  const startedAt = Date.now();
  const failures = await runPool(targets, CONCURRENCY, check);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (failures.length > 0) {
    console.error(`✗ ${failures.length}/${targets.length} URLs failed (${elapsed}s):`);
    for (const f of failures) {
      console.error(`    - ${f.path} — ${f.reason}`);
    }
    process.exit(1);
  }

  console.log(`✓ All ${targets.length} URLs healthy (${elapsed}s).`);
}

main().catch((err) => {
  console.error(`\n✗ Uptime check crashed: ${err.message}`);
  process.exit(1);
});
