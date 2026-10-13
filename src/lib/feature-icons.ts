import { Aperture, ArrowLeftRight, ChevronsRightLeft, Droplets, Focus, Hand, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  af: Focus,
  ois: Hand,
  wr: Droplets,
  apertureRing: Aperture,
  powerZoom: Zap,
  internalFocusing: ArrowLeftRight,
  internalZoom: ChevronsRightLeft,
};
