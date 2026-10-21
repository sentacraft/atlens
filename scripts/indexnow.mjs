#!/usr/bin/env node
// Submits the sitemap's URLs to IndexNow (shared by Bing, Yandex and others; Google does not use
// it). Used by .github/workflows/indexnow.yml after a production deploy.
//
// IndexNow asks for changed URLs only, so a deploy submits nothing unless its commit touched the
// lens data or the UI copy, which is what search results show. INDEXNOW_FORCE=1 submits anyway.

import { execFileSync } from "node:child_process";

// The key is public by design: search engines verify it at /<key>.txt.
const KEY = "e5998ce671331f5c3b7dc0fb0bb2399e";
const CONTENT_PATHS = [/^src\/data\//, /^src\/messages\//];

const rawBase = process.env.BASE_URL;
if (!rawBase) {
  console.error("✗ BASE_URL is required (e.g. https://atlens.app).");
  process.exit(1);
}
const BASE_URL = rawBase.replace(/\/$/, "");
const host = new URL(BASE_URL).host;

if (process.env.INDEXNOW_FORCE !== "1") {
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const content = changed.filter((file) => CONTENT_PATHS.some((path) => path.test(file)));
  if (content.length === 0) {
    console.log("No lens data or copy changed in this commit; nothing to submit.");
    process.exit(0);
  }
  console.log(`Content changed: ${content.join(", ")}`);
}

const sitemap = await fetch(`${BASE_URL}/sitemap.xml`);
if (!sitemap.ok) {
  console.error(`✗ sitemap.xml returned ${sitemap.status}`);
  process.exit(1);
}
const urlList = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urlList.length === 0) {
  console.error("✗ sitemap.xml lists no URLs");
  process.exit(1);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: KEY, keyLocation: `${BASE_URL}/${KEY}.txt`, urlList }),
});
// 200: accepted; 202: accepted, key check still pending (the first submission after the key ships).
if (response.status !== 200 && response.status !== 202) {
  console.error(`✗ IndexNow returned ${response.status}: ${await response.text()}`);
  process.exit(1);
}
console.log(`✓ Submitted ${urlList.length} URLs to IndexNow (${response.status}).`);
