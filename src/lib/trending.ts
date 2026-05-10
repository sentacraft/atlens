import trendingData from "../data/trending.json";
import { getAllLenses } from "./lens";
import type { Lens } from "./types";

export interface TrendingPreset {
  slug: string;
  titlePrimary: { zh: string; en: string };
  titleSecondary?: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  lensIds: string[];
}

export const trendingPresets: TrendingPreset[] = trendingData.presets;

export function getPresetBySlug(slug: string): TrendingPreset | undefined {
  return trendingPresets.find((p) => p.slug === slug);
}

export function getPresetLenses(preset: TrendingPreset, locale: string): Lens[] {
  return preset.lensIds
    .map((id) => getAllLenses(locale).find((l) => l.id === id))
    .filter((l): l is Lens => l !== undefined);
}
