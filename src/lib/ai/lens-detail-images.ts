import { z } from "zod";
import { SITE } from "@/config/site";
import { getLensImageUrl, hasPrimaryLensImage } from "@/lib/lens/image";
import type { Lens, LensImageAsset, Mount } from "@/lib/types";

const imageRoles = ["product", "mtf", "optical-construction"] as const;

export const lensDetailImagesSchema = z.array(z.object({
  role: z.enum(imageRoles),
  imageRef: z.string().optional().describe("Exact ref from this lens's image list; use it to retrieve the same image in a follow-up."),
  focalLengthMm: z.number().positive().optional().describe("The requested chart focal length, not inferred from the lens name."),
  apertureFNumber: z.number().positive().optional().describe("The requested chart aperture. Unknown conditions do not match."),
  read: z.boolean().optional().describe("Requested MTF charts and optical diagrams are read by default. Set false to show without reading; set true to read a product photo."),
})).max(3).optional();

type ImageRequest = NonNullable<z.infer<typeof lensDetailImagesSchema>>[number];

export interface LensDetailDisplayImage {
  lensRef: string;
  lensName: string;
  lensId: string;
  mount: Mount;
  imageRef: string;
  src: string;
  image: LensImageAsset;
  gallery?: LensDetailDisplayImage[];
}

function imageMetadata(asset: LensImageAsset) {
  const { id, ...metadata } = asset;
  return { id, metadata };
}

export function lensDetailImages(
  lens: Pick<Lens, "id" | "images" | "mount">,
  lensRef: string,
  lensName: string,
  requests: ImageRequest[] = [],
  remaining = 4,
) {
  const assets = (lens.images ?? []).filter((asset) => imageRoles.some((role) => role === asset.role));
  if (!assets.some((asset) => asset.role === "product") && hasPrimaryLensImage(lens.id)) {
    assets.unshift({ id: "primary", role: "product" });
  }
  const entries = assets.map((image) => ({
    lensRef,
    lensName,
    lensId: lens.id,
    mount: lens.mount,
    imageRef: `${lensRef}:image-${image.id}`,
    src: image.id === "primary" ? new URL(getLensImageUrl(lens.id), SITE.url).href : getLensImageUrl(lens.id, image.id),
    image,
  }));
  const displayImages = new Map<string, LensDetailDisplayImage>();
  const readRefs = new Set<string>();
  const results = requests.map(({ role, imageRef, focalLengthMm, apertureFNumber, read }) => {
    const readPixels = read ?? role !== "product";
    const candidates = entries.filter((entry) => entry.image.role === role && (!imageRef || entry.imageRef === imageRef));
    const conditions = (entry: LensDetailDisplayImage) => [
      focalLengthMm === undefined ? true : entry.image.focalLengthMm === undefined ? null : entry.image.focalLengthMm === focalLengthMm,
      apertureFNumber === undefined ? true : !entry.image.apertureFNumbers ? null : entry.image.apertureFNumbers.includes(apertureFNumber),
    ];
    const matches = candidates.filter((entry) => conditions(entry).every((condition) => condition === true));
    const unknown = candidates.filter((entry) => {
      const values = conditions(entry);
      return values.includes(null) && !values.includes(false);
    });
    const selected: string[] = [];
    for (const candidate of matches.slice(0, role === "mtf" ? 2 : 1)) {
      if (!displayImages.has(candidate.imageRef) && displayImages.size >= remaining) {continue;}
      const gallery = role === "product" && !readPixels && !imageRef && candidates.length > 1 ? candidates : undefined;
      displayImages.set(candidate.imageRef, { ...candidate, ...(gallery ? { gallery } : {}) });
      if (readPixels) {readRefs.add(candidate.imageRef);}
      selected.push(candidate.imageRef);
    }
    return {
      role,
      ...(imageRef ? { imageRef } : {}),
      status: selected.length ? "selected" : matches.length ? "limit" : unknown.length ? "conditions-unconfirmed" : candidates.length ? "no-match" : "unavailable",
      ...(selected.length ? { selected } : {}),
      ...(unknown.length ? { unconfirmed: unknown.map((entry) => entry.imageRef) } : {}),
    };
  });

  return {
    images: entries.map(({ imageRef, image }) => ({ imageRef, ...imageMetadata(image).metadata })),
    results,
    displayImages: [...displayImages.values()],
    readRefs: [...readRefs],
  };
}
