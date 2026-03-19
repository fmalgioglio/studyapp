import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/server/db/client";
import {
  getDevBootstrapEmail,
  getDevBootstrapPassword,
  isDevBootstrapEnabled,
} from "@/server/auth/dev-bootstrap";
import { hashPassword } from "@/server/auth/password";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";

const DEV_BOOTSTRAP_EMAIL = getDevBootstrapEmail();
const DEV_BOOTSTRAP_PASSWORD = getDevBootstrapPassword();
const DEV_BOOTSTRAP_FULL_NAME = "StudyApp Local Dev";
const DEV_BOOTSTRAP_WEEKLY_HOURS = 12;
const DEV_BOOTSTRAP_EDUCATION_LEVEL = "UNIVERSITY";
const DEV_BOOTSTRAP_SCHOOL_PROFILE = "UNIVERSITY";

function isSchemaMismatchError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientValidationError &&
    /unknown argument|educationlevel|schoolprofile/i.test(error.message)
  ) {
    return true;
  }

  if (
    error instanceof Error &&
    /unknown argument|educationlevel|schoolprofile|__turbopack__/i.test(
      error.message,
    )
  ) {
    return true;
  }

  return false;
}

async function upsertDevBootstrapStudent(options: {
  includePasswordHash: boolean;
  includeProfileFields: boolean;
  includeCoreFields: boolean;
}) {
  const { includePasswordHash, includeProfileFields, includeCoreFields } = options;
  const select = includeProfileFields
    ? {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        educationLevel: true,
        schoolProfile: true,
      }
    : includeCoreFields
      ? {
          id: true,
          email: true,
          fullName: true,
          weeklyHours: true,
        }
      : {
        id: true,
        email: true,
      };
  const coreFields = includeCoreFields
    ? {
        fullName: DEV_BOOTSTRAP_FULL_NAME,
        weeklyHours: DEV_BOOTSTRAP_WEEKLY_HOURS,
      }
    : {};

  return prisma.student.upsert({
    where: { email: DEV_BOOTSTRAP_EMAIL },
    update: {
      ...coreFields,
      ...(includeProfileFields
        ? {
            educationLevel: DEV_BOOTSTRAP_EDUCATION_LEVEL,
            schoolProfile: DEV_BOOTSTRAP_SCHOOL_PROFILE,
          }
        : {}),
      ...(includePasswordHash
        ? { passwordHash: hashPassword(DEV_BOOTSTRAP_PASSWORD) }
        : {}),
    },
    create: {
      email: DEV_BOOTSTRAP_EMAIL,
      ...coreFields,
      ...(includeProfileFields
        ? {
            educationLevel: DEV_BOOTSTRAP_EDUCATION_LEVEL,
            schoolProfile: DEV_BOOTSTRAP_SCHOOL_PROFILE,
          }
        : {}),
      ...(includePasswordHash
        ? { passwordHash: hashPassword(DEV_BOOTSTRAP_PASSWORD) }
        : {}),
    },
    select,
  });
}

export async function POST() {
  if (!isDevBootstrapEnabled()) {
    return apiError("Not found", 404);
  }

  try {
    let student;
    let usedCompatibilityFallback = false;

    const strategies = [
      { includePasswordHash: true, includeProfileFields: true, includeCoreFields: true },
      { includePasswordHash: true, includeProfileFields: false, includeCoreFields: true },
      { includePasswordHash: false, includeProfileFields: false, includeCoreFields: true },
      { includePasswordHash: false, includeProfileFields: false, includeCoreFields: false },
    ] as const;

    let lastError: unknown;

    for (const strategy of strategies) {
      try {
        student = await upsertDevBootstrapStudent(strategy);
        usedCompatibilityFallback =
          !strategy.includePasswordHash || !strategy.includeProfileFields;
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (!isSchemaMismatchError(error)) {
          throw error;
        }
      }
    }

    if (!student) {
      throw lastError ?? new Error("Local dev bootstrap fallback failed");
    }

    const token = createSessionToken(student.id, student.email);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return apiSuccess({
      ...student,
      ...(usedCompatibilityFallback
        ? {
            warning:
              "Local dev account created in compatibility mode. Restart local dev after regenerating Prisma if you want full local bootstrap support.",
          }
        : {}),
    });
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return apiError(
        "Local dev bootstrap is temporarily out of sync. Restart local dev and refresh the Prisma client.",
        500,
      );
    }

    return apiError(
      "Failed to start the local dev session",
      500,
      getErrorDetails(error),
    );
  }
}
