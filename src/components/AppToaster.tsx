"use client";

import { Toaster } from "sonner";
import { useBreakpoint } from "@/hooks/useViewport";

export default function AppToaster() {
  const isDesktop = useBreakpoint("sm");

  // Set both offsets: sonner swaps to mobileOffset on mobile. Object form only: a bare string
  // applies to every edge and squeezes the mobile toast to a sliver.
  return (
    <Toaster
      position={isDesktop ? "top-center" : "bottom-center"}
      offset={isDesktop
        ? { top: "calc(var(--nav-height) + 1rem)" }
        : { bottom: "calc(8rem + var(--safe-inset-bottom))" }}
      // Fixed, not tied to --compare-bar-height, so the toast stays still while the bar exits.
      mobileOffset={{ bottom: "calc(8rem + var(--safe-inset-bottom))" }}
    />
  );
}
