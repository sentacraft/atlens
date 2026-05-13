"use client";

import { Toaster } from "sonner";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function AppToaster() {
  const isDesktop = useBreakpoint("sm");

  // Sonner v2 has independent `offset` and `mobileOffset` props. It
  // detects mobile via internal media query and *swaps* to `mobileOffset`
  // when so. Setting only one reads as "use mine first, then fallback to
  // sonner's default on the other surface" — visually the toast looks
  // like it settles toward the wrong edge. Set both explicitly.
  //
  // Use the object form, not a bare string, so the value applies only to
  // the edge we care about. A bare string is applied to top/right/bottom/
  // left uniformly, and a 128px mobile-offset-left would compress the
  // toast's width down to a sliver in sonner's mobile stylesheet.
  return (
    <Toaster
      position={isDesktop ? "top-center" : "bottom-center"}
      // Desktop top-center: clear the fixed nav so the pill doesn't
      // straddle the nav-content boundary.
      offset={isDesktop
        ? { top: "calc(var(--nav-height) + 1rem)" }
        : { bottom: "calc(8rem + var(--safe-inset-bottom))" }}
      // Mobile bottom-center: pinned high enough to clear the compare
      // bar's resting position (~108px + safe-inset) with a small
      // buffer. Fixed value (no `--compare-bar-height` dependency) so
      // the toast stays still while the bar exits below it.
      mobileOffset={{ bottom: "calc(8rem + var(--safe-inset-bottom))" }}
    />
  );
}
