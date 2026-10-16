"use client";

import type { ReactNode } from "react";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountHasCollections } from "@/lib/mount";

/** Renders its children only while the effective mount has collections. */
export default function WhenMountHasCollections({ children }: { children: ReactNode }) {
  return mountHasCollections(useEffectiveMount()) ? children : null;
}
