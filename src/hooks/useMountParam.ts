"use client";

import { useParams } from "next/navigation";
import { urlSegmentToMount } from "@/lib/mount";
import { useMountPreference } from "@/context/MountPreferenceProvider";
import type { Mount } from "@/lib/types";

export function useMountParam(): Mount | null {
  const params = useParams<{ mount?: string }>();
  return urlSegmentToMount(params.mount);
}

export function useEffectiveMount(): Mount {
  const urlMount = useMountParam();
  const { preference } = useMountPreference();
  return urlMount ?? preference;
}
