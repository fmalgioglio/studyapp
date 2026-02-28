type ExamLite = {
  id: string;
  title: string;
  examDate: string;
  subject: {
    id: string;
    name: string;
  };
};

type SubjectPace = {
  pagesPerHour: number;
  complexity: number;
};

export type SeasonProgressInput = Record<
  string,
  {
    pagesCompleted: number;
  }
>;

const DAY_MS = 24 * 60 * 60 * 1000;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function inferSubjectPace(subjectName: string): SubjectPace {
  const normalized = subjectName.toLowerCase();
  const key = Object.keys(SUBJECT_PACE_MAP).find((candidate) =>
    normalized.includes(candidate),
  );
  return key ? SUBJECT_PACE_MAP[key] : SUBJECT_PACE_MAP.general;
}

function inferExamPages(exam: ExamLite) {
  const subjectPace = inferSubjectPace(exam.subject.name);
  const title = exam.title.toLowerCase();
  const base = 200 * subjectPace.complexity;
  const intensityBonus =
    (title.includes("final") ? 45 : 0) +
    (title.includes("orale") ? 35 : 0) +
    (title.includes("advanced") ? 40 : 0) +
    (title.includes("midterm") ? -15 : 0);
  return Math.round(clamp(base + intensityBonus, 110, 680));
}

function daysUntil(dateIso: string, now: Date) {
  const diff = Math.ceil((new Date(dateIso).getTime() - now.getTime()) / DAY_MS);
  return Math.max(diff, 1);
}

export type SeasonMission = {
  examId: string;
  examTitle: string;
  subjectName: string;
  minutes: number;
  pages: number;
  xp: number;
  urgency: "low" | "medium" | "high";
};

export type SeasonDay = {
  dateIso: string;
  label: string;
  totalMinutes: number;
  totalPages: number;
  missions: SeasonMission[];
};

export type SeasonPlan = {
  totalExams: number;
  weeklyMinutesBudget: number;
  weeklyPagesTarget: number;
  riskLevel: "low" | "medium" | "high";
  riskMessage: string;
  dayRows: SeasonDay[];
  todayMissions: SeasonMission[];
  examTracks: Array<{
    examId: string;
    examTitle: string;
    subjectName: string;
    daysLeft: number;
    estimatedPages: number;
    completedPages: number;
    remainingPages: number;
    completionPercent: number;
    recommendedPagesPerDay: number;
    recommendedMinutesPerDay: number;
    urgency: "low" | "medium" | "high";
    weeklyMilestones: string[];
  }>;
  leaderboardPreview: Array<{
    name: string;
    xp: number;
    consistency: number;
    score: number;
    cohort: string;
  }>;
};

