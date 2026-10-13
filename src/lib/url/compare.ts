import type { Mount } from "@/lib/types";
import { mountToUrlSegment } from "@/lib/mount";
import { firstSearchParam } from "@/lib/url/search-params";

export const COMPARE_IDS_PARAM = "ids";

export function readCompareIds(value: string | string[] | undefined): string[] {
  return (firstSearchParam(value) ?? "").split(",").filter(Boolean);
}

// Without `locale` for next-intl's router and <Link>, which add the prefix; with it for
// history.replaceState, which does not. Commas in `ids` stay unencoded.
export function buildComparePath(
  mount: Mount,
  ids: string[],
  locale?: string,
): string {
  const seg = mountToUrlSegment(mount);
  const qs = ids.length > 0 ? `?${COMPARE_IDS_PARAM}=${ids.join(",")}` : "";
  const prefix = locale ? `/${locale}` : "";
  return `${prefix}/lenses/${seg}/compare${qs}`;
}
