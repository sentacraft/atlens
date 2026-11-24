import type { LensDetailDisplayImage } from "@/lib/ai/lens-detail-images";

export function groupLensImages(entries: LensDetailDisplayImage[]) {
  const galleries = new Map<string, Map<string, LensDetailDisplayImage>>();
  for (const entry of entries) {
    const key = `${entry.mount}:${entry.lensId}:${entry.image.role}`;
    const gallery = galleries.get(key) ?? new Map<string, LensDetailDisplayImage>();
    galleries.set(key, gallery);
    if (!gallery.has(entry.imageRef)) {gallery.set(entry.imageRef, entry);}
  }
  return Array.from(galleries.values(), (gallery) => [...gallery.values()]);
}
