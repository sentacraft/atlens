"use client";

import useSWR from "swr";
import type { Lens } from "@/lib/types";
import type { MountSegment } from "@/lib/mount";
import { jsonFetcher, buildSearchUrl } from "@/lib/api";

interface SearchResponse {
  results: Lens[];
  query: string;
}

const EMPTY_RESULTS: Lens[] = [];

export function useLensSearchApi(
  mount: MountSegment,
  locale: string,
  query: string,
  limit = 8,
) {
  const trimmed = query.trim();
  const url = trimmed ? buildSearchUrl(mount, locale, trimmed, limit) : null;
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
