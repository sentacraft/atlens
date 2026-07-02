import type { Mount } from "@/lib/types";

export type MountSegment = "x" | "gfx";

// MOUNTS and the Mount type are defined in @/lib/types (single source);
// re-exported here so mount consumers can pull the list from the mount module.
export { MOUNTS } from "@/lib/types";

export function urlSegmentToMount(seg: string | null | undefined): Mount | null {
  if (seg === "x") {
    return "X";
  }
  if (seg === "gfx") {
    return "G";
  }
  return null;
}

export function mountToUrlSegment(mount: Mount): MountSegment {
  return mount === "X" ? "x" : "gfx";
}

// Per-mount feature availability. Collections exist only for X today: the
// collection filters in lib/collections.ts match X-mount lenses. When GFX
// collections are built (filters made mount-aware), flip `collections` to true
// here and the section tab, routes, and sitemap all light up together — no
// scattered mount checks to hunt down.
const MOUNT_CAPABILITIES: Record<Mount, { collections: boolean }> = {
  X: { collections: true },
  G: { collections: false },
};

export function mountHasCollections(mount: Mount): boolean {
  return MOUNT_CAPABILITIES[mount].collections;
}

/**
 * Public-facing mount label for SEO copy and structured data — distinct from
 * the URL segment (lowercase) and from the Mount type ("G" internally vs.
 * "GFX" in product literature). Used in meta descriptions, OG titles, and
 * JSON-LD additionalProperty values where "Fujifilm GFX-mount" reads naturally
 * but "Fujifilm G-mount" doesn't match how people actually search for it.
 */
export function mountSeoLabel(mount: Mount): "X" | "GFX" {
  return mount === "X" ? "X" : "GFX";
}
