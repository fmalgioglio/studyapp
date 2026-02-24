import { prisma } from "@/server/db/client";
import { apiError } from "@/server/http/response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      {
        status: "ok",
        db: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return apiError(
      "Health check failed",
      500,
      error instanceof Error ? error.message : "Unknown database error",
    );
  }
}
