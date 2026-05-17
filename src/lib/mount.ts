import type { Mount } from "@/lib/types";

export type MountSegment = "x" | "gfx";

export function urlSegmentToMount(seg: string | undefined): Mount | null {
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
