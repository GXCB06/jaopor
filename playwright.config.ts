import { defineConfig, devices } from "@playwright/test";

// End-to-end checks (Phase 1b). Signed-out flows only: sign-in is Google / GitHub OAuth, which a
// test can't complete. Uses the installed Chrome (no browser download).
//
//   npm run test:e2e                                        → local dev server (started if needed)
//   E2E_BASE_URL=https://jaopor.vercel.app npm run test:e2e → production, read-only page loads
//
// The local server needs SUPABASE_SECRET_KEY in .env.local for builder profiles (/u/…).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // The dev server compiles each route on first visit: keep local runs gentle.
  workers: process.env.E2E_BASE_URL ? undefined : 2,
  retries: process.env.E2E_BASE_URL ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-375",
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
