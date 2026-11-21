import type { LensDetailDisplayImage } from "@/lib/ai/lens-detail-images";

export function groupLensImages(entries: LensDetailDisplayImage[]) {
  const galleries = new Map<string, Map<string, LensDetailDisplayImage>>();
  for (const entry of entries) {
    const key = `${entry.mount}:${entry.lensId}:${entry.image.role}`;
    const gallery = galleries.get(key) ?? new Map<string, LensDetailDisplayImage>();
    galleries.set(key, gallery);
    for (const item of [entry, ...(entry.gallery ?? [])]) {
      if (item.lensId === entry.lensId && item.mount === entry.mount && item.image.role === entry.image.role && !gallery.has(item.imageRef)) {
        gallery.set(item.imageRef, item);
      }
    }
  }
  return Array.from(galleries.values(), (gallery) => [...gallery.values()]);
}
