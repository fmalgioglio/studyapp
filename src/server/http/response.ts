import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(
  error: string,
  status: number,
  details?: unknown,
  issues?: unknown,
) {
  return NextResponse.json(
    {
      error,
      ...(details !== undefined ? { details } : {}),
      ...(issues !== undefined ? { issues } : {}),
    },
    { status },
  );
}

export function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;
    const normalized = message.toLowerCase();

    if (normalized.includes("fetch failed")) {
      return "Database connection bridge is unreachable. Start `npx prisma dev` and ensure `.env` DATABASE_URL matches the active Prisma dev server.";
    }

    if (
      normalized.includes("__turbopack__") ||
      normalized.includes("unknown argument") ||
      normalized.includes("unknown field") ||
      normalized.includes("invalid invocation") ||
      normalized.includes("prisma") ||
      normalized.includes("validation error")
    ) {
      return "Local development state is out of sync. Restart the dev server and refresh the Prisma client before trying again.";
    }

    return message;
  }

  return "Unexpected server error";
}
