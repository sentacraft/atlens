import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { oneEachTemplate } from "../scripts/lib/route-templates.mjs";
import { findTextProblems, type TextProblem } from "./support/text-overflow";

// One page per route template and locale, so a new page type is checked the day it enters the
// sitemap; text widths that only fit Chinese, or only a wide screen, show up here. Tagged @text-fit:
// it runs weekly and on PRs labelled text-fit-check (.github/workflows/text-fit-check.yml), not on every PR.
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 375, height: 812 },
};
// The sitemap's compare pages are empty; a filled one has the most crowded text.
const EXTRA_PATHS = ["/en/lenses/x/compare?ids=fujifilm-xf-16mmf14-r-wr-x,sigma-contemporary-100-400mm-f5-63-dg-dn-os-x"];

// The lens card's compare chip is absolutely placed over its price row; the fix (in-flow chip) is
// the Active board card "镜头操作入口统一（对比 + 收藏）". Remove this once that lands.
const known = (problem: TextProblem) => problem.kind === "overlap" && [problem.text, problem.other].includes("Compare");

async function pagesToCheck(page: Page): Promise<string[]> {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
  return [...oneEachTemplate(paths, manifest), ...EXTRA_PATHS];
}

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`no text spills out of its box or over other text (${name})`, { tag: "@text-fit" }, async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await page.setViewportSize(viewport);
    const found: string[] = [];
    for (const path of await pagesToCheck(page)) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      for (const problem of (await page.evaluate(findTextProblems)).filter((p) => !known(p))) {
        found.push(`${path}: ${problem.kind} "${problem.text}"${problem.other ? ` / "${problem.other}"` : ""}`);
      }
    }
    expect([...new Set(found)]).toEqual([]);
  });
}
