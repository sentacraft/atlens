import type { MountSegment } from "./mount";

export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function buildLensListUrl(mount: MountSegment, locale: string): string {
  return `/api/lenses?mount=${mount}&locale=${locale}`;
}

export function buildSearchUrl(
  mount: MountSegment,
  locale: string,
  query: string,
  limit?: number,
): string {
  const params = new URLSearchParams({ mount, locale, q: query });
  if (limit) {
    params.set("limit", String(limit));
  }
  return `/api/lenses/search?${params.toString()}`;
}
