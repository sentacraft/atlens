"use client";

import { Toaster } from "sonner";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function AppToaster() {
  const isDesktop = useBreakpoint("sm");

  // Sonner v2 has independent `offset` and `mobileOffset` props. It
  // detects mobile via internal media query and *swaps* to `mobileOffset`
  // when so. Setting only `offset` reads as "use mine first, then
  // fallback to default mobileOffset of 16px on mobile" — visually that
  // looks like the toast settling down toward the bottom edge.
  // Set both explicitly so sonner has nothing to swap to.
  const desktopOffset = "calc(var(--nav-height) + 1rem)";
  // Mobile bottom-center: pinned high enough to clear the compare bar's
  // resting position (~108px content + safe-inset) plus a small buffer.
  // Fixed value (no `--compare-bar-height` dependency) keeps the toast
  // still while the bar exits below it independently.
  const mobileOffset = "calc(8rem + var(--safe-inset-bottom))";

  return (
    <Toaster
      position={isDesktop ? "top-center" : "bottom-center"}
      offset={isDesktop ? desktopOffset : mobileOffset}
      mobileOffset={mobileOffset}
      toastOptions={{
        className: "!rounded-full !px-5",
        classNames: {
          // Sonner's default action button is ~24px tall — well below
          // iOS HIG's touch target. Force a wider, taller pill so the
          // undo affordance stays usable with a thumb on mobile.
          actionButton:
            "!h-9 !px-3.5 !text-sm sm:!h-7 sm:!px-3 sm:!text-xs",
        },
      }}
    />
  );
}
