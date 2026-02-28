import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { createExamSchema } from "@/server/validation/exam";

export const dynamic = "force-dynamic";

function parseExamDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  try {
    const exams = await prisma.exam.findMany({
      where: { studentId: session.uid },
      orderBy: { examDate: "asc" },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        title: true,
        examDate: true,
        targetGrade: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(exams);
  } catch (error) {
    return apiError("Failed to load exams", 500, getErrorDetails(error));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createExamSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const subject = await prisma.subject.findFirst({
      where: {
        id: parsed.data.subjectId,
        studentId: session.uid,
      },
      select: { id: true },
    });

    if (!subject) {
      return apiError("Subject not found", 404);
    }

    const exam = await prisma.exam.create({
      data: {
        studentId: session.uid,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        examDate: parseExamDate(parsed.data.examDate),
        targetGrade: parsed.data.targetGrade,
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        title: true,
        examDate: true,
        targetGrade: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(exam, 201);
  } catch (error) {
    return apiError("Failed to create exam", 500, getErrorDetails(error));
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const examId = url.searchParams.get("id");
  if (!examId) {
    return apiError("Exam id is required", 400);
  }

  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        studentId: session.uid,
      },
      select: { id: true },
    });

    if (!exam) {
      return apiError("Exam not found", 404);
    }

    await prisma.exam.delete({
      where: { id: examId },
    });

    return apiSuccess({ id: examId });
  } catch (error) {
    return apiError("Failed to delete exam", 500, getErrorDetails(error));
  }
}
