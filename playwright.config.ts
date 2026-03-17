import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function resolveTcpDatabaseUrl() {
  const envPath = join(process.cwd(), ".env");
  const envText = readFileSync(envPath, "utf8");
  const match = envText.match(/^\s*DATABASE_URL\s*=\s*("?)(.+?)\1\s*$/m);
  const configuredUrl = match?.[2]?.trim();
  if (!configuredUrl) {
    throw new Error("DATABASE_URL is not defined in .env");
  }

  if (
    configuredUrl.startsWith("postgres://") ||
    configuredUrl.startsWith("postgresql://")
  ) {
    return configuredUrl;
  }

  if (!configuredUrl.startsWith("prisma+postgres://")) {
    throw new Error("Playwright requires a prisma+postgres or postgres DATABASE_URL");
  }

  const parsed = new URL(configuredUrl);
  const apiKey = parsed.searchParams.get("api_key");
  if (!apiKey) {
    throw new Error("Missing api_key in prisma+postgres DATABASE_URL");
  }

  const payload = JSON.parse(decodeBase64Url(apiKey)) as {
    databaseUrl?: string;
  };

  if (
    !payload.databaseUrl ||
    (!payload.databaseUrl.startsWith("postgres://") &&
      !payload.databaseUrl.startsWith("postgresql://"))
  ) {
    throw new Error("Unable to resolve TCP database URL for Playwright");
  }

  return payload.databaseUrl;
}

const tcpDatabaseUrl = resolveTcpDatabaseUrl();

export default defineConfig({
  testDir: "./qa/e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
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
    command: "npx next start --hostname 127.0.0.1 -p 3100",
    port: 3100,
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
