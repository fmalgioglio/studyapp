import {
  getSubjectAffinityAdjustment,
  getSubjectAffinityExplanation,
  getSubjectAffinityFactors,
  normalizeSubjectAffinity,
} from "@/lib/subject-affinity";
import type {
  EngineExamRecord,
  ExamPaceRecommendation,
  ExamPlanAdjustment,
  ExamPlanIntensityPreference,
  ExamPlanningConfidence,
  ExamPlanningRisk,
  ExamPlanningScopeSource,
  ExamPlanningUrgency,
  PlannerBoardDay,
  PlannerOverview,
} from "@/lib/exam-plan";

const DAY_MS = 24 * 60 * 60 * 1000;

type SubjectPace = {
  pagesPerHour: number;
  complexity: number;
};

const SUBJECT_PACE_MAP: Record<string, SubjectPace> = {
  math: { pagesPerHour: 8, complexity: 1.45 },
  physics: { pagesPerHour: 8.5, complexity: 1.4 },
  chemistry: { pagesPerHour: 9, complexity: 1.35 },
  law: { pagesPerHour: 10, complexity: 1.3 },
  biology: { pagesPerHour: 11, complexity: 1.2 },
  history: { pagesPerHour: 12, complexity: 1.1 },
  literature: { pagesPerHour: 13, complexity: 1.0 },
  general: { pagesPerHour: 11, complexity: 1.15 },
};

