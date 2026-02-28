import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { createSubjectSchema } from "@/server/validation/subject";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { studentId: session.uid },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(subjects);
  } catch (error) {
    return apiError("Failed to load subjects", 500, getErrorDetails(error));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createSubjectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        studentId: session.uid,
        name: parsed.data.name,
        color: parsed.data.color,
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(subject, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A subject with this name already exists for the student.", 409);
    }

    return apiError("Failed to create subject", 500, getErrorDetails(error));
  }
}
