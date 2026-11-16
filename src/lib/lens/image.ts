import { LENS_IMAGE_HASHES, LENS_SUPPLEMENTAL_IMAGES } from "@/data/lens-images.generated";
import type { Lens } from "@/lib/types";

export const lensImageStyle = {
  objectPosition: "center",
} as const;

export function getLensImageUrl(id: string, alternateId?: string): string {
  if (alternateId !== undefined) {
    const key = `${id}/${alternateId}`;
    if (!Object.hasOwn(LENS_SUPPLEMENTAL_IMAGES, key)) {
      throw new Error(`Missing supplemental image resource: ${key}`);
    }
    return LENS_SUPPLEMENTAL_IMAGES[key];
  }
  const hash = Object.hasOwn(LENS_IMAGE_HASHES, id) ? LENS_IMAGE_HASHES[id] : undefined;
  return `/lenses/${id}.webp${hash ? `?v=${hash}` : ""}`;
}

export function getLensGalleryImageIds(lens: Pick<Lens, "images" | "alternateImages">): string[] {
  return lens.images?.filter(image => image.role === "product").map(image => image.id) ?? lens.alternateImages ?? [];
}
