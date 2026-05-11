// Canonical declaration of which routes the build is expected to prerender
// as static HTML. Consumed by scripts/check-static-routes.mts to fail the
// build when reality diverges from this list.
//
// Why centralized: this list is the contract between page-level decisions
// (where generateStaticParams is declared) and build-time invariants (what
// the prerender manifest should contain). Putting it in a config file makes
// it discoverable, reviewable in isolation, and prevents the script from
// becoming a hidden source of truth.
//
// To make a route dynamic-by-design, remove it from STATIC_LOCALIZED_SUBPATHS /
// STATIC_NON_LOCALIZED_ROUTES and add its pattern to
// INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS as documentation.

import { routing } from "../i18n/routing.ts";
import xLensesData from "../data/lenses.json" with { type: "json" };
import gLensesData from "../data/lenses-g.json" with { type: "json" };

/**
 * Subpaths under /[locale] expected to be prerendered for every locale.
 * Empty string represents the locale root itself (/en, /zh).
 */
export const STATIC_LOCALIZED_SUBPATHS = [
  "",
  "about",
  "get",
  "lenses/x",
  "lenses/gfx",
] as const;

/**
 * Routes outside the [locale] tree expected to be prerendered.
 */
export const STATIC_NON_LOCALIZED_ROUTES = ["/offline"] as const;

/**
 * Route patterns left dynamic by design. Listed here (not asserted) so
 * reviewers can see at a glance which routes are intentional exceptions to
 * the otherwise-fully-static surface, and why.
 */
export const INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS = [
  {
    pattern: "/[locale]/lenses/[mount]/compare",
    reason:
      "Needs server-rendered metadata derived from ?ids=A,B,C searchParams. " +
      "Marked with `export const revalidate = 31536000` so each unique URL " +
      "is cached at the edge after first render.",
  },
  {
    pattern: "/api/feedback",
    reason: "API route that proxies to GitHub Issues. Not a renderable page.",
  },
] as const;

/**
 * Expand the configuration above into the full list of concrete URLs
 * expected as keys in .next/prerender-manifest.json's `routes` map after
 * `next build`.
 */
export function expectedStaticRoutes(): string[] {
  const routes: string[] = [];

  for (const locale of routing.locales) {
    for (const subpath of STATIC_LOCALIZED_SUBPATHS) {
      routes.push(subpath ? `/${locale}/${subpath}` : `/${locale}`);
    }
  }

  // Lens IDs are language-agnostic, so we enumerate once per mount.
  const xLensIds = (xLensesData as Array<{ id: string }>).map((l) => l.id);
  const gLensIds = (gLensesData as Array<{ id: string }>).map((l) => l.id);
  for (const locale of routing.locales) {
    for (const id of xLensIds) {
      routes.push(`/${locale}/lenses/x/${id}`);
    }
    for (const id of gLensIds) {
      routes.push(`/${locale}/lenses/gfx/${id}`);
    }
  }

  for (const route of STATIC_NON_LOCALIZED_ROUTES) {
    routes.push(route);
  }

  return routes;
}
