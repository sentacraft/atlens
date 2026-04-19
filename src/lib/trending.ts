import trendingData from "../data/trending.json";
import { allLenses } from "./lens";
import type { Lens } from "./types";

export interface TrendingPreset {
  slug: string;
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  lensIds: string[];
}

export const trendingPresets: TrendingPreset[] = trendingData.presets;

export function getPresetBySlug(slug: string): TrendingPreset | undefined {
  return trendingPresets.find((p) => p.slug === slug);
}

export function getPresetLenses(preset: TrendingPreset): Lens[] {
  return preset.lensIds
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}
