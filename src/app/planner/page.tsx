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
    badge: "Planner coach",
    title: "See what matters today and keep the week under control.",
    subtitle:
      "Your objectives, materials, and study rhythm stay aligned so the next useful block is always clear.",
    loading: "Loading your planner...",
    noAccount: "Your session is missing or expired.",
    noAccountBody: "Sign in again to reload your planner and study data.",
    login: "Log in",
    createAccount: "Create account",
    refresh: "Refresh planner",
    todayFocus: "Study today",
    todayFocusHint: "Start from the objective with the strongest payoff right now.",
    todayQueue: "Other useful blocks",
    openObjective: "Open objective",
    openStudyToday: "Open Study Today",
    studyPlan: "Study plan",
    studyPlanHint: "Each objective gets one readable plan with pace, scope, and next steps.",
    whyThisPlan: "Why this study plan works",
    nextSteps: "Next steps",
    pace: "Rhythm",
    scope: "Scope",
    weeklyTime: "Weekly time",
    dailyTarget: "Today target",
    confidence: "Confidence",
    risk: "Risk",
    completion: "Progress",
    daysLeft: "Days left",
    affinity: "Subject fit",
    recentStudy: "Recent study",
    noRecentStudy: "No study sessions logged yet.",
    boardTitle: "Weekly view",
    boardToggleOpen: "Show weekly view",
    boardToggleClose: "Hide weekly view",
    objectivesLink: "Open Objectives",
    subjectsLink: "Subjects",
    focusLink: "Study Today",
    summaryProgress: "Progress",
    summaryScope: "Verified scope",
    summaryConsistency: "Consistency",
    summaryFreeTime: "Free time",
    progressHint: "Average completion across active objectives.",
    scopeHint: "How much of your workload has reliable scope data.",
    consistencyHint: "Built from streak and completed sessions.",
    freeTimeHint: "Protected time recovered from the current plan.",
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
    materials: "Materials",
    linkedMaterials: "linked materials",
    noMaterials: "Add notes, slides, or official links to make the plan sharper.",
    allocation: "Why these hours",
    riskDrivers: "What is adding pressure",
    confidenceReason: "Why this plan is reliable",
    protectedTime: "Protected time",
    objectiveStatus: "Objective status",
    objectiveType: "Goal type",
  },
  it: {
    badge: "Coach planner",
    title: "Capisci cosa conta oggi e tieni la settimana sotto controllo.",
    subtitle:
      "Obiettivi, materiali e ritmo di studio restano allineati cosi il prossimo blocco utile e sempre chiaro.",
    loading: "Caricamento planner...",
    noAccount: "La sessione manca o e scaduta.",
    noAccountBody: "Accedi di nuovo per ricaricare planner e dati di studio.",
    login: "Vai al login",
    createAccount: "Crea account",
    refresh: "Aggiorna planner",
    todayFocus: "Studia oggi",
    todayFocusHint: "Parti dall'obiettivo che in questo momento ha il ritorno piu alto.",
    todayQueue: "Altri blocchi utili",
    openObjective: "Apri obiettivo",
    openStudyToday: "Vai a Studia oggi",
    studyPlan: "Piano di studio",
    studyPlanHint: "Ogni obiettivo ha un piano leggibile con ritmo, perimetro e prossimi passi.",
    whyThisPlan: "Perche questo piano funziona",
    nextSteps: "Prossimi passi",
    pace: "Ritmo",
    scope: "Perimetro",
    weeklyTime: "Tempo settimanale",
    dailyTarget: "Target di oggi",
    confidence: "Affidabilita",
    risk: "Rischio",
    completion: "Progresso",
    daysLeft: "Giorni rimanenti",
    affinity: "Fit con la materia",
    recentStudy: "Studio recente",
    noRecentStudy: "Nessuna sessione registrata per ora.",
    boardTitle: "Vista settimanale",
    boardToggleOpen: "Mostra vista settimanale",
    boardToggleClose: "Nascondi vista settimanale",
    objectivesLink: "Apri Obiettivi",
    subjectsLink: "Materie",
    focusLink: "Studia oggi",
    summaryProgress: "Progresso",
    summaryScope: "Perimetro verificato",
    summaryConsistency: "Costanza",
    summaryFreeTime: "Tempo libero",
    progressHint: "Media dell'avanzamento sui tuoi obiettivi attivi.",
    scopeHint: "Quanto del carico ha dati affidabili sul perimetro reale.",
    consistencyHint: "Calcolata da streak e sessioni concluse.",
    freeTimeHint: "Tempo protetto recuperato dal piano attuale.",
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
    materials: "Materiali",
    linkedMaterials: "materiali collegati",
    noMaterials: "Aggiungi appunti, slide o link ufficiali per rendere il piano piu preciso.",
    allocation: "Perche hai queste ore",
    riskDrivers: "Cosa sta mettendo pressione",
    confidenceReason: "Perche questo piano e affidabile",
    protectedTime: "Tempo protetto",
    objectiveStatus: "Stato obiettivo",
    objectiveType: "Tipo obiettivo",
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

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function PlannerRingMetric({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  const safeValue = clampPercent(value);

  return (
    <article className="planner-metric-card">
      <div
        className="planner-ring"
        style={{
          background: `conic-gradient(var(--accent) ${safeValue * 3.6}deg, rgba(var(--accent-rgb), 0.13) 0deg)`,
        }}
      >
        <div className="planner-ring-core">
          <span className="planner-ring-value">{safeValue}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="planner-eyebrow">{label}</p>
        <p className="mt-1 text-sm text-slate-600">{caption}</p>
      </div>
    </article>
  );
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

  const recommendationByExamId = useMemo(
    () =>
      Object.fromEntries(
        (overview?.examRecommendations ?? []).map((exam) => [exam.examId, exam]),
      ),
    [overview],
  );

  const consistencyPercent = overview
    ? clampPercent(
        overview.lightGamification.streakDays * 12 +
          overview.lightGamification.sessionsCompleted * 4,
      )
    : 0;
  const protectedFreeTimePercent =
    overview && overview.summary.weeklyMinutesBudget > 0
      ? clampPercent(
          (overview.lightGamification.earnedFreeTimeHours * 60 /
            overview.summary.weeklyMinutesBudget) *
            100,
        )
      : 0;

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
        <section className="planner-panel">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.noAccount}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t.noAccountBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/login" className="planner-btn planner-btn-accent">
              {t.login}
            </Link>
            <Link href="/signup" className="planner-btn planner-btn-secondary">
              {t.createAccount}
            </Link>
          </div>
        </section>
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
            <p className="mt-2 max-w-2xl text-sm text-slate-700">{t.subtitle}</p>
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
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <PlannerRingMetric
              label={t.summaryProgress}
              value={overview.summary.averageCompletionPct}
              caption={t.progressHint}
            />
            <PlannerRingMetric
              label={t.summaryScope}
              value={overview.summary.verifiedScopeCoveragePct}
              caption={t.scopeHint}
            />
            <PlannerRingMetric
              label={t.summaryConsistency}
              value={consistencyPercent}
              caption={`${overview.lightGamification.streakDays}d, ${overview.lightGamification.sessionsCompleted} ${t.sessions}. ${t.consistencyHint}`}
            />
            <PlannerRingMetric
              label={t.summaryFreeTime}
              value={protectedFreeTimePercent}
              caption={`${overview.lightGamification.earnedFreeTimeHours} ${t.hours}. ${t.freeTimeHint}`}
            />
          </div>
        ) : null}
      </section>

      {overview ? (
        <section className="planner-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{t.todayFocus}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.todayFocusHint}</p>
            </div>
            <Link href="/planner/focus" className="planner-btn planner-btn-accent">
              {t.openStudyToday}
            </Link>
          </div>

          {overview.todayFocus.length > 0 ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="planner-card border border-slate-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                      {overview.todayFocus[0].subjectName}
                    </p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                      {overview.todayFocus[0].examTitle}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {overview.todayFocus[0].reason}
                    </p>
                  </div>
                  <span className="planner-chip border-slate-200 bg-white text-slate-700">
                    {riskLabel(
                      recommendationByExamId[overview.todayFocus[0].examId]?.risk ?? "medium",
                      t,
                    )}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="planner-card-soft bg-slate-50">
                    <p className="planner-eyebrow">{t.dailyTarget}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {overview.todayFocus[0].pages} {t.pages}
                    </p>
                    <p className="text-xs text-slate-500">
                      {overview.todayFocus[0].minutes} {t.minutes}
                    </p>
                  </div>
                  <div className="planner-card-soft bg-slate-50">
                    <p className="planner-eyebrow">{t.completion}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {recommendationByExamId[overview.todayFocus[0].examId]?.completionPercent ?? 0}%
                    </p>
                  </div>
                  <div className="planner-card-soft bg-slate-50">
                    <p className="planner-eyebrow">{t.materials}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {recommendationByExamId[overview.todayFocus[0].examId]?.linkedMaterialsCount ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">{t.linkedMaterials}</p>
                  </div>
                  <div className="planner-card-soft bg-slate-50">
                    <p className="planner-eyebrow">{t.weeklyTime}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {recommendationByExamId[overview.todayFocus[0].examId]?.weeklyAllocationHours ?? 0} {t.hours}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="planner-eyebrow">{t.scope}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {recommendationByExamId[overview.todayFocus[0].examId]?.scopeSummary}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/planner/focus?exam=${overview.todayFocus[0].examId}`}
                    className="planner-btn planner-btn-accent"
                  >
                    {t.openStudyToday}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedExamId(overview.todayFocus[0].examId)}
                    className="planner-btn planner-btn-secondary"
                  >
                    {t.openObjective}
                  </button>
                </div>
              </article>

              <div className="space-y-3">
                <div>
                  <p className="planner-eyebrow">{t.todayQueue}</p>
                </div>
                {overview.todayFocus.slice(1).map((item) => {
                  const recommendation = recommendationByExamId[item.examId];
                  return (
                    <article key={item.examId} className="planner-card bg-slate-50/90">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="planner-chip border-slate-200 bg-white text-slate-700">
                            {item.subjectName}
                          </p>
                          <h3 className="mt-3 text-base font-semibold text-slate-900">
                            {item.examTitle}
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
                        </div>
                        <span className="planner-chip border-slate-200 bg-white text-slate-700">
                          {item.minutes} {t.minutes}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="planner-chip border-slate-200 bg-white text-slate-700">
                          {item.pages} {t.pages}
                        </span>
                        <span className="planner-chip border-slate-200 bg-white text-slate-700">
                          {recommendation?.linkedMaterialsCount ?? 0} {t.linkedMaterials}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              {t.noRecentStudy}
            </div>
          )}
        </section>
      ) : null}

      {overview ? (
        <section className="planner-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{t.studyPlan}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.studyPlanHint}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.4fr]">
            <div className="space-y-3">
              {overview.examRecommendations.map((exam) => (
                <button
                  key={exam.examId}
                  type="button"
                  onClick={() => setSelectedExamId(exam.examId)}
                  className={`w-full rounded-[1.6rem] border p-4 text-left transition ${
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
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
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
                        {t.objectiveType}: {formatPlannerLabel(selectedExam.assessmentType)}
                      </span>
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {t.objectiveStatus}: {formatPlannerLabel(selectedExam.status)}
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
                      <p className="planner-eyebrow">{t.materials}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.linkedMaterialsCount}
                      </p>
                      <p className="text-xs text-slate-500">{t.linkedMaterials}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.protectedTime}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {overview.lightGamification.earnedFreeTimeHours} {t.hours}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="planner-card border border-slate-200 bg-white">
                  <p className="planner-eyebrow">{t.whyThisPlan}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.allocation}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.allocationReason}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="planner-eyebrow">{t.confidenceReason}</p>
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
                    <p className="planner-eyebrow">{t.riskDrivers}</p>
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
                  {selectedExam.linkedMaterialsCount === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {t.noMaterials}
                    </p>
                  ) : null}
                </article>

                <article className="planner-card border border-slate-200 bg-white">
                  <p className="planner-eyebrow">{t.recentStudy}</p>
                  {selectedExam.studyLogSummary.sessionsCompleted > 0 ? (
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p>
                        {selectedExam.studyLogSummary.sessionsCompleted} {t.sessions}
                      </p>
                      <p>
                        {selectedExam.studyLogSummary.minutesSpent} {t.minutes} |{" "}
                        {selectedExam.studyLogSummary.pagesCompleted} {t.pages}
                      </p>
                      <p>{selectedExam.studyLogSummary.lastTopic || t.noRecentStudy}</p>
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
        <Link
          href="/planner/exams"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.objectivesLink}</h3>
        </Link>
        <Link
          href="/planner/subjects"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.subjectsLink}</h3>
        </Link>
        <Link
          href="/planner/focus"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
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
