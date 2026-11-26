import { defineConfig, devices } from "@playwright/test";

import { readVerification, verificationEnvironment } from "./scripts/ci/preview-contract.mts";

const verification = process.env.PREVIEW_VERIFICATION_FILE
  ? readVerification(process.env.PREVIEW_VERIFICATION_FILE) : undefined;
const { remote, baseURL } = verificationEnvironment(verification);
const PORT = 3100;

// Safe-area values only hold on a mobile viewport, so this spec runs only on ios-pwa.
const PWA_SPEC = /pwa-safe-area\.spec\.ts/;

// The WebKit pass runs only specs where the engine, viewport, or touch changes behavior.
const MOBILE_ENGINE_SPECS = /(home-no-scroll|dynamic-ui|search|charts|lens-gallery)\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Bound request concurrency on the shared Preview resources.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL,
    serviceWorkers: remote ? "block" : "allow",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: PWA_SPEC,
    },
    {
      name: "android",
      use: { ...devices["Pixel 5"] },
      testIgnore: PWA_SPEC,
    },
    {
      name: "ios-safari",
      use: { ...devices["iPhone 15"] },
      testMatch: MOBILE_ENGINE_SPECS,
    },
    {
      name: "ios-safari-landscape",
      use: { ...devices["iPhone 15 landscape"] },
      testIgnore: PWA_SPEC,
    },
    {
      name: "ios-pwa",
      use: { ...devices["iPhone 15"] },
      testMatch: PWA_SPEC,
    },
  ],

  webServer: remote ? undefined : {
    command: `pnpm run build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 360 * 1000,
  },
});
