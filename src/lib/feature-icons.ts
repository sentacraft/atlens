/**
 * Canonical icon mapping for lens features.
 * Single source of truth — used by both the filter panel and share poster.
 */
import { Aperture, ArrowLeftRight, Droplets, Focus, Hand, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  af: Focus,
  ois: Hand,
  wr: Droplets,
  apertureRing: Aperture,
  powerZoom: Video,
  internalFocusing: ArrowLeftRight,
};
