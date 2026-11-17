import { LENS_IMAGE_HASHES } from "@/data/lens-images.generated";
import { getPublicAssetUrl } from "@/lib/assets/url";
import type { Lens } from "@/lib/types";

export const lensImageStyle = {
  objectPosition: "center",
} as const;

export function getLensImageUrl(id: string, imageId?: string): string {
  if (imageId !== undefined) {
    return getPublicAssetUrl(`lens-images/${id}/${imageId}`);
  }
  const hash = Object.hasOwn(LENS_IMAGE_HASHES, id) ? LENS_IMAGE_HASHES[id] : undefined;
  return `/lenses/${id}.webp${hash ? `?v=${hash}` : ""}`;
}

export function getLensGalleryImageIds(lens: Pick<Lens, "images">): string[] {
  return lens.images?.filter(image => image.role === "product").map(image => image.id) ?? [];
}
