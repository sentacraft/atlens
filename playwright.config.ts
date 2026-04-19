import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    // Desktop
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Android Chrome (Chromium engine)
    {
      name: "android",
      use: { ...devices["Pixel 5"] },
    },
    // iOS Safari (WebKit engine — same engine as iOS Chrome due to Apple's policy)
    {
      name: "ios-safari",
      use: { ...devices["iPhone 15"] },
    },
    // iOS landscape — catches layout issues in horizontal orientation
    {
      name: "ios-safari-landscape",
      use: { ...devices["iPhone 15 landscape"] },
    },
    // Simulated PWA environment: iPhone 15 viewport with injected notch CSS variables.
    // Tests in pwa-safe-area.spec.ts override --safe-inset-* to verify that every
    // consumer of those variables correctly translates the values into layout offsets.
    {
      name: "ios-pwa",
      use: { ...devices["iPhone 15"] },
      testMatch: /pwa-safe-area\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
