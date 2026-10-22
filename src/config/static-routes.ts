// Checked by scripts/check-static-routes.mts: the build fails when the prerender manifest differs.

import { routing } from "../i18n/routing.ts";
import xLensesData from "../data/lenses.json" with { type: "json" };
import gLensesData from "../data/lenses-gfx.json" with { type: "json" };

// "" is the locale root.
export const STATIC_LOCALIZED_SUBPATHS = [
  "",
  "about",
  "recently-added",
  "get",
  "me",
  "lenses/x/browse",
  "lenses/gfx/browse",
] as const;

// Not asserted; listed so reviewers see the intentional exceptions.
export const INTENTIONALLY_DYNAMIC_ROUTE_PATTERNS = [
  {
    pattern: "/[locale]/lenses/[mount]/compare",
    reason:
      "Reads ?ids=A,B,C from searchParams to build server-rendered metadata, " +
      "which forces dynamic rendering. Served per request (no-store), not cached.",
  },
  {
    pattern: "/api/feedback",
    reason: "API route that proxies to GitHub Issues. Not a renderable page.",
  },
] as const;

export function expectedStaticRoutes(): string[] {
  const routes: string[] = [];

  for (const locale of routing.locales) {
    for (const subpath of STATIC_LOCALIZED_SUBPATHS) {
      routes.push(subpath ? `/${locale}/${subpath}` : `/${locale}`);
    }
  }

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

  return routes;
}
