import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { createStudentSchema } from "@/server/validation/student";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createStudentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const student = await prisma.student.upsert({
      where: { email: session.email },
      create: {
        email: session.email,
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours ?? 10,
      },
      update: {
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(student);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A student with this email already exists.", 409);
    }

    return apiError("Failed to create student", 500, getErrorDetails(error));
  }
}
