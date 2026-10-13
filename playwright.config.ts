import { defineConfig, devices } from "@playwright/test";

// A production build under `next start`: dev-mode compilation makes timing assertions flaky.
// Workerd-only regressions are covered by cf-smoke.yml and uptime.yml. Port 3100 so a stray
// `next dev` is never reused.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Safe-area values only hold on a mobile viewport, so this spec runs only on ios-pwa.
const PWA_SPEC = /pwa-safe-area\.spec\.ts/;

// The WebKit pass runs only specs where the engine, viewport, or touch changes behavior.
const MOBILE_ENGINE_SPECS = /(home-no-scroll|dynamic-ui|search)\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL,
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

  webServer: {
    command: `pnpm run build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 360 * 1000,
  },
});