export function buildSeasonPlan(
  exams: ExamLite[],
  weeklyHours: number,
  progress: SeasonProgressInput = {},
  mode: "focused" | "balanced" | "full" = "balanced",
  now = new Date(),
): SeasonPlan {
  const examLimit = mode === "focused" ? 6 : mode === "balanced" ? 12 : Number.MAX_SAFE_INTEGER;
  const activeExams = exams
    .map((exam) => ({
      exam,
      daysLeft: daysUntil(exam.examDate, now),
      estimatedPages: inferExamPages(exam),
      completedPages: clamp(progress[exam.id]?.pagesCompleted ?? 0, 0, 20000),
    }))
    .map((entry) => ({
      ...entry,
      remainingPages: Math.max(0, Math.round(entry.estimatedPages - entry.completedPages)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, examLimit);

  const weeklyMinutesBudget = Math.round(clamp(weeklyHours * 60, 120, 4200));
  const dailyMinutesBudget = Math.round(weeklyMinutesBudget / 7);
  const weekStart = startOfWeek(now);

  const weekDays: SeasonDay[] = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStart.getTime() + index * DAY_MS);
    const dateIso = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      dateIso,
      label,
      totalMinutes: 0,
      totalPages: 0,
      missions: [],
    };
  });

  if (activeExams.length === 0) {
    return {
      totalExams: 0,
      weeklyMinutesBudget,
      weeklyPagesTarget: 0,
      riskLevel: "low",
      riskMessage: "No exams yet. Add at least one exam to generate a season plan.",
      dayRows: weekDays,
      todayMissions: [],
      examTracks: [],
      leaderboardPreview: [
        { name: "You", xp: 0, consistency: 0, score: 0, cohort: "Starter Cohort" },
        { name: "Luna", xp: 320, consistency: 78, score: 228, cohort: "Starter Cohort" },
        { name: "Niko", xp: 280, consistency: 75, score: 204, cohort: "Starter Cohort" },
      ],
    };
  }

  const urgencyWeights = activeExams.map((entry) => {
    const subjectPace = inferSubjectPace(entry.exam.subject.name);
    const pagesPerDay = entry.remainingPages / entry.daysLeft;
    const urgencyScore =
      pagesPerDay * (1 + 10 / Math.max(entry.daysLeft, 3)) * subjectPace.complexity;
    return {
      ...entry,
      subjectPace,
      pagesPerDay,
      urgencyScore,
    };
  }).filter((entry) => entry.remainingPages > 0);

  const totalUrgency = urgencyWeights.reduce((acc, current) => acc + current.urgencyScore, 0);

  weekDays.forEach((day) => {
    const dayMissions = urgencyWeights.slice(0, 4).map((entry) => {
      const share = entry.urgencyScore / Math.max(totalUrgency, 1);
      const rawMinutes = Math.max(20, Math.round(dailyMinutesBudget * share));
      const missionMinutes = Math.round(rawMinutes / 5) * 5;
      const missionPages = Math.max(
        2,
        Math.round((missionMinutes / 60) * entry.subjectPace.pagesPerHour),
      );
      const urgency: SeasonMission["urgency"] =
        entry.daysLeft <= 7 ? "high" : entry.daysLeft <= 18 ? "medium" : "low";
      const xp = Math.round(missionMinutes * 1.6 + (urgency === "high" ? 20 : 0));

      return {
        examId: entry.exam.id,
        examTitle: entry.exam.title,
        subjectName: entry.exam.subject.name,
        minutes: missionMinutes,
        pages: missionPages,
        xp,
        urgency,
      };
    });

    day.missions = dayMissions;
    day.totalMinutes = dayMissions.reduce((acc, mission) => acc + mission.minutes, 0);
    day.totalPages = dayMissions.reduce((acc, mission) => acc + mission.pages, 0);
  });

  const weeklyPagesTarget = weekDays.reduce((acc, day) => acc + day.totalPages, 0);
  const estimatedRequiredWeeklyMinutes = urgencyWeights.reduce((acc, item) => {
    const examWeeklyPages = item.pagesPerDay * 7;
    const examWeeklyMinutes = (examWeeklyPages / item.subjectPace.pagesPerHour) * 60;
    return acc + examWeeklyMinutes;
  }, 0);
  const pressure = estimatedRequiredWeeklyMinutes / Math.max(weeklyMinutesBudget, 1);
  const riskLevel: SeasonPlan["riskLevel"] =
    pressure <= 0.9 ? "low" : pressure <= 1.15 ? "medium" : "high";
  const riskMessage =
    riskLevel === "low"
      ? "Plan looks stable. Keep consistency and weekly review blocks."
      : riskLevel === "medium"
        ? "Plan is tight. Prioritize high-urgency missions first."
        : "Plan is overloaded. Use summaries for secondary chapters and increase focus blocks.";

  const dominantSubject = activeExams[0]?.exam.subject.name ?? "General";
  const examTracks = activeExams.map((entry) => {
    const subjectPace = inferSubjectPace(entry.exam.subject.name);
    const pagesPerDay = entry.remainingPages / Math.max(entry.daysLeft, 1);
    const recommendedPagesPerDay = entry.remainingPages === 0 ? 0 : Math.max(2, Math.round(pagesPerDay * 1.08));
    const recommendedMinutesPerDay = Math.max(
      recommendedPagesPerDay === 0 ? 0 : 20,
      recommendedPagesPerDay === 0 ? 0 : Math.round((recommendedPagesPerDay / subjectPace.pagesPerHour) * 60),
    );
    const urgency: "low" | "medium" | "high" =
      entry.daysLeft <= 7 ? "high" : entry.daysLeft <= 18 ? "medium" : "low";
    const completionPercent = Math.round(
      clamp((entry.completedPages / Math.max(entry.estimatedPages, 1)) * 100, 0, 100),
    );

    return {
      examId: entry.exam.id,
      examTitle: entry.exam.title,
      subjectName: entry.exam.subject.name,
      daysLeft: entry.daysLeft,
      estimatedPages: entry.estimatedPages,
      completedPages: Math.min(entry.completedPages, entry.estimatedPages),
      remainingPages: entry.remainingPages,
      completionPercent,
      recommendedPagesPerDay,
      recommendedMinutesPerDay,
      urgency,
      weeklyMilestones: [
        `Week 1: cover around ${Math.max(8, Math.round(entry.remainingPages * 0.35))} pages`,
        `Week 2: consolidate + active recall on weak chapters`,
        `Final week: simulation tests and high-yield review`,
      ],
    };
  });

  return {
    totalExams: activeExams.length,
    weeklyMinutesBudget,
    weeklyPagesTarget,
    riskLevel,
    riskMessage,
    dayRows: weekDays,
    todayMissions: weekDays[0]?.missions ?? [],
    examTracks,
    leaderboardPreview: [
      { name: "You", xp: 870, consistency: 82, score: 684, cohort: `${dominantSubject} Cohort` },
      { name: "Luna", xp: 910, consistency: 78, score: 674, cohort: `${dominantSubject} Cohort` },
      { name: "Niko", xp: 860, consistency: 81, score: 674, cohort: `${dominantSubject} Cohort` },
      { name: "Aria", xp: 830, consistency: 79, score: 656, cohort: `${dominantSubject} Cohort` },
    ],
  };
}
