import { z } from "zod";
import { getLensesByMount } from "@/lib/lens/data";
import { MOUNTS, type Lens, type Mount } from "@/lib/types";

/** Development-only request header the eval suite uses to give a turn a favorites list. */
export const EVAL_FAVORITES_HEADER = "x-askiris-eval-favorites";

/** Catalog ids from the eval header, or undefined when the header is absent or malformed. */
export function evalFavorites(header: string | null): string[] | undefined {
  if (!header) {
    return undefined;
  }
  try {
    return z.array(z.string()).parse(JSON.parse(header));
  } catch {
    return undefined;
  }
}

/** The favorites on `mount`, newest first as given, and how many sit on each other mount. */
export function favoritesOnMount(
  ids: string[],
  mount: Mount,
  locale: string,
): { lenses: Lens[]; otherMounts: { mount: Mount; count: number }[] } {
  const byMount = new Map(MOUNTS.map((m) => [m, new Map(getLensesByMount(m, locale).map((lens) => [lens.id, lens]))]));
  const lenses = ids.flatMap((id) => byMount.get(mount)?.get(id) ?? []);
  const otherMounts = MOUNTS.filter((m) => m !== mount)
    .map((m) => ({ mount: m, count: ids.filter((id) => byMount.get(m)?.has(id)).length }))
    .filter(({ count }) => count > 0);
  return { lenses, otherMounts };
}
