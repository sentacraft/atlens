export type MountSegment = "x" | "gfx";

// Canonical list of all mounts, in display order — the single source both the
// `Mount` type and every mount-enumerating surface (sitemap, param validation)
// derive from, so adding a mount is a one-line change here.
export const MOUNTS = ["X", "G"] as const;
export type Mount = (typeof MOUNTS)[number];

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
