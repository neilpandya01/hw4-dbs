import { defineConfig, devices } from "@playwright/test";

// Keys come from .env.local (never committed). The setup and tests need the Clerk keys.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI): the variables must already be set.
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Signs in two test users and gets a Clerk testing token before any test runs.
  globalSetup: "./e2e/global-setup.ts",
  // One test, two users on one shared database: run it alone.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
