"use client";

import useSWR from "swr";
import { useLocale } from "next-intl";
import type { Lens } from "@/lib/types";
import { mountToUrlSegment } from "@/lib/mount";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { jsonFetcher, buildSearchUrl } from "@/lib/api";

interface SearchResponse {
  results: Lens[];
  query: string;
}

const EMPTY_RESULTS: Lens[] = [];

export function useLensSearchApi(query: string, limit = 8) {
  const mount = useEffectiveMount();
  const locale = useLocale();
  const trimmed = query.trim();
  const url = trimmed ? buildSearchUrl(mountToUrlSegment(mount), locale, trimmed, limit) : null;
  const { data, error, isLoading } = useSWR<SearchResponse>(url, jsonFetcher, {
    keepPreviousData: true,
    dedupingInterval: 300,
  });

  return {
    results: data?.results ?? EMPTY_RESULTS,
    isLoading,
    error,
  };
}
