import curatedData from "../data/curated-presets.json";
import { getAllLenses } from "./lens";
import type { Lens } from "./types";

export interface CuratedPreset {
  slug: string;
  titlePrimary: { zh: string; en: string };
  titleSecondary?: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  lensIds: string[];
}

export const curatedPresets: CuratedPreset[] = curatedData.presets;

export function getPresetBySlug(slug: string): CuratedPreset | undefined {
  return curatedPresets.find((p) => p.slug === slug);
}

export function getPresetLenses(preset: CuratedPreset, locale: string): Lens[] {
  return preset.lensIds
    .map((id) => getAllLenses(locale).find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}
