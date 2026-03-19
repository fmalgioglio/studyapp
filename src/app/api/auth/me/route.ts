import { cookies } from "next/headers";

import { prisma } from "@/server/db/client";
import {
  buildLocalDevStudent,
  isLocalDevSession,
} from "@/server/auth/local-dev";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return apiError("Unauthorized", 401);
  }

  const session = verifySessionToken(token);
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        educationLevel: true,
        schoolProfile: true,
        subjectAffinity: true,
      },
    });

    if (!student) {
      if (isLocalDevSession(session)) {
        return apiSuccess(buildLocalDevStudent());
      }
      return apiError("Unauthorized", 401);
    }

    return apiSuccess(student);
  } catch (error) {
    if (isLocalDevSession(session)) {
      return apiSuccess(buildLocalDevStudent());
    }
    return apiError("Failed to load session profile", 500, getErrorDetails(error));
  }
}
