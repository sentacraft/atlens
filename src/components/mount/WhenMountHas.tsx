"use client";

import type { ReactNode } from "react";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountHasCharts, mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";

const HAS: Record<"collections" | "charts", (mount: Mount) => boolean> = {
  collections: mountHasCollections,
  charts: mountHasCharts,
};

/** Renders its children only while the effective mount has the section. */
export default function WhenMountHas({ section, children }: { section: keyof typeof HAS; children: ReactNode }) {
  return HAS[section](useEffectiveMount()) ? children : null;
}
