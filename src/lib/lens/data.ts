import lensesData from "@/data/lenses.json";
import gfxLensesData from "@/data/lenses-gfx.json";
import metaData from "@/data/meta.json";
import { lensCatalogSchema } from "@/lib/lens/schema";
import { resolveTranslations, type Lens, type LensCatalog, type Mount } from "@/lib/types";
import { MAX_COMPARE } from "@/lib/lens/lens";

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

export function getAllLenses(locale: string): Lens[] {
  return [...getLensesByMount("X", locale), ...getLensesByMount("G", locale)];
}

export function parseLensIds(ids: string | undefined, mount: Mount, locale: string): Lens[] {
  const pool = getLensesByMount(mount, locale);
  return (ids ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MAX_COMPARE)
    .map((id) => pool.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}
