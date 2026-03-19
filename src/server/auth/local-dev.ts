import type { PlannerOverview } from "@/lib/exam-plan";
import {
  getDevBootstrapEmail,
  isDevBootstrapEnabled,
} from "@/server/auth/dev-bootstrap";

const LOCAL_DEV_STUDENT_ID = "local-dev-student";
const LOCAL_DEV_FULL_NAME = "StudyApp Local Dev";
const LOCAL_DEV_WEEKLY_HOURS = 12;

type LocalDevSessionLike = {
  email: string;
  uid: string;
};

export function isLocalDevSession(session: LocalDevSessionLike | null | undefined) {
  if (!session || process.env.NODE_ENV === "production") {
    return false;
  }

  if (!isDevBootstrapEnabled()) {
    return false;
  }

  return session.email === getDevBootstrapEmail();
}

export function buildLocalDevStudent() {
  return {
    id: LOCAL_DEV_STUDENT_ID,
    email: getDevBootstrapEmail(),
    fullName: LOCAL_DEV_FULL_NAME,
    weeklyHours: LOCAL_DEV_WEEKLY_HOURS,
    educationLevel: "UNIVERSITY" as const,
    schoolProfile: "UNIVERSITY" as const,
    subjectAffinity: null,
    warning:
      "Local dev guest mode is active. Database-backed sync is temporarily unavailable while Prisma local sync is being restored.",
  };
}

export function buildLocalDevPlannerOverview(): PlannerOverview {
  return {
    summary: {
      totalExams: 0,
      activeTargets: 0,
      completedTargets: 0,
      weeklyMinutesBudget: LOCAL_DEV_WEEKLY_HOURS * 60,
      plannedWeeklyMinutes: 0,
      verifiedScopeCoveragePct: 0,
      averageCompletionPct: 0,
      averageConfidenceScore: 0,
      risk: "low",
      riskMessage:
        "Local dev guest mode is active. Restore Prisma local sync to load the full planner history.",
    },
    examRecommendations: [],
    todayFocus: [],
    weeklyBoard: [],
    lightGamification: {
      streakDays: 0,
      sessionsCompleted: 0,
      consistencyLabel: "Local dev mode",
      earnedFreeTimeHours: 0,
    },
  };
}
