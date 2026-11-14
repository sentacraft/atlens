import { LENS_IMAGE_HASHES } from "@/data/lens-images.generated";

export const lensImageStyle = {
  objectPosition: "center",
} as const;

export function getLensImageUrl(id: string): string {
  const hash = Object.hasOwn(LENS_IMAGE_HASHES, id) ? LENS_IMAGE_HASHES[id] : undefined;
  return `/lenses/${id}.webp${hash ? `?v=${hash}` : ""}`;
}
