import "server-only";
import lensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";
import metaData from "@/data/meta.json";
import { lensCatalogSchema } from "@/lib/lens/schema";
import { resolveTranslations, type Lens, type LensCatalog, type Mount } from "@/lib/types";
import { MAX_COMPARE } from "@/lib/lens/lens";
import type { SearchableLens } from "@/lib/lens/search";

const xLenses: Lens[] = lensCatalogSchema.parse(lensesData) as LensCatalog;
const gfxLenses: Lens[] = lensCatalogSchema.parse(gfxLensesData) as LensCatalog;

export const meta = metaData;
export const brandCount = new Set(xLenses.map((l) => l.brand)).size;

const resolvedCache = new Map<string, Lens[]>();

function getResolved(base: Lens[], locale: string): Lens[] {
  const key = `${base === xLenses ? "X" : "G"}:${locale}`;
  let result = resolvedCache.get(key);
  if (!result) {
    result = base.map((l) => resolveTranslations(l, locale));
    resolvedCache.set(key, result);
  }
  return result;
}

export function getLensesByMount(mount: Mount, locale: string): Lens[] {
  if (mount === "X") {
    return getResolved(xLenses, locale);
  }
  if (mount === "G") {
    return getResolved(gfxLenses, locale);
  }
  throw new Error(`getLensesByMount: unsupported mount ${JSON.stringify(mount)}`);
}

/** How many lenses each brand has on a mount, keyed by brand slug. */
export function lensCountsByBrand(mount: Mount, locale: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lens of getLensesByMount(mount, locale)) {
    counts[lens.brand] = (counts[lens.brand] ?? 0) + 1;
  }
  return counts;
}

export function getAllLenses(locale: string): Lens[] {
  return [...getLensesByMount("X", locale), ...getLensesByMount("G", locale)];
}

export function parseLensIds(ids: string[], mount: Mount, locale: string): Lens[] {
  const pool = getLensesByMount(mount, locale);
  return ids
    .slice(0, MAX_COMPARE)
    .map((id) => pool.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}

const lensesById = new Map([...xLenses, ...gfxLenses].map((lens) => [lens.id, lens]));

/** The unresolved catalog record, so the name stays the same whatever the page locale. */
export function getLensById(id: string): Lens | undefined {
  return lensesById.get(id);
}

/** Just what search and the gear list need, so a page can ship every lens without full records. */
export type LensSummary = SearchableLens & Pick<Lens, "mount">;

export function getLensSummaries(locale: string): LensSummary[] {
  return getAllLenses(locale).map(
    ({ id, brand, series, model, mount, focalLengthMin, focalLengthMax, maxAperture }) => ({
      id,
      brand,
      series,
      model,
      mount,
      focalLengthMin,
      focalLengthMax,
      maxAperture,
    }),
  );
}
