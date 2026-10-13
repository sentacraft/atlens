import curatedData from "@/data/curated-presets.json";

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

