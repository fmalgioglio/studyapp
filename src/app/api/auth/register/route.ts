import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { registerSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const student = await prisma.student.create({
      data: {
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours ?? 10,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
      },
    });

    const token = createSessionToken(student.id, student.email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return apiSuccess(student, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("Email already registered", 409);
    }

    return apiError("Registration failed", 500, getErrorDetails(error));
  }
}
