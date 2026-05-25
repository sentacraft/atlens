"use client";

import useSWR from "swr";
import { useLocale } from "next-intl";
import type { Lens, OpticalTrait } from "@/lib/types";
import { mountToUrlSegment } from "@/lib/mount";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { jsonFetcher, buildLensListUrl } from "@/lib/api";

interface LensListResponse {
  lenses: Lens[];
  total: number;
  brands: string[];
  availableOpticalTraits: OpticalTrait[];
}

const EMPTY_LENSES: Lens[] = [];
const EMPTY_BRANDS: string[] = [];
const EMPTY_TRAITS: OpticalTrait[] = [];

export function useLensesApi() {
  const mount = useEffectiveMount();
  const locale = useLocale();
  const url = buildLensListUrl(mountToUrlSegment(mount), locale);
  const { data, error, isLoading } = useSWR<LensListResponse>(url, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  return {
    lenses: data?.lenses ?? EMPTY_LENSES,
    brands: data?.brands ?? EMPTY_BRANDS,
    availableOpticalTraits: data?.availableOpticalTraits ?? EMPTY_TRAITS,
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}
