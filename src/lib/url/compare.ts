import type { Mount } from "@/lib/types";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * Single source of truth for the compare page URL shape.
 *
 * Two output forms exist because the URL crosses two routing layers with
 * opposite locale-prefix conventions:
 *
 *   - Omit `locale` → `/lenses/x/compare?ids=…`. For next-intl's router and
 *     `<Link>`, which auto-prefix `/[locale]`. Passing a pre-prefixed path
 *     would double up.
 *
 *   - Pass `locale` → `/en/lenses/x/compare?…`. For `window.history.replaceState`,
 *     which writes the path verbatim; omitting the prefix would silently
 *     drop `/[locale]` from the address bar.
 *
 * `ids` is the URL's single source of truth for compare state. The curated
 * preset a comparison may match is derived from `ids` (see `findPresetByIds`),
 * not carried as a separate URL param.
 *
 * The query string is assembled manually (not via URLSearchParams.toString())
 * so commas in `ids` stay unencoded (`A,B` rather than `A%2CB`). Commas are
 * valid query-string characters and the readable form matches what users
 * expect when copying or sharing the URL.
 */
export function buildComparePath(
  mount: Mount,
  ids: string[],
  locale?: string,
): string {
  const seg = mountToUrlSegment(mount);
  const qs = ids.length > 0 ? `?ids=${ids.join(",")}` : "";
  const prefix = locale ? `/${locale}` : "";
  return `${prefix}/lenses/${seg}/compare${qs}`;
}