const APPROXIMATE_SCOPE_FACTORS = {
  pages: 1,
  slides: 2,
  handouts: 12,
  items: 8,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePositiveInt(value: number | undefined | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}

function daysUntil(dateIso: string, now: Date) {
  const diff = Math.ceil((new Date(dateIso).getTime() - now.getTime()) / DAY_MS);
  return Math.max(diff, 1);
}

function inferSubjectPace(subjectName: string): SubjectPace {
  const normalized = subjectName.toLowerCase();
  const key = Object.keys(SUBJECT_PACE_MAP).find((candidate) =>
    normalized.includes(candidate),
  );
  return key ? SUBJECT_PACE_MAP[key] : SUBJECT_PACE_MAP.general;
}

function inferFallbackScopePages(examTitle: string, subjectName: string) {
  const subjectPace = inferSubjectPace(subjectName);
  const title = examTitle.toLowerCase();
  const base = 200 * subjectPace.complexity;
  const intensityBonus =
    (title.includes("final") ? 45 : 0) +
    (title.includes("orale") ? 35 : 0) +
    (title.includes("advanced") ? 40 : 0) +
    (title.includes("midterm") ? -15 : 0);
  return Math.round(clamp(base + intensityBonus, 110, 680));
}

function resolveApproximateScopePages(exam: EngineExamRecord) {
  const payload = exam.workloadPayload;
  const approximateScopeValue = normalizePositiveInt(payload?.approximateScopeValue);
  const approximateScopeUnit = payload?.approximateScopeUnit;
  if (!approximateScopeValue || !approximateScopeUnit) {
    return undefined;
  }

  const factor = APPROXIMATE_SCOPE_FACTORS[approximateScopeUnit];
  const basePages = Math.round(approximateScopeValue * factor);

  if (payload?.materialShape === "slides") {
    return Math.round(basePages * 0.9);
  }
  if (payload?.materialShape === "mini_handout") {
    return Math.round(basePages * 0.85);
  }
  if (payload?.materialShape === "handout_set") {
    return Math.round(basePages * 1.05);
  }
  if (payload?.materialShape === "personal_notes") {
    return Math.round(basePages * 1.1);
  }

  return basePages;
}

function resolveBookRangePages(exam: EngineExamRecord) {
  const payload = exam.workloadPayload;
  if (payload?.bookCoverageMode !== "page_range") {
    return undefined;
  }

  const start = normalizePositiveInt(payload.bookPageStart);
  const end = normalizePositiveInt(payload.bookPageEnd);
  if (!start || !end || end < start) {
    return undefined;
  }

  return end - start + 1;
}

function resolveExamScope(exam: EngineExamRecord): {
  pages: number;
  source: ExamPlanningScopeSource;
  confidence: ExamPlanningConfidence;
} {
  const payload = exam.workloadPayload;
  const explicitTotalPages = normalizePositiveInt(payload?.totalPages);
  if (explicitTotalPages) {
    return {
      pages: clamp(explicitTotalPages, 30, 20_000),
      source: "verified_workload",
      confidence: "high",
    };
  }

  const bookRangePages = resolveBookRangePages(exam);
  if (bookRangePages) {
    return {
      pages: clamp(bookRangePages, 20, 20_000),
      source: "verified_workload",
      confidence: "high",
    };
  }

  const verifiedPageCount = normalizePositiveInt(payload?.verifiedPageCount);
  const approximateScopePages = resolveApproximateScopePages(exam);
  if (exam.materialType === "mixed" && verifiedPageCount && approximateScopePages) {
    return {
      pages: clamp(verifiedPageCount + approximateScopePages, 40, 20_000),
      source: "approximate_workload",
      confidence: "medium",
    };
  }

  if (verifiedPageCount) {
    return {
      pages: clamp(verifiedPageCount, 30, 20_000),
      source: "verified_workload",
      confidence: "high",
    };
  }

  if (approximateScopePages) {
    return {
      pages: clamp(approximateScopePages, 20, 20_000),
      source: "approximate_workload",
      confidence: "medium",
    };
  }

  return {
    pages: inferFallbackScopePages(exam.title, exam.subject.name),
    source: "fallback_inference",
    confidence: "low",
  };
}

function resolveIntensityPreference(
  raw: string | null | undefined,
): ExamPlanIntensityPreference {
  if (raw === "lighter" || raw === "balanced" || raw === "stronger") {
    return raw;
  }
  return "balanced";
}

function resolveIntensityFactor(intensity: ExamPlanIntensityPreference) {
  if (intensity === "lighter") {
    return {
      dailyTargetFactor: 0.92,
      weeklyAllocationFactor: 0.95,
      label: "Steady",
    };
  }
  if (intensity === "stronger") {
    return {
      dailyTargetFactor: 1.08,
      weeklyAllocationFactor: 1.06,
      label: "Push",
    };
  }
  return {
    dailyTargetFactor: 1,
    weeklyAllocationFactor: 1,
    label: "Balanced",
  };
}

function resolveRisk(daysLeft: number, weeklyGapRatio: number): ExamPlanningRisk {
  if (daysLeft <= 7 || weeklyGapRatio > 1.1) return "high";
  if (daysLeft <= 18 || weeklyGapRatio > 0.85) return "medium";
  return "low";
}

function resolveUrgency(daysLeft: number): ExamPlanningUrgency {
  if (daysLeft <= 7) return "high";
  if (daysLeft <= 18) return "medium";
  return "low";
}

function createBoardDays(now: Date): PlannerBoardDay[] {
  const start = new Date(now);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return {
      dateIso: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      totalMinutes: 0,
      totalPages: 0,
      items: [],
    };
  });
}

