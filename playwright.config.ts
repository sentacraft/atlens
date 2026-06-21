import { defineConfig, devices } from "@playwright/test";

// E2E runs against a PRODUCTION build served by `next start`, never `next dev`.
// Rationale: dev-mode on-demand compilation and HMR make timing-sensitive
// assertions (animation, scroll, hydration) flaky, and dev output diverges from
// what ships. We deliberately do NOT use the Cloudflare/workerd `preview` path
// here: every page these tests touch renders without runtime CF bindings
// (search is client-side; only the untested /api/track beacon needs them), and
// the workerd-only regression class is already gated by cf-smoke.yml +
// uptime.yml, which sweep the whole sitemap on the real runtime.
//
// Dedicated port 3100 (not the dev server's 3000) so a stray `next dev` is never
// silently reused as the target. Override with PLAYWRIGHT_BASE_URL to point at
// an already-running server (e.g. a workerd preview) and skip the local build.
const PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// pwa-safe-area asserts mobile/standalone safe-area math (e.g. sticky `top`
// resolves to --safe-inset-top below the sm breakpoint). Those values only hold
// on a mobile viewport, so the spec runs ONLY on the ios-pwa project and is
// ignored everywhere else.
const PWA_SPEC = /pwa-safe-area\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Local runs default to many parallel workers all hitting one `next start`
  // server, which can momentarily starve timing-sensitive animation/scroll
  // assertions; 1 local retry absorbs those without masking real failures
  // (still surfaced as "flaky"). CI keeps workers=1 + 2 retries for a hard gate.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [
    // Desktop
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: PWA_SPEC,
    },
    // Android Chrome (Chromium engine)
    {
      name: "android",
      use: { ...devices["Pixel 5"] },
      testIgnore: PWA_SPEC,
    },
    // iOS Safari (WebKit engine — same engine as iOS Chrome due to Apple's policy)
    {
      name: "ios-safari",
      use: { ...devices["iPhone 15"] },
      testIgnore: PWA_SPEC,
    },
    // iOS landscape — catches layout issues in horizontal orientation
    {
      name: "ios-safari-landscape",
      use: { ...devices["iPhone 15 landscape"] },
      testIgnore: PWA_SPEC,
    },
    // Simulated PWA environment: iPhone 15 viewport with injected notch CSS variables.
    // Tests in pwa-safe-area.spec.ts override --safe-inset-* to verify that every
    // consumer of those variables correctly translates the values into layout offsets.
    {
      name: "ios-pwa",
      use: { ...devices["iPhone 15"] },
      testMatch: PWA_SPEC,
    },
  ],

  webServer: {
    // Full production build, then Next's Node production server. When
    // PLAYWRIGHT_BASE_URL targets an external server this still runs locally;
    // unset it (the default) for the standard build-and-serve flow.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 360 * 1000,
  },
});
