import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  createSubjectSchema,
  subjectQuerySchema,
} from "@/server/validation/subject";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = subjectQuerySchema.safeParse({
    studentId: searchParams.get("studentId"),
  });

  if (!parsed.success) {
    return apiError(
      "Invalid query",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  const subjects = await prisma.subject.findMany({
    where: { studentId: parsed.data.studentId },
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
}

export async function POST(request: Request) {
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
        studentId: parsed.data.studentId,
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
