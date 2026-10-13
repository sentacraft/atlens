import { SITE } from "@/config/site";
import { SPEC_NA } from "@/lib/types";
import type { Lens, Mount } from "@/lib/types";
import { mountSeoLabel } from "@/lib/mount";
import { isZoom } from "@/lib/lens/lens";
import {
  lensDisplayName,
  weightDisplay,
  mfdHeroValue,
} from "@/lib/lens/format";

type T = (key: string, values?: Record<string, string | number>) => string;

// Leaves out focal length and aperture: the display name already carries them.
export function buildLensDescription(args: {
  lens: Lens;
  mount: Mount;
  brandName: string;
  t: T;
}): string {
  const { lens, mount, brandName, t } = args;
  const displayName = lensDisplayName(brandName, lens.series, lens.model);
  const mountLabel = mountSeoLabel(mount);
  const typeLabel = isZoom(lens) ? t("metaZoom") : t("metaPrime");

  const clauses: string[] = [];
  const weight = weightDisplay(lens.weightG, "g");
  if (weight) {
    clauses.push(t("metaWeight", { value: weight }));
  }
  if (lens.filterMm !== undefined && lens.filterMm !== SPEC_NA) {
    clauses.push(t("metaFilter", { size: lens.filterMm }));
  }
  const mfd = mfdHeroValue(lens.minFocusDistance);
  if (mfd) {
    clauses.push(t("metaMfd", { value: mfd }));
  }
  if (lens.maxMagnification?.value !== undefined) {
    clauses.push(t("metaMag", { value: lens.maxMagnification.value }));
  }
  if (lens.af && lens.focusMotor && lens.focusMotor !== SPEC_NA) {
    clauses.push(t("metaMotor", { label: lens.focusMotor }));
  }
  if (lens.wr === true) {
    clauses.push(t("metaWr"));
  } else if (lens.wr === "partial") {
    clauses.push(t("metaWrPartial"));
  }
  if (lens.ois) {
    clauses.push(t("metaOis"));
  }
  if (!lens.af) {
    clauses.push(t("metaMf"));
  }

  let description = t("metaDescPrefix", { name: displayName, mount: mountLabel, type: typeLabel });
  if (clauses.length > 0) {
    description += t("metaJoinSpace") + clauses.join(t("metaSep")) + t("metaPeriod");
  }
  return description;
}

type PropertyValue = {
  "@type": "PropertyValue";
  name: string;
  value: string | number;
  unitText?: string;
};

// No Offers: catalogue prices are informational, and a stale Offer in search results misleads.
export function buildLensProductSchema(args: {
  lens: Lens;
  mount: Mount;
  displayName: string;
  description: string;
  brandName: string;
  canonicalUrl: string;
}) {
  const { lens, mount, displayName, description, brandName, canonicalUrl } = args;
  const mountLabel = mountSeoLabel(mount);
  const props: PropertyValue[] = [];

  const focalRange = lens.focalLengthMin === lens.focalLengthMax
    ? `${lens.focalLengthMin}mm`
    : `${lens.focalLengthMin}-${lens.focalLengthMax}mm`;
  props.push({ "@type": "PropertyValue", name: "Focal length", value: focalRange });

  if (lens.maxAperture !== undefined) {
    const ap = Array.isArray(lens.maxAperture)
      ? `f/${lens.maxAperture[0]}-${lens.maxAperture[1]}`
      : `f/${lens.maxAperture}`;
    props.push({ "@type": "PropertyValue", name: "Max aperture", value: ap });
  }

  props.push({ "@type": "PropertyValue", name: "Mount", value: `Fujifilm ${mountLabel}` });

  if (lens.weightG !== undefined && !Array.isArray(lens.weightG)) {
    props.push({ "@type": "PropertyValue", name: "Weight", value: lens.weightG, unitText: "g" });
  }
  if (lens.filterMm !== undefined && lens.filterMm !== SPEC_NA) {
    props.push({ "@type": "PropertyValue", name: "Filter thread", value: lens.filterMm, unitText: "mm" });
  }
  if (lens.af && lens.focusMotor && lens.focusMotor !== SPEC_NA) {
    props.push({ "@type": "PropertyValue", name: "Focus motor", value: lens.focusMotor });
  }
  if (lens.ois) {
    props.push({ "@type": "PropertyValue", name: "Optical stabilization", value: "Yes" });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description,
    brand: { "@type": "Brand", name: brandName },
    image: `${SITE.url}/lenses/${lens.id}.webp`,
    category: "Camera Lens",
    sku: lens.id,
    url: canonicalUrl,
    additionalProperty: props,
  };
}

export function buildCollectionItemListSchema(args: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
}) {
  const { name, description, url, items } = args;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  };
}
