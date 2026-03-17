import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { buildPlannerOverview } from "@/server/services/exam-plan-engine";
import { createExamStudyLogSchema } from "@/server/validation/exam-plan";
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

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createExamStudyLogSchema.safeParse(await request.json());
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
        id: parsed.data.examId,
        studentId: session.uid,
      },
      select: {
        id: true,
        studentId: true,
      },
    });

    if (!exam) {
      return apiError("Exam not found", 404);
    }

    const completedAt = parsed.data.completedAt
      ? new Date(parsed.data.completedAt)
      : new Date();

    const log = await prisma.examStudyLog.create({
      data: {
        studentId: session.uid,
        examId: parsed.data.examId,
        minutesSpent: parsed.data.minutesSpent,
        pagesCompleted: parsed.data.pagesCompleted ?? 0,
        topic: parsed.data.topic?.trim() || null,
        completedAt,
      },
      select: {
        id: true,
        examId: true,
        minutesSpent: true,
        pagesCompleted: true,
        topic: true,
        completedAt: true,
      },
    });

    const student = await prisma.student.findUnique({
      where: { id: session.uid },
      select: {
        weeklyHours: true,
        subjectAffinity: true,
        exams: {
          where: { id: parsed.data.examId },
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

    if (!student) {
      return apiError("Unauthorized", 401);
    }

    const overview = buildPlannerOverview({
      exams: normalizeEngineExams(student.exams),
      weeklyHours: student.weeklyHours,
      subjectAffinity: student.subjectAffinity,
    });
    const recommendation = overview.examRecommendations[0] ?? null;

    if (recommendation) {
      await prisma.examPlanState.upsert({
        where: { examId: parsed.data.examId },
        create: {
          examId: parsed.data.examId,
          studentId: session.uid,
          intensityPreference: "balanced",
          summaryPreferencePct: 30,
          paceLocked: false,
          lastRecommendationSnapshot: recommendation,
          lastGeneratedAt: new Date(),
        },
        update: {
          lastRecommendationSnapshot: recommendation,
          lastGeneratedAt: new Date(),
        },
      });
    }

    return apiSuccess({
      log,
      recommendation,
    }, 201);
  } catch (error) {
    return apiError("Failed to create exam study log", 500, getErrorDetails(error));
  }
}
