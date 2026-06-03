import { useSyncExternalStore } from "react";

// Phone/tablet user-agent test — a DEVICE check, deliberately distinct from
// useBreakpoint, which is a VIEWPORT check. A desktop browser resized narrow is
// still a desktop here (no native app to hand off to); a tablet in a wide
// viewport is still mobile. Purchase links use this to decide whether to target
// the mobile H5 domains (native "open in app" handoff) or the desktop search
// sites.
//
// The hand-rolled regex is deliberate: all we need is one mobile/desktop boolean
// for a non-critical URL choice. If device classification ever gets more
// demanding (precise OS/device, or handling UA spoofing like iPadOS posing as
// macOS), reach for a maintained library (ua-parser-js) instead of growing this
// regex.
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

function getSnapshot(): boolean {
  return MOBILE_UA.test(navigator.userAgent);
}

// Desktop default on the server, so statically generated HTML carries desktop
// URLs; the client swaps to the real value post-hydration. Same
// useSyncExternalStore pattern as useCountryCode — keeps pages static (no
// dynamic SSR) without a hydration mismatch. Device class is stable within a
// session, so subscribe is a no-op.
function getServerSnapshot(): boolean {
  return false;
}

function subscribe(): () => void {
  return () => {};
}

export function useIsMobileDevice(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
