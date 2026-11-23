import { z } from "zod";
import { SITE } from "@/config/site";
import { getLensImageUrl, hasPrimaryLensImage } from "@/lib/lens/image";
import { LENS_IMAGE_ROLES, type Lens, type LensImageAsset, type LensImageRole, type Mount } from "@/lib/types";

const imageRoles = ["product", "mtf", "optical-construction"] as const;

/** The most images one call displays and sends to the model; the rest are listed, never dropped silently. */
export const MAX_IMAGES_PER_CALL = 24;

export const lensImageRequestsSchema = z.array(z.object({
  role: z.enum(imageRoles),
  imageRef: z.string().optional().describe("Exact ref from this lens's image list; use it to retrieve the same image in a follow-up."),
  focalLengthMm: z.number().positive().optional().describe("Chart test focal length, only if requested separately from the lens model or search."),
  apertureFNumber: z.number().positive().optional().describe("Chart test aperture, only if requested. Never copy the lens maximum aperture into this filter."),
})).max(3);

type ImageRequest = z.infer<typeof lensImageRequestsSchema>[number];

export interface LensDetailDisplayImage {
  lensRef: string;
  lensName: string;
  lensId: string;
  mount: Mount;
  imageRef: string;
  src: string;
  image: LensImageAsset;
  /** Position among the images shown in the assistant message, and its label in the reply's locale; absent in replies saved before numbering. */
  figure?: number;
  figureLabel?: string;
  /** Compatibility: replies saved before every requested image was displayed carry the lens's wider gallery here; groupLensImages still reads it. Remove with the lensDetails branch in LensImageGroup. */
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
  remaining = MAX_IMAGES_PER_CALL,
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
  const results = requests.map(({ role, imageRef, focalLengthMm, apertureFNumber }) => {
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
    const fallback = matches.length === 0 && unknown.length > 0;
    const eligible = fallback ? unknown : matches;
    const selected: string[] = [];
    const notShown: string[] = [];
    for (const candidate of eligible) {
      if (!displayImages.has(candidate.imageRef) && displayImages.size >= remaining) {
        notShown.push(candidate.imageRef);
        continue;
      }
      displayImages.set(candidate.imageRef, candidate);
      selected.push(candidate.imageRef);
    }
    return {
      role,
      ...(imageRef ? { imageRef } : {}),
      status: selected.length ? (fallback ? "conditions-unconfirmed" : "selected") : matches.length || fallback ? "limit" : candidates.length ? "no-match" : "unavailable",
      ...(selected.length ? { selected } : {}),
      ...(notShown.length ? { notShown } : {}),
      ...(unknown.length ? { unconfirmed: unknown.map((entry) => entry.imageRef) } : {}),
      ...(fallback && selected.length ? {
        note: "The attached charts have unconfirmed test conditions; do not present them as matching the requested conditions. Only describe curves if you received their pixels.",
      } : {}),
    };
  });

  const unserved = LENS_IMAGE_ROLES.filter((role) => !imageRoles.some((served) => served === role))
    .map((role) => ({ role, count: (lens.images ?? []).filter((asset) => asset.role === role).length }))
    .filter(({ count }) => count > 0);

  return {
    unservedImages: unserved as { role: LensImageRole; count: number }[],
    images: entries.map(({ imageRef, image }) => ({ imageRef, ...imageMetadata(image).metadata })),
    results,
    displayImages: [...displayImages.values()],
  };
}
