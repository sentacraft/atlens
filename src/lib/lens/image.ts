import { LENS_IMAGE_HASHES } from "@/data/lens-images.generated";

export const lensImageStyle = {
  objectPosition: "center",
} as const;

export function getLensImageUrl(id: string, alternateId?: string): string {
  const imageId = alternateId ? `${id}/${alternateId}` : id;
  const hash = Object.hasOwn(LENS_IMAGE_HASHES, imageId) ? LENS_IMAGE_HASHES[imageId] : undefined;
  return `/lenses/${imageId}.webp${hash ? `?v=${hash}` : ""}`;
}
