import { defineConfig, devices } from "@playwright/test";

import { resolveTcpDatabaseUrl } from "./playwright.shared";

const tcpDatabaseUrl = resolveTcpDatabaseUrl();

export default defineConfig({
  testDir: "./qa/visual",
  testMatch: "capture.spec.ts",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3200",
    viewport: { width: 1440, height: 960 },
    actionTimeout: 30_000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "npx next start --hostname 127.0.0.1 -p 3200",
    port: 3200,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "production",
      DATABASE_URL: tcpDatabaseUrl,
      PRISMA_FORCE_TCP_DATABASE_URL: "true",
      AUTH_SECRET: "studyapp-playwright-auth-secret",
      ALLOW_INSECURE_AUTH_COOKIES: "true",
    },
  },
});
