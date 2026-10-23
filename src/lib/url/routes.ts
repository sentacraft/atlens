import type { Mount } from "@/lib/types";
import { mountToUrlSegment } from "@/lib/mount";

// Locale-free paths: next-intl's <Link> and router add the locale prefix.

export const ASK_IRIS_PATH = "/askiris";
export const GET_APP_PATH = "/get";
export const RECENTLY_ADDED_PATH = "/recently-added";
export const ABOUT_PATH = "/about";
export const PROFILE_PATH = "/me";

// Admin pages sit outside [locale]; link to them with next/link, not next-intl.
export const ADMIN_PATH = "/admin";
export const ADMIN_ANALYTICS_PATH = "/admin/analytics";

export type AboutSection =
  | "background"
  | "ask-iris"
  | "data-accuracy"
  | "coverage"
  | "support"
  | "privacy"
  | "disclaimer"
  | "ack";

export function aboutPath(section?: AboutSection): string {
  return section ? `${ABOUT_PATH}#${section}` : ABOUT_PATH;
}

export function profilePath(section?: "favorites" | "gear"): string {
  return section ? `${PROFILE_PATH}#${section}` : PROFILE_PATH;
}

export function browsePath(mount: Mount): string {
  return `/lenses/${mountToUrlSegment(mount)}/browse`;
}

export function collectionsPath(mount: Mount): string {
  return `/lenses/${mountToUrlSegment(mount)}/collections`;
}

export function collectionPath(mount: Mount, slug: string): string {
  return `${collectionsPath(mount)}/${slug}`;
}

export function chartsPath(mount: Mount): string {
  return `/lenses/${mountToUrlSegment(mount)}/charts`;
}

export function chartPath(mount: Mount, chart: "timeline" | "weight" | "lineups"): string {
  return `${chartsPath(mount)}/${chart}`;
}

export function brandPath(mount: Mount, brand: string): string {
  return `/lenses/${mountToUrlSegment(mount)}/brands/${brand}`;
}

export function lensPath(lens: { mount: Mount; id: string }): string {
  return `/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`;
}
