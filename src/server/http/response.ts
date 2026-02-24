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
    return error.message;
  }

  return "Unexpected server error";
}
