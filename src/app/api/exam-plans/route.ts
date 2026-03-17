import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { buildPlannerOverview } from "@/server/services/exam-plan-engine";
import { updateExamPlanSchema } from "@/server/validation/exam-plan";
import type { EngineExamRecord } from "@/lib/exam-plan";

export const dynamic = "force-dynamic";

function normalizeEngineExams(
  exams: Array<Omit<EngineExamRecord, "workloadPayload"> & { workloadPayload: unknown }>,
): EngineExamRecord[] {
  return exams.map((exam) => ({
    ...exam,
    workloadPayload:
      exam.workloadPayload &&
      typeof exam.workloadPayload === "object" &&
      !Array.isArray(exam.workloadPayload)
        ? (exam.workloadPayload as EngineExamRecord["workloadPayload"])
        : null,
  }));
}

async function readRecommendationForExam(sessionUid: string, examId?: string | null) {
  const student = await prisma.student.findUnique({
    where: { id: sessionUid },
    select: {
      weeklyHours: true,
      subjectAffinity: true,
      exams: {
        where: examId ? { id: examId, studentId: sessionUid } : { studentId: sessionUid },
        orderBy: { examDate: "asc" },
        select: {
          id: true,
          title: true,
          examDate: true,
          workloadReadiness: true,
          materialType: true,
          workloadPayload: true,
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
          studyLogs: {
            orderBy: { completedAt: "desc" },
            select: {
              minutesSpent: true,
              pagesCompleted: true,
              topic: true,
              completedAt: true,
            },
          },
        },
      },
    },
  });

  if (!student) return null;
  return buildPlannerOverview({
    exams: normalizeEngineExams(student.exams),
    weeklyHours: student.weeklyHours,
    subjectAffinity: student.subjectAffinity,
  });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId")?.trim();

  try {
    const overview = await readRecommendationForExam(session.uid, examId);
    if (!overview) {
      return apiError("Unauthorized", 401);
    }
    if (examId) {
      const recommendation = overview.examRecommendations.find(
        (entry) => entry.examId === examId,
      );
      if (!recommendation) {
        return apiError("Exam plan not found", 404);
      }
      return apiSuccess(recommendation);
    }
    return apiSuccess(overview.examRecommendations);
  } catch (error) {
    return apiError("Failed to load exam plan", 500, getErrorDetails(error));
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId")?.trim();
  if (!examId) {
    return apiError("examId is required", 400);
  }

  const parsed = updateExamPlanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        studentId: session.uid,
      },
      select: {
        id: true,
      },
    });

    if (!exam) {
      return apiError("Exam not found", 404);
    }

    await prisma.examPlanState.upsert({
      where: { examId },
      create: {
        examId,
        studentId: session.uid,
        intensityPreference: parsed.data.intensityPreference ?? "balanced",
        summaryPreferencePct: parsed.data.summaryPreferencePct ?? 30,
        paceLocked: parsed.data.paceLocked ?? false,
      },
      update: {
        intensityPreference: parsed.data.intensityPreference,
        summaryPreferencePct: parsed.data.summaryPreferencePct,
        paceLocked: parsed.data.paceLocked,
      },
    });

    const overview = await readRecommendationForExam(session.uid, examId);
    const recommendation = overview?.examRecommendations.find(
      (entry) => entry.examId === examId,
    );
    if (!recommendation) {
      return apiError("Exam plan not found", 404);
    }

    await prisma.examPlanState.update({
      where: { examId },
      data: {
        lastRecommendationSnapshot: recommendation,
        lastGeneratedAt: new Date(),
      },
    });

    return apiSuccess(recommendation);
  } catch (error) {
    return apiError("Failed to update exam plan", 500, getErrorDetails(error));
  }
}
