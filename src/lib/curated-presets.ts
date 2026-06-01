import curatedData from "../data/curated-presets.json";
import { getAllLenses } from "./lens-data";
import type { Lens } from "./types";

export interface CuratedPreset {
  slug: string;
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  lensIds: string[];
}

export const curatedPresets: CuratedPreset[] = curatedData.presets;

export function getPresetBySlug(slug: string): CuratedPreset | undefined {
  return curatedPresets.find((p) => p.slug === slug);
}

/**
 * Reverse lookup: find a curated preset whose `lensIds` exactly match the
 * given set of ids (order-insensitive). Lets the compare URL be a pure
 * `?ids=A,B,C` projection of compare state while the server still recognises
 * the comparison as a curated preset for SEO / share-poster metadata.
 *
 * If the user manually assembles a comparison whose ids happen to equal a
 * curated preset's, that comparison gets the preset's framing — that's a
 * bonus, not a collision: the lens set fully defines the comparison.
 */
export function findPresetByIds(ids: string[]): CuratedPreset | undefined {
  if (ids.length === 0) {
    return undefined;
  }
  const set = new Set(ids);
  if (set.size !== ids.length) {
    return undefined;
  }
  return curatedPresets.find(
    (p) => p.lensIds.length === set.size && p.lensIds.every((id) => set.has(id))
  );
}

export function getPresetLenses(preset: CuratedPreset, locale: string): Lens[] {
  return preset.lensIds
    .map((id) => getAllLenses(locale).find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}
