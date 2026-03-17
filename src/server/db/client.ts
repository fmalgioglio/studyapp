import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: InstanceType<typeof PrismaClient>;
  prismaUrl?: string;
  prismaMode?: "adapter" | "accelerate";
  pgPool?: Pool;
};

function readDatabaseUrlFromDotEnv() {
  try {
    const envPath = join(process.cwd(), ".env");
    const envText = readFileSync(envPath, "utf8");
    const match = envText.match(/^\s*DATABASE_URL\s*=\s*("?)(.+?)\1\s*$/m);
    if (!match?.[2]) {
      return null;
    }
    return match[2].trim();
  } catch {
    return null;
  }
}

function resolveDatabaseUrl() {
  const envValue = process.env.DATABASE_URL?.trim();
  if (!envValue) {
    return envValue;
  }

  if (
    process.env.PRISMA_FORCE_TCP_DATABASE_URL === "true" &&
    (envValue.startsWith("postgres://") || envValue.startsWith("postgresql://"))
  ) {
    return envValue;
  }

  // Recover from stale dev process state where DATABASE_URL was mutated at runtime.
  if (
    process.env.NODE_ENV !== "production" &&
    (envValue.startsWith("postgres://") || envValue.startsWith("postgresql://"))
  ) {
    const dotEnvValue = readDatabaseUrlFromDotEnv();
    if (
      dotEnvValue &&
      (dotEnvValue.startsWith("prisma+postgres://") || dotEnvValue.startsWith("prisma://"))
    ) {
      return dotEnvValue;
    }
  }

  return envValue;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function extractTcpUrlFromPrismaDevUrl(url: string) {
  if (!url.startsWith("prisma+postgres://")) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const apiKey = parsed.searchParams.get("api_key");
    if (!apiKey) {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(apiKey)) as {
      databaseUrl?: string;
    };

    if (
      payload.databaseUrl &&
      (payload.databaseUrl.startsWith("postgres://") ||
        payload.databaseUrl.startsWith("postgresql://"))
    ) {
      return payload.databaseUrl;
    }

    return null;
  } catch {
    return null;
  }
}

const configuredDatabaseUrl = resolveDatabaseUrl();

if (!configuredDatabaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const tcpDatabaseUrl =
  extractTcpUrlFromPrismaDevUrl(configuredDatabaseUrl) ??
  (configuredDatabaseUrl.startsWith("postgres://") ||
  configuredDatabaseUrl.startsWith("postgresql://")
    ? configuredDatabaseUrl
    : null);

const runtimeDatabaseUrl = tcpDatabaseUrl ?? configuredDatabaseUrl;
const runtimeMode = tcpDatabaseUrl ? "adapter" : "accelerate";

if (
  runtimeMode === "accelerate" &&
  !runtimeDatabaseUrl.startsWith("prisma://") &&
  !runtimeDatabaseUrl.startsWith("prisma+postgres://")
) {
  throw new Error(
    "DATABASE_URL must use prisma:// or prisma+postgres:// for this Prisma client runtime.",
  );
}

const shouldRecreateClient =
  !globalForPrisma.prisma ||
  globalForPrisma.prismaUrl !== runtimeDatabaseUrl ||
  globalForPrisma.prismaMode !== runtimeMode;

if (shouldRecreateClient) {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }

  if (globalForPrisma.pgPool) {
    void globalForPrisma.pgPool.end();
    globalForPrisma.pgPool = undefined;
  }

  if (runtimeMode === "adapter") {
    const pool = new Pool({ connectionString: runtimeDatabaseUrl });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
    globalForPrisma.pgPool = pool;
  } else {
    globalForPrisma.prisma = new PrismaClient({ accelerateUrl: runtimeDatabaseUrl });
  }

  globalForPrisma.prismaUrl = runtimeDatabaseUrl;
  globalForPrisma.prismaMode = runtimeMode;
}

const prismaClient = globalForPrisma.prisma;

if (!prismaClient) {
  throw new Error("Failed to initialize Prisma client.");
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = runtimeDatabaseUrl;
  globalForPrisma.prismaMode = runtimeMode;
}
