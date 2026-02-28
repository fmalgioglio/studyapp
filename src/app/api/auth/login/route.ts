import { cookies } from "next/headers";

import { prisma } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { loginSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const student = await prisma.student.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        passwordHash: true,
      },
    });

    if (!student?.passwordHash) {
      return apiError("Invalid credentials", 401);
    }

    const valid = verifyPassword(parsed.data.password, student.passwordHash);
    if (!valid) {
      return apiError("Invalid credentials", 401);
    }

    const token = createSessionToken(student.id, student.email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return apiSuccess({
      id: student.id,
      email: student.email,
      fullName: student.fullName,
      weeklyHours: student.weeklyHours,
    });
  } catch (error) {
    return apiError("Login failed", 500, getErrorDetails(error));
  }
}
