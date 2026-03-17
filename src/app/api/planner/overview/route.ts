import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { buildPlannerOverview } from "@/server/services/exam-plan-engine";
import type { EngineExamRecord } from "@/lib/exam-plan";

export const dynamic = "force-dynamic";

function normalizeEngineExams(exams: Array<Omit<EngineExamRecord, "workloadPayload"> & { workloadPayload: unknown }>): EngineExamRecord[] {
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

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        weeklyHours: true,
        subjectAffinity: true,
        exams: {
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

    if (!student) {
      return apiError("Unauthorized", 401);
    }

    const overview = buildPlannerOverview({
      exams: normalizeEngineExams(student.exams),
      weeklyHours: student.weeklyHours,
      subjectAffinity: student.subjectAffinity,
    });

    return apiSuccess(overview);
  } catch (error) {
    return apiError("Failed to load planner overview", 500, getErrorDetails(error));
  }
}
