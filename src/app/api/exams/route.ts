import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { isLocalDevSession } from "@/server/auth/local-dev";
import {
  createLocalDevExam,
  deleteLocalDevExam,
  listLocalDevExams,
  updateLocalDevExam,
} from "@/server/auth/local-dev-store";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  normalizeExamWorkloadPayload,
  normalizeOptionalExamWorkloadPayload,
} from "@/server/validation/exam-workload-normalization";
import {
  createExamSchema,
  updateExamSchema,
} from "@/server/validation/exam";

export const dynamic = "force-dynamic";

function parseExamDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

function getFlexibleTargetDate() {
  return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  if (isLocalDevSession(session)) {
    return apiSuccess(listLocalDevExams(session.email));
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
        assessmentType: true,
        status: true,
        importance: true,
        targetGrade: true,
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        completedAt: true,
        rescheduledFromDate: true,
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
        studyMaterials: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            origin: true,
            title: true,
            url: true,
            fileKey: true,
            fileName: true,
            verificationLevel: true,
            estimatedScopePages: true,
            licenseHint: true,
            availabilityHint: true,
          },
        },
      },
    });

    return apiSuccess(exams);
  } catch (error) {
    if (isLocalDevSession(session)) {
      return apiSuccess([]);
    }
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

  if (isLocalDevSession(session)) {
    const exam = createLocalDevExam(session.email, {
      subjectId: parsed.data.subjectId,
      title: parsed.data.title,
      examDate: (
        parsed.data.examDate
          ? parseExamDate(parsed.data.examDate)
          : getFlexibleTargetDate()
      ).toISOString(),
      assessmentType: parsed.data.assessmentType ?? "EXAM",
      status: parsed.data.status ?? "ACTIVE",
      importance: parsed.data.importance ?? "MEDIUM",
      targetGrade: parsed.data.targetGrade,
      workloadReadiness,
      materialType,
      workloadPayload,
    });

    if (!exam) {
      return apiError("Subject not found", 404);
    }

    return apiSuccess(exam, 201);
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
        examDate: parsed.data.examDate
          ? parseExamDate(parsed.data.examDate)
          : getFlexibleTargetDate(),
        assessmentType: parsed.data.assessmentType ?? "EXAM",
        status: parsed.data.status ?? "ACTIVE",
        importance: parsed.data.importance ?? "MEDIUM",
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
        assessmentType: true,
        status: true,
        importance: true,
        targetGrade: true,
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        completedAt: true,
        rescheduledFromDate: true,
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
        studyMaterials: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            origin: true,
            title: true,
            url: true,
            fileKey: true,
            fileName: true,
            verificationLevel: true,
            estimatedScopePages: true,
            licenseHint: true,
            availabilityHint: true,
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

  const parsed = updateExamSchema.safeParse(await request.json());

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

  if (isLocalDevSession(session)) {
    const localExamDate =
      "examDate" in parsed.data ? parsed.data.examDate : undefined;
    const normalizedLocalWorkloadPayload =
      "workloadPayload" in parsed.data
        ? normalizeOptionalExamWorkloadPayload(parsed.data.workloadPayload)
        : undefined;
    const localUpdate = updateLocalDevExam(session.email, examId, {
      title: "title" in parsed.data ? parsed.data.title : undefined,
      assessmentType:
        "assessmentType" in parsed.data ? parsed.data.assessmentType : undefined,
      importance: "importance" in parsed.data ? parsed.data.importance : undefined,
      targetGrade:
        "targetGrade" in parsed.data ? parsed.data.targetGrade ?? null : undefined,
      examDate:
        localExamDate !== undefined
          ? (
              localExamDate === null
                ? getFlexibleTargetDate()
                : parseExamDate(localExamDate)
            ).toISOString()
          : undefined,
      rescheduledFromDate:
        localExamDate !== undefined ? new Date().toISOString() : undefined,
      status: "status" in parsed.data ? parsed.data.status : undefined,
      completedAt:
        "status" in parsed.data
          ? parsed.data.status === "COMPLETED"
            ? new Date().toISOString()
            : null
          : undefined,
      workloadReadiness:
        "workloadReadiness" in parsed.data
          ? parsed.data.workloadReadiness ?? null
          : undefined,
      materialType:
        "materialType" in parsed.data ? parsed.data.materialType ?? null : undefined,
      workloadPayload:
        normalizedLocalWorkloadPayload === undefined
          ? undefined
          : normalizedLocalWorkloadPayload,
    });

    if (!localUpdate) {
      return apiError("Exam not found", 404);
    }

    return apiSuccess(localUpdate);
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

    const currentExam = await prisma.exam.findFirst({
      where: {
        id: examId,
        studentId: session.uid,
      },
      select: {
        id: true,
        examDate: true,
        status: true,
      },
    });

    if (!currentExam) {
      return apiError("Exam not found", 404);
    }

    const updateData: Prisma.ExamUpdateInput = {};

    if ("title" in parsed.data) {
      updateData.title = parsed.data.title;
    }

    if ("assessmentType" in parsed.data) {
      updateData.assessmentType = parsed.data.assessmentType;
    }

    if ("importance" in parsed.data) {
      updateData.importance = parsed.data.importance;
    }

    if ("targetGrade" in parsed.data) {
      updateData.targetGrade = parsed.data.targetGrade ?? null;
    }

    if ("examDate" in parsed.data) {
      const nextExamDate = parsed.data.examDate;
      if (nextExamDate === null) {
        updateData.examDate = getFlexibleTargetDate();
      } else if (typeof nextExamDate === "string") {
        updateData.examDate = parseExamDate(nextExamDate);
      }
      updateData.rescheduledFromDate = currentExam.examDate;
    }

    if ("status" in parsed.data) {
      updateData.status = parsed.data.status;
      updateData.completedAt =
        parsed.data.status === "COMPLETED" ? new Date() : null;
    }

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
        assessmentType: true,
        status: true,
        importance: true,
        targetGrade: true,
        workloadReadiness: true,
        materialType: true,
        workloadPayload: true,
        completedAt: true,
        rescheduledFromDate: true,
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
        studyMaterials: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            origin: true,
            title: true,
            url: true,
            fileKey: true,
            fileName: true,
            verificationLevel: true,
            estimatedScopePages: true,
            licenseHint: true,
            availabilityHint: true,
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

  if (isLocalDevSession(session)) {
    const deleted = deleteLocalDevExam(session.email, examId);
    if (!deleted) {
      return apiError("Exam not found", 404);
    }
    return apiSuccess({ id: examId });
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
