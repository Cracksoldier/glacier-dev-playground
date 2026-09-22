import { defineConfig, devices } from "@playwright/test";

const CRITICAL_JOURNEY = /critical-journey\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox and WebKit run the critical journey only. The rest of the suite
    // depends on Chromium-only APIs — chiefly `grantPermissions(["clipboard-*"])`,
    // which throws on both — so widening them would test the harness, not the
    // app. `critical-journey.spec.ts` avoids those APIs entirely.
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: CRITICAL_JOURNEY,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: CRITICAL_JOURNEY,
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
