"use client";

import { useEffectiveMount } from "@/hooks/useMountParam";
import type { Mount } from "@/lib/types";

const BRAND_NAME: Record<Mount, string> = { X: "X-Glass", G: "G-Glass" };

// Renders the current brand name based on effective mount preference.
// Used in the hero heading to reflect mount selection.
export default function HeroBrand() {
  const mount = useEffectiveMount();
  return <>{BRAND_NAME[mount]}</>;
}
