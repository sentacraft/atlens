import type { Mount } from "@/lib/types";

export type MountSegment = "x" | "gfx";

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

// Collections exist only for X: the collection filters match X-mount lenses.
const MOUNT_CAPABILITIES: Record<Mount, { collections: boolean; charts: boolean }> = {
  X: { collections: true, charts: true },
  G: { collections: false, charts: false },
};

export function mountHasCollections(mount: Mount): boolean {
  return MOUNT_CAPABILITIES[mount].collections;
}

export function mountHasCharts(mount: Mount): boolean {
  return MOUNT_CAPABILITIES[mount].charts;
}

// "GFX", not "G": it is what people search for.
export function mountSeoLabel(mount: Mount): "X" | "GFX" {
  return mount === "X" ? "X" : "GFX";
}
