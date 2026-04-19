// iOS PWA launch-screen configuration.
//
// Consumed by two separate places:
//   scripts/gen-icons.tsx  — generates the PNG files at build time
//   src/app/[locale]/layout.tsx — emits <link rel="apple-touch-startup-image">
//
// Keep this file framework-agnostic (no Next.js imports).

export interface SplashDevice {
  /** Short identifier used as the filename stem, e.g. "12" → splash-12-light.png */
  readonly label: string;
  /** Physical pixel width of the generated PNG. */
  readonly w: number;
  /** Physical pixel height of the generated PNG. */
  readonly h: number;
  /** CSS logical pixel width for the device-width media query. */
  readonly cssW: number;
  /** CSS logical pixel height for the device-height media query. */
  readonly cssH: number;
  /** Device pixel ratio for the -webkit-device-pixel-ratio media query. */
  readonly dpr: 2 | 3;
  /** Human-readable device names for documentation only. */
  readonly devices: string;
}

export const SPLASH_DEVICES: readonly SplashDevice[] = [
  { label: "se2",    w:  750, h: 1334, cssW: 375, cssH:  667, dpr: 2, devices: "iPhone SE 2/3, iPhone 8"              },
  { label: "8plus",  w: 1242, h: 2208, cssW: 414, cssH:  736, dpr: 3, devices: "iPhone 8 Plus"                        },
  { label: "x",      w: 1125, h: 2436, cssW: 375, cssH:  812, dpr: 3, devices: "iPhone X / XS / 11 Pro"               },
  { label: "xr",     w:  828, h: 1792, cssW: 414, cssH:  896, dpr: 2, devices: "iPhone XR / 11"                       },
  { label: "xsmax",  w: 1242, h: 2688, cssW: 414, cssH:  896, dpr: 3, devices: "iPhone XS Max / 11 Pro Max"           },
  { label: "12mini", w: 1080, h: 2340, cssW: 360, cssH:  780, dpr: 3, devices: "iPhone 12 mini / 13 mini"             },
  { label: "12",     w: 1170, h: 2532, cssW: 390, cssH:  844, dpr: 3, devices: "iPhone 12 / 13 / 14"                  },
  { label: "12max",  w: 1284, h: 2778, cssW: 428, cssH:  926, dpr: 3, devices: "iPhone 12/13 Pro Max / 14 Plus"       },
  { label: "14pro",  w: 1179, h: 2556, cssW: 393, cssH:  852, dpr: 3, devices: "iPhone 14 Pro / 15 / 15 Pro"          },
  { label: "15max",  w: 1290, h: 2796, cssW: 430, cssH:  932, dpr: 3, devices: "iPhone 14 Pro Max / 15 Plus / 15 Pro Max" },
] as const;

export type SplashScheme = "light" | "dark";

/** Background colours that match the app's primary backgrounds. */
export const SPLASH_BG: Record<SplashScheme, string> = {
  light: "#ffffff",
  dark:  "#0a0a0a",
};

/** Absolute URL path to a splash PNG for a given device label and color scheme. */
export function splashUrl(label: string, scheme: SplashScheme): string {
  return `/splash/splash-${label}-${scheme}.png`;
}

/**
 * CSS media query that selects the correct startup image for a device and
 * color scheme. iOS Safari matches on device-width + device-height + DPR +
 * orientation + prefers-color-scheme.
 */
export function splashMedia(device: SplashDevice, scheme: SplashScheme): string {
  return (
    `(device-width: ${device.cssW}px)` +
    ` and (device-height: ${device.cssH}px)` +
    ` and (-webkit-device-pixel-ratio: ${device.dpr})` +
    ` and (orientation: portrait)` +
    ` and (prefers-color-scheme: ${scheme})`
  );
}
