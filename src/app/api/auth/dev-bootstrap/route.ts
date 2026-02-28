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

const DEMO_EMAIL = process.env.DEV_BOOTSTRAP_EMAIL ?? "demo@studyapp.local";
const DEMO_PASSWORD = process.env.DEV_BOOTSTRAP_PASSWORD ?? "";
const DEMO_FULL_NAME = "StudyApp Demo";
const DEMO_WEEKLY_HOURS = 12;

async function upsertDemoStudent(includePasswordHash: boolean) {
  return prisma.student.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      fullName: DEMO_FULL_NAME,
      weeklyHours: DEMO_WEEKLY_HOURS,
      ...(includePasswordHash ? { passwordHash: hashPassword(DEMO_PASSWORD) } : {}),
    },
    create: {
      email: DEMO_EMAIL,
      fullName: DEMO_FULL_NAME,
      weeklyHours: DEMO_WEEKLY_HOURS,
      ...(includePasswordHash ? { passwordHash: hashPassword(DEMO_PASSWORD) } : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      weeklyHours: true,
    },
  });
}

export async function POST() {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_BOOTSTRAP === "true";

  if (!enabled) {
    return apiError("Not found", 404);
  }

  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    return apiError(
      "Dev bootstrap is enabled but DEV_BOOTSTRAP_PASSWORD is missing or too short.",
      500,
    );
  }

  try {
    let student;
    let usedPasswordHashFallback = false;

    try {
      student = await upsertDemoStudent(true);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2022"
      ) {
        usedPasswordHashFallback = true;
        student = await upsertDemoStudent(false);
      } else {
        throw error;
      }
    }

    const token = createSessionToken(student.id, student.email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return apiSuccess({
      ...student,
      ...(usedPasswordHashFallback
        ? {
            warning:
              "Demo account created without passwordHash due schema mismatch. Run prisma migrate dev to enable password login.",
          }
        : {}),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return apiError(
        "Database schema is out of sync. Run: npx prisma migrate dev && npx prisma generate",
        500,
        error.message,
      );
    }

    return apiError("Failed to bootstrap demo account", 500, getErrorDetails(error));
  }
}
