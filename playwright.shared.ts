import { readFileSync } from "node:fs";
import { join } from "node:path";

export function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

export function resolveTcpDatabaseUrl() {
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
