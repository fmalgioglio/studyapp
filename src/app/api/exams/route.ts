import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  normalizeExamWorkloadPayload,
  normalizeOptionalExamWorkloadPayload,
} from "@/server/validation/exam-workload-normalization";
import {
  createExamSchema,
  updateExamWorkloadSchema,
} from "@/server/validation/exam";

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
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        planState: {
          select: {
            intensityPreference: true,
            summaryPreferencePct: true,
            paceLocked: true,
            lastRecommendationSnapshot: true,
            lastGeneratedAt: true,
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

    const workloadReadiness =
      parsed.data.workloadReadiness === "known" ||
      parsed.data.workloadReadiness === "unknown"
        ? parsed.data.workloadReadiness
        : null;
    const materialType =
      parsed.data.materialType === "book" ||
      parsed.data.materialType === "notes" ||
      parsed.data.materialType === "mixed"
        ? parsed.data.materialType
        : null;
    const workloadPayload = normalizeExamWorkloadPayload(parsed.data.workloadPayload);

    const exam = await prisma.exam.create({
      data: {
        studentId: session.uid,
        subjectId: parsed.data.subjectId,
        title: parsed.data.title,
        examDate: parseExamDate(parsed.data.examDate),
        targetGrade: parsed.data.targetGrade,
        workloadReadiness,
        materialType,
        workloadPayload: workloadPayload ?? Prisma.DbNull,
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        title: true,
        examDate: true,
        targetGrade: true,
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        planState: {
          select: {
            intensityPreference: true,
            summaryPreferencePct: true,
            paceLocked: true,
            lastRecommendationSnapshot: true,
            lastGeneratedAt: true,
          },
        },
      },
    });

    return apiSuccess(exam, 201);
  } catch (error) {
    return apiError("Failed to create exam", 500, getErrorDetails(error));
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const examId = url.searchParams.get("id");
  if (!examId) {
    return apiError("Exam id is required", 400);
  }

  const parsed = updateExamWorkloadSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return apiError("No workload fields provided", 400);
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

    const updateData: Prisma.ExamUpdateInput = {};

    if ("workloadReadiness" in parsed.data) {
      updateData.workloadReadiness = parsed.data.workloadReadiness ?? null;
    }

    if ("materialType" in parsed.data) {
      updateData.materialType = parsed.data.materialType ?? null;
    }

    if ("workloadPayload" in parsed.data) {
      const normalizedPayload = normalizeOptionalExamWorkloadPayload(
        parsed.data.workloadPayload,
      );
      if (normalizedPayload === undefined) {
        // no-op
      } else if (normalizedPayload === null) {
        updateData.workloadPayload = Prisma.DbNull;
      } else {
        updateData.workloadPayload = normalizedPayload;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError("No workload changes provided", 400);
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: updateData,
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        title: true,
        examDate: true,
        targetGrade: true,
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        planState: {
          select: {
            intensityPreference: true,
            summaryPreferencePct: true,
            paceLocked: true,
            lastRecommendationSnapshot: true,
            lastGeneratedAt: true,
          },
        },
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError("Failed to update exam", 500, getErrorDetails(error));
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
