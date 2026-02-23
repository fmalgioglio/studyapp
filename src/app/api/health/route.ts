import { NextResponse } from "next/server";

import { prisma } from "@/server/db/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unknown database error";

    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        details,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
