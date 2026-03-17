"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { useAuthStudent } from "./_hooks/use-auth-student";
import { usePlannerOverview } from "./_hooks/use-planner-overview";
import type { ExamPaceRecommendation } from "@/lib/exam-plan";

const WeeklyBoardSection = dynamic(
  () =>
    import("./_components/weekly-board-section").then((module) => ({
      default: module.WeeklyBoardSection,
    })),
  {
    loading: () => (
      <section className="planner-panel">
        <div className="planner-skeleton h-7 w-48" />
        <div className="planner-skeleton mt-2 h-4 w-80" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="planner-skeleton h-32" />
          ))}
        </div>
      </section>
    ),
  },
);

const COPY = {
  en: {
    badge: "Study coach",
    title: "Study one exam at a time, without losing the full week.",
    subtitle:
      "Your planner now keeps each exam clear: pace, material scope, weekly time, and the next step that matters most.",
    loading: "Loading your planner...",
    noAccount: "No account context found.",
    todayFocus: "Today focus",
    todayFocusHint: "Start with the highest-value study blocks for today.",
    refresh: "Refresh plan",
    examPlan: "Exam plans",
    examPlanHint: "Each card tells you the current pace and why it was chosen.",
    selectedExam: "Selected exam",
    whyThisPlan: "Why this plan",
    nextSteps: "Next steps",
    pace: "Pace",
    scope: "Scope",
    weeklyTime: "Weekly time",
    dailyTarget: "Daily target",
    confidence: "Confidence",
    risk: "Risk",
    completion: "Completion",
    daysLeft: "Days left",
    affinity: "Affinity impact",
    recentStudy: "Recent study",
    noRecentStudy: "No recent study logged yet.",
    boardTitle: "Weekly view",
    boardToggleOpen: "Show weekly view",
    boardToggleClose: "Hide weekly view",
    linksTitle: "Keep moving",
    examsLink: "Manage exams",
    subjectsLink: "Subjects",
    focusLink: "Log study session",
    summaryRisk: "Plan health",
    summaryScope: "Verified scope",
    summaryCompletion: "Progress",
    summaryConsistency: "Consistency",
    summaryFreeTime: "Free time protected",
    confidenceHigh: "High",
    confidenceMedium: "Medium",
    confidenceLow: "Low",
    riskLow: "Stable",
    riskMedium: "Tight",
    riskHigh: "Heavy",
    sessions: "sessions",
    minutes: "min",
    pages: "pages",
    hours: "hours",
  },
  it: {
    badge: "Coach di studio",
    title: "Studia un esame alla volta, senza perdere il controllo della settimana.",
    subtitle:
      "Il planner ora tiene chiari ritmo, perimetro materiale, tempo settimanale e prossimo passo utile per ogni esame.",
    loading: "Caricamento planner...",
    noAccount: "Contesto account non trovato.",
    todayFocus: "Focus di oggi",
    todayFocusHint: "Parti dai blocchi di studio che oggi hanno piu valore.",
    refresh: "Aggiorna piano",
    examPlan: "Piani esame",
    examPlanHint: "Ogni card spiega il ritmo attuale e il motivo della scelta.",
    selectedExam: "Esame selezionato",
    whyThisPlan: "Perche questo piano",
    nextSteps: "Prossimi passi",
    pace: "Ritmo",
    scope: "Perimetro",
    weeklyTime: "Tempo settimanale",
    dailyTarget: "Target giornaliero",
    confidence: "Affidabilita",
    risk: "Rischio",
    completion: "Avanzamento",
    daysLeft: "Giorni rimanenti",
    affinity: "Impatto affinity",
    recentStudy: "Studio recente",
    noRecentStudy: "Nessuna sessione registrata per ora.",
    boardTitle: "Vista settimanale",
    boardToggleOpen: "Mostra vista settimanale",
    boardToggleClose: "Nascondi vista settimanale",
    linksTitle: "Continua",
    examsLink: "Gestisci esami",
    subjectsLink: "Materie",
    focusLink: "Registra sessione",
    summaryRisk: "Salute del piano",
    summaryScope: "Perimetro verificato",
    summaryCompletion: "Progresso",
    summaryConsistency: "Costanza",
    summaryFreeTime: "Tempo libero protetto",
    confidenceHigh: "Alta",
    confidenceMedium: "Media",
    confidenceLow: "Bassa",
    riskLow: "Stabile",
    riskMedium: "Tirato",
    riskHigh: "Pesante",
    sessions: "sessioni",
    minutes: "min",
    pages: "pagine",
    hours: "ore",
  },
} as const;

