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
