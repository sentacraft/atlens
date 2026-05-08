"use client";

import { useParams } from "next/navigation";
import { urlSegmentToMount } from "@/lib/mount";
import type { Mount } from "@/lib/types";

// Returns the current mount from URL params when inside /lenses/[mount]/...
// Returns null on all other pages (home, about, etc.)
export function useMountParam(): Mount | null {
  const params = useParams<{ mount?: string }>();
  return urlSegmentToMount(params.mount);
}