type PlannerCopy = (typeof COPY)[keyof typeof COPY];

function confidenceLabel(value: ExamPaceRecommendation["confidence"], t: PlannerCopy) {
  if (value === "high") return t.confidenceHigh;
  if (value === "medium") return t.confidenceMedium;
  return t.confidenceLow;
}

function riskLabel(value: ExamPaceRecommendation["risk"], t: PlannerCopy) {
  if (value === "high") return t.riskHigh;
  if (value === "medium") return t.riskMedium;
  return t.riskLow;
}

function formatPlannerLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PlannerOverviewPage() {
  const { student, loading: loadingStudent } = useAuthStudent();
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get("exam")?.trim() ?? "";
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { overview, loading, refreshing, error, refresh } = usePlannerOverview({
    enabled: Boolean(student?.id),
    studentId: student?.id,
  });
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [showWeeklyBoard, setShowWeeklyBoard] = useState(false);

  const selectedExam = useMemo(() => {
    if (!overview?.examRecommendations.length) return null;
    if (selectedExamId) {
      return (
        overview.examRecommendations.find((exam) => exam.examId === selectedExamId) ??
        overview.examRecommendations[0]
      );
    }
    return overview.examRecommendations[0];
  }, [overview, selectedExamId]);

  const completionByExamId = useMemo(
    () =>
      Object.fromEntries(
        (overview?.examRecommendations ?? []).map((exam) => [
          exam.examId,
          exam.completionPercent,
        ]),
      ),
    [overview],
  );

  if (loadingStudent || loading) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <section className="planner-panel planner-hero">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.loading}</p>
        </section>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <section className="planner-alert">{t.noAccount}</section>
      </main>
    );
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="planner-chip border-white/80 bg-white/80 text-slate-700">
              {t.badge}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-slate-700">{t.subtitle}</p>
            {overview ? (
              <p className="mt-3 text-sm text-slate-600">{overview.summary.riskMessage}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            className="planner-btn planner-btn-secondary"
          >
            {t.refresh}
          </button>
        </div>

        {overview ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article className="planner-card bg-white/90">
              <p className="planner-eyebrow">{t.summaryRisk}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {riskLabel(overview.summary.risk, t)}
              </p>
            </article>
            <article className="planner-card bg-white/90">
              <p className="planner-eyebrow">{t.summaryScope}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {overview.summary.verifiedScopeCoveragePct}%
              </p>
            </article>
            <article className="planner-card bg-white/90">
              <p className="planner-eyebrow">{t.summaryCompletion}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {overview.summary.averageCompletionPct}%
              </p>
            </article>
            <article className="planner-card bg-white/90">
              <p className="planner-eyebrow">{t.summaryConsistency}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {overview.lightGamification.consistencyLabel}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview.lightGamification.streakDays}d,{" "}
                {overview.lightGamification.sessionsCompleted} {t.sessions}
              </p>
            </article>
            <article className="planner-card bg-white/90">
              <p className="planner-eyebrow">{t.summaryFreeTime}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {overview.lightGamification.earnedFreeTimeHours} {t.hours}
              </p>
            </article>
          </div>
        ) : null}
      </section>

      {overview ? (
        <section className="planner-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{t.todayFocus}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.todayFocusHint}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {overview.todayFocus.map((item) => (
              <article key={item.examId} className="planner-card bg-slate-50/90">
                <p className="planner-chip border-slate-200 bg-white text-slate-700">
                  {item.subjectName}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">
                  {item.examTitle}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="planner-eyebrow">{t.dailyTarget}</p>
                    <p className="mt-1 font-semibold">
                      {item.pages} {t.pages}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="planner-eyebrow">{t.weeklyTime}</p>
                    <p className="mt-1 font-semibold">
                      {item.minutes} {t.minutes}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExamId(item.examId)}
                  className="planner-btn planner-btn-secondary mt-3 w-full"
                >
                  {t.selectedExam}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {overview ? (
        <section className="planner-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{t.examPlan}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.examPlanHint}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.4fr]">
            <div className="space-y-3">
              {overview.examRecommendations.map((exam) => (
                <button
                  key={exam.examId}
                  type="button"
                  onClick={() => setSelectedExamId(exam.examId)}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selectedExam?.examId === exam.examId
                      ? "border-slate-300 bg-white shadow-sm ring-1 ring-slate-200"
                      : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                        {exam.subjectName}
                      </span>
                      <p className="mt-3 text-base font-semibold text-slate-900">
                        {exam.examTitle}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{exam.paceDescription}</p>
                    </div>
                    <span className="planner-chip border-slate-200 bg-white text-slate-700">
                      {exam.paceLabel}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="planner-eyebrow">{t.daysLeft}</p>
                      <p className="mt-1 font-semibold text-slate-900">{exam.daysLeft}</p>
                    </div>
                    <div>
                      <p className="planner-eyebrow">{t.completion}</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {exam.completionPercent}%
                      </p>
                    </div>
                    <div>
                      <p className="planner-eyebrow">{t.weeklyTime}</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {exam.weeklyAllocationHours} {t.hours}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedExam ? (
              <div className="space-y-3">
                <article className="planner-card border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                        {selectedExam.subjectName}
                      </p>
                      <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                        {selectedExam.examTitle}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedExam.paceDescription}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {formatPlannerLabel(selectedExam.assessmentType)}
                      </span>
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {formatPlannerLabel(selectedExam.status)}
                      </span>
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {formatPlannerLabel(selectedExam.planMode)}
                      </span>
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {t.confidence}: {confidenceLabel(selectedExam.confidence, t)}
                      </span>
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {t.risk}: {riskLabel(selectedExam.risk, t)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.scope}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedExam.scopeSummary}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.weeklyTime}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.weeklyAllocationHours} {t.hours}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.dailyTarget}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.dailyTargetPages} {t.pages}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedExam.dailyTargetMinutes} {t.minutes}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.affinity}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedExam.affinityImpact.label}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">Materials</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedExam.linkedMaterialsCount} linked
                      </p>
                    </div>
                  </div>
                </article>

                <article className="planner-card border border-slate-200 bg-white">
                  <p className="planner-eyebrow">{t.whyThisPlan}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">Allocation</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.allocationReason}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.confidence}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.confidenceReason}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {selectedExam.explanationBullets.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <p className="planner-eyebrow">Risk drivers</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {selectedExam.riskDrivers.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>

                <article className="planner-card border border-slate-200 bg-white">
                  <p className="planner-eyebrow">{t.nextSteps}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {selectedExam.nextSteps.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="planner-card border border-slate-200 bg-white">
                  <p className="planner-eyebrow">{t.recentStudy}</p>
                  {selectedExam.studyLogSummary.sessionsCompleted > 0 ? (
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>
                        {selectedExam.studyLogSummary.sessionsCompleted} {t.sessions}
                      </p>
                      <p>
                        {selectedExam.studyLogSummary.minutesSpent} {t.minutes} •{" "}
                        {selectedExam.studyLogSummary.pagesCompleted} {t.pages}
                      </p>
                      <p>
                        {selectedExam.studyLogSummary.lastTopic || t.noRecentStudy}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">{t.noRecentStudy}</p>
                  )}
                </article>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {overview ? (
        <section className="planner-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-900">{t.boardTitle}</h2>
            <button
              type="button"
              onClick={() => setShowWeeklyBoard((current) => !current)}
              className="planner-btn planner-btn-secondary"
            >
              {showWeeklyBoard ? t.boardToggleClose : t.boardToggleOpen}
            </button>
          </div>
          {showWeeklyBoard ? (
            <div className="mt-4">
              <WeeklyBoardSection
                title={t.boardTitle}
                riskMessage={overview.summary.riskMessage}
                dayRows={overview.weeklyBoard}
                completionByExamId={completionByExamId}
                pagesUnitLabel={t.pages}
                minutesUnitLabel={t.minutes}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Link href="/planner/exams" className="planner-card transition hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-slate-900">{t.examsLink}</h3>
        </Link>
        <Link href="/planner/subjects" className="planner-card transition hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-slate-900">{t.subjectsLink}</h3>
        </Link>
        <Link href="/planner/focus" className="planner-card transition hover:-translate-y-1 hover:shadow-md">
          <h3 className="font-bold text-slate-900">{t.focusLink}</h3>
        </Link>
      </section>

      {error ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {error}
        </section>
      ) : null}
    </main>
  );
}