export function buildPlannerOverview(input: {
  exams: EngineExamRecord[];
  weeklyHours: number;
  subjectAffinity: unknown;
  now?: Date;
}): PlannerOverview {
  const now = input.now ?? new Date();
  const affinity = normalizeSubjectAffinity(input.subjectAffinity);
  const weeklyMinutesBudget = Math.round(clamp(input.weeklyHours * 60, 120, 4200));

  const enriched = input.exams
    .map((exam) => {
      const examDate = new Date(exam.examDate).toISOString();
      const scope = resolveExamScope(exam);
      const minutesSpent = (exam.studyLogs ?? []).reduce(
        (acc, log) => acc + Math.max(0, Math.round(log.minutesSpent)),
        0,
      );
      const pagesCompleted = (exam.studyLogs ?? []).reduce(
        (acc, log) => acc + Math.max(0, Math.round(log.pagesCompleted)),
        0,
      );
      const sessionsCompleted = exam.studyLogs?.length ?? 0;
      const lastLog = [...(exam.studyLogs ?? [])].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      )[0];
      const daysLeft = daysUntil(examDate, now);
      const subjectPace = inferSubjectPace(exam.subject.name);
      const completedPages = Math.min(scope.pages, pagesCompleted);
      const remainingPages = Math.max(0, scope.pages - completedPages);
      const completionPercent = Math.round(
        clamp((completedPages / Math.max(scope.pages, 1)) * 100, 0, 100),
      );
      const summaryPreferencePct = clamp(
        Math.round(exam.planState?.summaryPreferencePct ?? 30),
        0,
        100,
      );
      const intensityPreference = resolveIntensityPreference(
        exam.planState?.intensityPreference,
      );
      const intensityFactor = resolveIntensityFactor(intensityPreference);
      const affinityAdjustment = getSubjectAffinityAdjustment(exam.subject.name, affinity);
      const affinityFactors = getSubjectAffinityFactors(affinityAdjustment);
      const adjustedRemainingPages = Math.max(
        0,
        Math.round(remainingPages * (1 - summaryPreferencePct / 250)),
      );
      const baselinePagesPerDay = adjustedRemainingPages / Math.max(daysLeft, 1);
      const estimatedMinutesForExam =
        (scope.pages / subjectPace.pagesPerHour) * 60 * subjectPace.complexity;
      const urgencyScore =
        baselinePagesPerDay *
        (1 + 10 / Math.max(daysLeft, 3)) *
        subjectPace.complexity *
        affinityFactors.urgencyWeightMultiplier *
        intensityFactor.weeklyAllocationFactor;
      const dailyTargetPages = Math.max(
        remainingPages === 0 ? 0 : 1,
        Math.round(
          Math.max(0, baselinePagesPerDay) *
            affinityFactors.dailyPagesMultiplier *
            intensityFactor.dailyTargetFactor,
        ),
      );
      const dailyTargetMinutes =
        dailyTargetPages === 0
          ? 0
          : Math.max(
              20,
              Math.round(
                ((dailyTargetPages / subjectPace.pagesPerHour) * 60) /
                  affinityFactors.paceMultiplier,
              ),
            );

      return {
        exam,
        examDate,
        scope,
        subjectPace,
        completedPages,
        remainingPages,
        completionPercent,
        daysLeft,
        minutesSpent,
        pagesCompleted,
        sessionsCompleted,
        lastLog,
        adjustedRemainingPages,
        summaryPreferencePct,
        intensityPreference,
        intensityFactor,
        affinityAdjustment: affinityAdjustment as ExamPlanAdjustment,
        affinityFactors,
        urgencyScore,
        dailyTargetPages,
        dailyTargetMinutes,
        estimatedMinutesForExam,
      };
    })
    .sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
    });

  const totalUrgencyScore = enriched.reduce((acc, exam) => acc + exam.urgencyScore, 0);

  const recommendations: ExamPaceRecommendation[] = enriched.map((entry) => {
    const weeklyAllocationMinutes =
      entry.remainingPages === 0
        ? 0
        : Math.max(
            30,
            Math.round(
              weeklyMinutesBudget *
                (entry.urgencyScore / Math.max(totalUrgencyScore, 1)) *
                entry.intensityFactor.weeklyAllocationFactor *
                entry.affinityFactors.missionMinutesMultiplier,
            ),
          );
    const weeklyAllocationHours = Number((weeklyAllocationMinutes / 60).toFixed(1));
    const sustainableWeeklyNeed =
      (entry.dailyTargetMinutes * Math.min(7, entry.daysLeft)) /
      Math.max(weeklyMinutesBudget, 1);
    const risk = resolveRisk(entry.daysLeft, sustainableWeeklyNeed);
    const urgency = resolveUrgency(entry.daysLeft);
    const explanation = getSubjectAffinityExplanation(
      entry.affinityAdjustment,
      "en",
    );

    const paceLabel =
      risk === "high"
        ? `${entry.intensityFactor.label} rescue`
        : risk === "medium"
          ? `${entry.intensityFactor.label} push`
          : `${entry.intensityFactor.label} rhythm`;

    const scopeSummary =
      entry.scope.source === "verified_workload"
        ? `${entry.scope.pages} pages from defined material scope`
        : entry.scope.source === "approximate_workload"
          ? `${entry.scope.pages} pages from mixed or approximate material scope`
          : `${entry.scope.pages} fallback pages while workload is still incomplete`;

    return {
      examId: entry.exam.id,
      examTitle: entry.exam.title,
      subjectId: entry.exam.subject.id,
      subjectName: entry.exam.subject.name,
      examDate: entry.examDate,
      daysLeft: entry.daysLeft,
      paceLabel,
      paceDescription:
        risk === "high"
          ? `This exam needs tight, frequent study blocks because the remaining scope is heavy for the time left.`
          : risk === "medium"
            ? `This exam is manageable with steady weekly follow-through and no long gaps.`
            : `This exam is on a sustainable pace if you keep the planned rhythm consistent.`,
      scopeSummary,
      scopeSource: entry.scope.source,
      confidence: entry.scope.confidence,
      risk,
      urgency,
      totalScopePages: entry.scope.pages,
      completedPages: entry.completedPages,
      remainingPages: entry.remainingPages,
      completionPercent: entry.completionPercent,
      weeklyAllocationMinutes,
      weeklyAllocationHours,
      dailyTargetPages: entry.dailyTargetPages,
      dailyTargetMinutes: entry.dailyTargetMinutes,
      summaryPreferencePct: entry.summaryPreferencePct,
      intensityPreference: entry.intensityPreference,
      paceLocked: Boolean(entry.exam.planState?.paceLocked),
      affinityImpact: {
        adjustment: entry.affinityAdjustment,
        label:
          entry.affinityAdjustment === "preferred"
            ? "Affinity helps"
            : entry.affinityAdjustment === "effort"
              ? "Needs extra effort"
              : "Neutral fit",
        explanation: explanation?.body ?? null,
      },
      studyLogSummary: {
        minutesSpent: entry.minutesSpent,
        pagesCompleted: entry.pagesCompleted,
        sessionsCompleted: entry.sessionsCompleted,
        lastTopic: entry.lastLog?.topic?.trim() ?? "",
        lastCompletedAt: entry.lastLog
          ? new Date(entry.lastLog.completedAt).toISOString()
          : "",
      },
      explanationBullets: [
        `${entry.scope.pages} pages are currently counted for this exam.`,
        `${entry.daysLeft} days remain until the exam date.`,
        `${entry.dailyTargetPages} pages and ${entry.dailyTargetMinutes} minutes per day keep this exam on pace.`,
        explanation?.body ??
          "This plan uses a neutral subject fit because no strong affinity signal is available.",
      ],
      nextSteps: [
        entry.remainingPages > 0
          ? `Cover the next ${Math.max(6, entry.dailyTargetPages * 2)} pages before your next review block.`
          : "Switch to active recall and short review passes.",
        entry.sessionsCompleted === 0
          ? `Log the first study session for ${entry.exam.subject.name}.`
          : `Keep logging study sessions so the plan stays calibrated.`,
        risk === "high"
          ? "Protect time for this exam first when the week gets crowded."
          : "Keep this exam moving with consistent short blocks.",
      ],
    };
  });

  const weeklyBoard = createBoardDays(now);
  recommendations.forEach((recommendation) => {
    weeklyBoard.forEach((day, index) => {
      const pages = Math.max(
        0,
        Math.round(recommendation.dailyTargetPages * (index === 5 || index === 6 ? 0.8 : 1)),
      );
      const minutes = Math.max(
        0,
        Math.round(recommendation.dailyTargetMinutes * (index === 5 || index === 6 ? 0.8 : 1)),
      );
      if (pages === 0 && minutes === 0) return;
      day.items.push({
        examId: recommendation.examId,
        examTitle: recommendation.examTitle,
        subjectName: recommendation.subjectName,
        minutes,
        pages,
        urgency: recommendation.urgency,
        reason: recommendation.explanationBullets[0] ?? "",
      });
      day.totalMinutes += minutes;
      day.totalPages += pages;
    });
  });

  weeklyBoard.forEach((day) => {
    day.items = day.items
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 4);
  });

  const todayFocus = recommendations.slice(0, 3).map((recommendation) => ({
    examId: recommendation.examId,
    examTitle: recommendation.examTitle,
    subjectName: recommendation.subjectName,
    minutes: recommendation.dailyTargetMinutes,
    pages: recommendation.dailyTargetPages,
    urgency: recommendation.urgency,
    reason: recommendation.explanationBullets[1] ?? recommendation.scopeSummary,
  }));

  const verifiedScopeCoveragePct =
    recommendations.length === 0
      ? 0
      : Math.round(
          (recommendations.filter(
            (recommendation) => recommendation.scopeSource !== "fallback_inference",
          ).length /
            recommendations.length) *
            100,
        );
  const averageCompletionPct =
    recommendations.length === 0
      ? 0
      : Math.round(
          recommendations.reduce(
            (acc, recommendation) => acc + recommendation.completionPercent,
            0,
          ) / recommendations.length,
        );
  const averageConfidenceScore =
    recommendations.length === 0
      ? 0
      : Math.round(
          recommendations.reduce((acc, recommendation) => {
            const score =
              recommendation.confidence === "high"
                ? 100
                : recommendation.confidence === "medium"
                  ? 70
                  : 40;
            return acc + score;
          }, 0) / recommendations.length,
        );

  const overallRisk: ExamPlanningRisk = recommendations.some(
    (recommendation) => recommendation.risk === "high",
  )
    ? "high"
    : recommendations.some((recommendation) => recommendation.risk === "medium")
      ? "medium"
      : "low";

  const studyLogDays = new Set(
    enriched
      .flatMap((exam) => exam.exam.studyLogs ?? [])
      .map((log) => new Date(log.completedAt).toISOString().slice(0, 10)),
  );
  const sessionsCompleted = enriched.reduce(
    (acc, exam) => acc + exam.sessionsCompleted,
    0,
  );

  return {
    summary: {
      totalExams: recommendations.length,
      weeklyMinutesBudget,
      plannedWeeklyMinutes: weeklyBoard.reduce((acc, day) => acc + day.totalMinutes, 0),
      verifiedScopeCoveragePct,
      averageCompletionPct,
      averageConfidenceScore,
      risk: overallRisk,
      riskMessage:
        overallRisk === "high"
          ? "The current season is overloaded. Prioritize the most urgent exams first."
          : overallRisk === "medium"
            ? "The plan is viable, but it needs consistent execution every week."
            : "The current plan is stable if you keep the routine consistent.",
    },
    examRecommendations: recommendations,
    todayFocus,
    weeklyBoard,
    lightGamification: {
      streakDays: Math.min(studyLogDays.size, 14),
      sessionsCompleted,
      consistencyLabel:
        studyLogDays.size >= 7
          ? "Strong rhythm"
          : studyLogDays.size >= 3
            ? "Building rhythm"
            : "Starting rhythm",
      earnedFreeTimeHours: Number(
        (
          recommendations.reduce(
            (acc, recommendation) => acc + Math.max(0, 90 - recommendation.dailyTargetMinutes),
            0,
          ) /
          60
        ).toFixed(1),
      ),
    },
  };
}
