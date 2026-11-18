import type { Lens, LensImageAsset } from "@/lib/types";

export type TechnicalImageRole = Extract<LensImageAsset["role"], "mtf" | "optical-construction">;

export const TECHNICAL_IMAGE_PREVIEW_LIMIT = 2;

export function getTechnicalImages(lens: Pick<Lens, "images">, role: TechnicalImageRole) {
  return lens.images?.filter((image) => image.role === role) ?? [];
}

export function technicalImageFilter(preset: LensImageAsset["displayPreset"]) {
  if (preset === "invert-on-white") {return "invert(1) hue-rotate(180deg) saturate(0.6)";}
  if (preset === "white-background") {return "saturate(0.6)";}
  return undefined;
}
