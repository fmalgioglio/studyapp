"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { useAuthStudent } from "./_hooks/use-auth-student";
import { usePlannerData } from "./_hooks/use-planner-data";
import {
  buildSeasonPlan,
  type ExamProgressState,
  type FocusContributionLevel,
  type SeasonPlan,
} from "./_lib/season-engine";
import { readFocusProgress, subscribeDataRevision } from "./_lib/focus-progress";
import {
  focusContributionClasses,
  progressStateClasses,
  urgencyClasses,
} from "./_lib/status-ui";

type FocusStats = {
  xp: number;
  streak: number;
  sessionsCompleted: number;
};

const QUEST_COMPLETIONS_STORAGE_KEY = "studyapp_quest_completions";

const COPY = {
  en: {
    badge: "Season Planner",
    title: "Mission-driven exam season",
    subtitle:
      "Plan all exams in one weekly board, complete quests, and keep momentum with rewarding loops.",
    todayQuests: "Today quests",
    weeklyBoard: "Weekly board",
    riskLow: "On Track",
    riskMedium: "Tight",
    riskHigh: "Critical",
    refresh: "Refresh season",
    noMissions: "Add exams to generate your first mission board.",
    markDone: "Mark done",
    done: "Done",
    breakReminder: "Great push. Take a short break and hydrate before the next block.",
    mode: "Plan mode",
    focused: "Focused",
    balanced: "Balanced",
    full: "Full session",
    timeline: "Exam plan",
    openInExams: "Open in Exams",
    timelineHint: "Review one exam at a time and keep the plan clear.",
    examList: "Exam list",
    planOverview: "Selected exam",
    studyPace: "Study pace",
    studyProgress: "Study progress",
    recentStudy: "Recent study",
    nextSteps: "Next steps",
    completionLabel: "Completion",
    lastUpdate: "Last update",
    noStudyData: "No recent study recorded.",
    noTimeline: "Select an exam to view the plan.",
    allExamsShown: "All exams are shown in Full session mode.",
    completed: "Completed",
    remaining: "Remaining",
    latestTopic: "Latest focus topic",
    examsCount: "Exams",
    weekBudget: "Week budget",
    weeklyPages: "Weekly pages",
    risk: "Risk",
    loadingProfile: "Loading profile...",
    manageExams: "Manage Exams",
    manageExamsDesc: "Add all exams in your session.",
    subjectHub: "Subject Hub",
    subjectHubDesc: "Structure subjects for better algorithm fit",
    focusArena: "Focus Arena",
    focusArenaDesc: "Fixed blocks and reward reactions.",
    daysLeft: "Days left",
    dailyTarget: "Daily target",
    dailyFocus: "Daily focus",
    readiness: "Readiness",
    focusContribution: "Focus contribution",
    focusMinutes: "Focus minutes",
    focusSessions: "Focus sessions",
    statusNotStarted: "Not started",
    statusWarmingUp: "Warming up",
    statusSteady: "Steady",
    statusAlmostReady: "Almost ready",
    statusReady: "Ready",
    contributionNone: "None",
    contributionLow: "Low",
    contributionMedium: "Medium",
    contributionHigh: "High",
    pagesUnit: "pages",
    minutesUnit: "min",
    xpLabel: "XP",
    streakLabel: "Streak",
    sessionsLabel: "Sessions",
    examLabel: "Exam",
  },
  it: {
    badge: "Planner Sessione",
    title: "Sessione esami a missioni",
    subtitle:
      "Pianifica tutti gli esami in una board settimanale, completa quest e mantieni il ritmo.",
    todayQuests: "Missioni di oggi",
    weeklyBoard: "Board settimanale",
    riskLow: "In carreggiata",
    riskMedium: "Tirato",
    riskHigh: "Critico",
    refresh: "Aggiorna stagione",
    noMissions: "Aggiungi esami per generare la prima board.",
    markDone: "Completa",
    done: "Completata",
    breakReminder: "Ottimo ritmo. Fai una piccola pausa prima del prossimo blocco.",
    mode: "Modalita piano",
    focused: "Focalizzata",
    balanced: "Bilanciata",
    full: "Sessione completa",
    timeline: "Piano esame",
    openInExams: "Apri in Esami",
    timelineHint: "Qui vedi un esame alla volta, con il piano essenziale.",
    examList: "Elenco esami",
    planOverview: "Esame selezionato",
    studyPace: "Ritmo di studio",
    studyProgress: "Avanzamento studio",
    recentStudy: "Studio recente",
    nextSteps: "Prossimi passi",
    completionLabel: "Completamento",
    lastUpdate: "Ultimo aggiornamento",
    noStudyData: "Nessuna attività recente registrata.",
    noTimeline: "Seleziona un esame per vedere il piano.",
    allExamsShown: "In modalita Sessione completa vedi tutti gli esami.",
    completed: "Completato",
    remaining: "Residuo",
    latestTopic: "Ultimo topic focus",
    examsCount: "Esami",
    weekBudget: "Budget settimanale",
    weeklyPages: "Pagine settimanali",
    risk: "Rischio",
    loadingProfile: "Caricamento profilo...",
    manageExams: "Gestisci Esami",
    manageExamsDesc: "Aggiungi tutti gli esami della sessione.",
    subjectHub: "Hub Materie",
    subjectHubDesc: "Struttura le materie per migliorare l'algoritmo",
    focusArena: "Arena Focus",
    focusArenaDesc: "Blocchi fissi e ricompense.",
    daysLeft: "Giorni rimanenti",
    dailyTarget: "Target giornaliero",
    dailyFocus: "Focus giornaliero",
    readiness: "Prontezza",
    focusContribution: "Contributo focus",
    focusMinutes: "Minuti focus",
    focusSessions: "Sessioni focus",
    statusNotStarted: "Non iniziato",
    statusWarmingUp: "In avvio",
    statusSteady: "Costante",
    statusAlmostReady: "Quasi pronto",
    statusReady: "Pronto",
    contributionNone: "Nullo",
    contributionLow: "Basso",
    contributionMedium: "Medio",
    contributionHigh: "Alto",
    pagesUnit: "pagine",
    minutesUnit: "min",
    xpLabel: "XP",
    streakLabel: "Streak",
    sessionsLabel: "Sessioni",
    examLabel: "Esame",
  },
} as const;

type FocusProgressMap = Record<
  string,
  {
    pagesCompleted: number;
    minutesSpent: number;
    sessionsCompleted: number;
    lastTopic: string;
    updatedAt: string;
  }
>;

const HYDRATION_SUBSCRIBE = () => () => {};
const getHydratedSnapshot = () => true;
const getHydratedServerSnapshot = () => false;

const EMPTY_SEASON_PLAN: SeasonPlan = {
  totalExams: 0,
  weeklyMinutesBudget: 0,
  weeklyPagesTarget: 0,
  riskLevel: "low",
  riskMessage: "",
  dayRows: [],
  todayMissions: [],
  examTracks: [],
  leaderboardPreview: [],
};

function getFocusStats(): FocusStats {
  if (typeof window === "undefined") return { xp: 0, streak: 0, sessionsCompleted: 0 };
  const raw = localStorage.getItem("studyapp_focus_stats");
  if (!raw) return { xp: 0, streak: 0, sessionsCompleted: 0 };
  try {
    const parsed = JSON.parse(raw) as FocusStats;
    return {
      xp: parsed.xp ?? 0,
      streak: parsed.streak ?? 0,
      sessionsCompleted: parsed.sessionsCompleted ?? 0,
    };
  } catch {
    return { xp: 0, streak: 0, sessionsCompleted: 0 };
  }
}

function getQuestCompletions() {
  if (typeof window === "undefined") return {} as Record<string, boolean>;
  const raw = localStorage.getItem(QUEST_COMPLETIONS_STORAGE_KEY);
  if (!raw) return {} as Record<string, boolean>;
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {} as Record<string, boolean>;
  }
}

type PlannerCopy = (typeof COPY)[keyof typeof COPY];
type PlannerLanguage = keyof typeof COPY;
type ExamTrack = SeasonPlan["examTracks"][number];

function getProgressStateLabel(state: ExamProgressState, t: PlannerCopy) {
  if (state === "ready") return t.statusReady;
  if (state === "almost_ready") return t.statusAlmostReady;
  if (state === "steady") return t.statusSteady;
  if (state === "warming_up") return t.statusWarmingUp;
  return t.statusNotStarted;
}

function getFocusContributionLabel(level: FocusContributionLevel, t: PlannerCopy) {
  if (level === "high") return t.contributionHigh;
  if (level === "medium") return t.contributionMedium;
  if (level === "low") return t.contributionLow;
  return t.contributionNone;
}

function formatExamDate(dateIso: string, language: PlannerLanguage) {
  const locale = language === "it" ? "it-IT" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateIso));
}

function formatUpdatedAt(updatedAt: string, language: PlannerLanguage) {
  if (!updatedAt) return "";

  const locale = language === "it" ? "it-IT" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}

function buildExamPlanSteps(track: ExamTrack, t: PlannerCopy, language: PlannerLanguage) {
  // Keep this section grounded in tracked data instead of generated milestone copy.
  if (language === "it") {
    return [
      track.remainingPages > 0
        ? `${track.remainingPages} ${t.pagesUnit} da coprire prima della data d'esame.`
        : `${track.completionPercent}% di ${t.completionLabel.toLowerCase()} e nessuna pagina residua nel piano attuale.`,
      track.recommendedMinutesPerDay > 0 || track.recommendedPagesPerDay > 0
        ? `${track.recommendedPagesPerDay} ${t.pagesUnit} e ${track.recommendedMinutesPerDay} ${t.minutesUnit} al giorno tengono il piano in linea.`
        : `Non resta un target giornaliero per questo esame nel piano attuale.`,
      track.sessionsCompleted === 0
        ? `Nessuna sessione registrata finora. Inizia con un primo blocco su ${track.subjectName}.`
        : `${track.sessionsCompleted} sessioni di studio già registrate per questo esame.`,
    ];
  }

  return [
    track.remainingPages > 0
      ? `${track.remainingPages} ${t.pagesUnit} left to cover before the exam date.`
      : `${track.completionPercent}% ${t.completionLabel.toLowerCase()} and no pages left in the current plan.`,
    track.recommendedMinutesPerDay > 0 || track.recommendedPagesPerDay > 0
      ? `${track.recommendedPagesPerDay} ${t.pagesUnit} and ${track.recommendedMinutesPerDay} ${t.minutesUnit} per day keep this plan on pace.`
      : `No daily target remains for this exam in the current plan.`,
    track.sessionsCompleted === 0
      ? `No focus sessions logged yet. Start with one study block for ${track.subjectName}.`
      : `${track.sessionsCompleted} study sessions already logged for this exam.`,
  ];
}

function missionKey(examId: string, subjectName: string, pages: number, minutes: number) {
  return `${examId}:${subjectName}:${pages}:${minutes}`;
}

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

export default function PlannerOverviewPage() {
  const { student, loading } = useAuthStudent();
  const searchParams = useSearchParams();
  const { language } = useUiLanguage("en");
  const plannerLanguage: PlannerLanguage = language === "it" ? "it" : "en";
  const t = COPY[plannerLanguage];
  const { subjects, exams, errors, refresh } = usePlannerData({
    enabled: Boolean(student?.id),
    subscribeToRevision: false,
  });

  const [focusStats] = useState<FocusStats>(() => getFocusStats());
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(() =>
    readFocusProgress(),
  );
  const [questCompletions, setQuestCompletions] = useState<Record<string, boolean>>(
    () => getQuestCompletions(),
  );
  const storageHydrated = useSyncExternalStore(
    HYDRATION_SUBSCRIBE,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );
  const [seasonMode, setSeasonMode] = useState<"focused" | "balanced" | "full">("full");
  const [manualSelectedExamId, setManualSelectedExamId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const dataErrorMessage = errors.subjects ?? errors.exams ?? "";
  const selectedExamId = manualSelectedExamId ?? searchParams.get("exam");

  useEffect(() => {
    if (!storageHydrated) return;
    localStorage.setItem(QUEST_COMPLETIONS_STORAGE_KEY, JSON.stringify(questCompletions));
  }, [questCompletions, storageHydrated]);

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
      setFocusProgress(readFocusProgress());
    });
  }, []);

  const seasonPlan = useMemo(() => {
    if (!storageHydrated) return EMPTY_SEASON_PLAN;
    return buildSeasonPlan(exams, student?.weeklyHours ?? 10, focusProgress, seasonMode);
  }, [exams, student?.weeklyHours, focusProgress, seasonMode, storageHydrated]);
  // The season engine is the source of truth for one rendered track per exam.
  const examTrackById = useMemo(
    () => new Map(seasonPlan.examTracks.map((track) => [track.examId, track])),
    [seasonPlan.examTracks],
  );
  const completionByExamId = useMemo(
    () =>
      seasonPlan.examTracks.reduce<Record<string, number>>((acc, track) => {
        acc[track.examId] = track.completionPercent;
        return acc;
      }, {}),
    [seasonPlan.examTracks],
  );
  const selectedTrack = useMemo(() => {
    if (!selectedExamId) return seasonPlan.examTracks[0] ?? null;
    // Keep invalid or deleted exam links in an explicit empty state instead of silently switching exams.
    return seasonPlan.examTracks.find((track) => track.examId === selectedExamId) ?? null;
  }, [seasonPlan.examTracks, selectedExamId]);

  async function refreshSeasonData() {
    const result = await refresh();
    if (!result.ok) {
      if (!result.skipped) {
        setMessage(result.errors.subjects ?? result.errors.exams ?? "Failed to refresh data");
      }
      return;
    }
    setMessage(language === "en" ? "Season synced." : "Stagione sincronizzata.");
  }

  function completeQuest(key: string, xp: number) {
    if (questCompletions[key]) return;
    const next = { ...questCompletions, [key]: true };
    setQuestCompletions(next);
    const completedCount = Object.values(next).filter(Boolean).length;
    if (completedCount % 2 === 0) {
      setMessage(`${language === "en" ? "Quest complete" : "Quest completata"}: +${xp} XP. ${t.breakReminder}`);
    } else {
      setMessage(`${language === "en" ? "Quest complete" : "Quest completata"}: +${xp} XP.`);
    }
  }

  const riskLabel =
    seasonPlan.riskLevel === "low"
      ? t.riskLow
      : seasonPlan.riskLevel === "medium"
        ? t.riskMedium
        : t.riskHigh;

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="planner-chip border-white/80 bg-white/80 text-slate-700">
              {t.badge}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">{t.subtitle}</p>
            <p className="mt-1 text-xs text-slate-500">{t.allExamsShown}</p>
          </div>
          <div className="planner-card max-w-sm bg-white/90">
            <p className="planner-eyebrow">{t.mode}</p>
            <div className="mt-2 flex gap-2">
              {(
                [
                  { id: "focused", label: t.focused },
                  { id: "balanced", label: t.balanced },
                  { id: "full", label: t.full },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSeasonMode(option.id)}
                  className={`planner-btn ${seasonMode === option.id ? "planner-btn-primary" : "planner-btn-secondary"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="planner-card bg-white/90">
            <p className="planner-eyebrow">{t.examsCount}</p>
            <p className="text-2xl font-black text-slate-900">{seasonPlan.totalExams}</p>
          </div>
          <div className="planner-card bg-white/90">
            <p className="planner-eyebrow">{t.weekBudget}</p>
            <p className="text-2xl font-black text-slate-900">{seasonPlan.weeklyMinutesBudget} min</p>
          </div>
          <div className="planner-card bg-white/90">
            <p className="planner-eyebrow">{t.weeklyPages}</p>
            <p className="text-lg font-semibold text-slate-700">{seasonPlan.weeklyPagesTarget}</p>
          </div>
          <div className="planner-card bg-white/90">
            <p className="planner-eyebrow">{t.risk}</p>
            <p className="text-2xl font-black text-slate-900">{riskLabel}</p>
          </div>
        </div>
        <div className="planner-card mt-4 bg-white/90">
          <p className="planner-eyebrow">{language === "en" ? "Streak log" : "Registro streak"}</p>
          <p className="mt-1 text-sm text-slate-700">
            {language === "en"
              ? "Steady progress summary for today and this season."
              : "Riepilogo progressi stabile per oggi e per la stagione."}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="planner-eyebrow">{t.streakLabel}</p>
              <p className="text-lg font-semibold text-slate-900">{focusStats.streak}d</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="planner-eyebrow">{t.sessionsLabel}</p>
              <p className="text-lg font-semibold text-slate-900">{focusStats.sessionsCompleted}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="planner-eyebrow">{t.xpLabel}</p>
              <p className="text-lg font-semibold text-slate-900">{focusStats.xp}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="planner-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black text-slate-900">{t.todayQuests}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshSeasonData}
                className="planner-btn planner-btn-secondary"
              >
                {t.refresh}
              </button>
            </div>
          </div>

          {seasonPlan.todayMissions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{t.noMissions}</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {seasonPlan.todayMissions.map((mission) => {
                const key = missionKey(
                  mission.examId,
                  mission.subjectName,
                  mission.pages,
                  mission.minutes,
                );
                const missionTrack = examTrackById.get(mission.examId);
                const done = Boolean(questCompletions[key]);
                return (
                  <article
                    key={key}
                    className={`planner-card ${done ? "border-emerald-300 bg-emerald-50" : "bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{mission.subjectName}</p>
                      <span
                        className={`planner-chip ${urgencyClasses(mission.urgency)}`}
                      >
                        {mission.urgency}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{mission.examTitle}</p>
                    {examTrackById.get(mission.examId) ? (
                      <p className="mt-1 text-xs text-slate-600">
                        {t.readiness}:{" "}
                        <strong>
                          {missionTrack ? getProgressStateLabel(missionTrack.progressState, t) : ""}
                        </strong>
                        {missionTrack ? ` (${missionTrack.completionPercent}%)` : ""}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      {mission.minutes} {t.minutesUnit}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mission.pages} {t.pagesUnit}
                    </p>
                    <p className="text-xs text-indigo-700">Reward: +{mission.xp} XP</p>
                    <button
                      type="button"
                      onClick={() => completeQuest(key, mission.xp)}
                      disabled={done}
                      className={`planner-btn mt-2 w-full ${
                        done
                          ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                          : "planner-btn-secondary"
                      }`}
                    >
                      {done ? t.done : t.markDone}
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualSelectedExamId(mission.examId)}
                      className="planner-btn planner-btn-secondary mt-2 w-full"
                    >
                      {t.timeline}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <WeeklyBoardSection
        title={t.weeklyBoard}
        riskMessage={seasonPlan.riskMessage}
        dayRows={seasonPlan.dayRows}
        completionByExamId={completionByExamId}
        pagesUnitLabel={t.pagesUnit}
        minutesUnitLabel={t.minutesUnit}
      />

      <section className="planner-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-slate-900">{t.timeline}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.timelineHint}</p>
          </div>
          <Link
            href="/planner/exams"
            className="planner-btn planner-btn-secondary"
          >
            {t.openInExams}
          </Link>
        </div>

        {seasonPlan.examTracks.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.4fr]">
            <div>
              <p className="planner-eyebrow px-1">{t.examList}</p>
              <div className="mt-2 space-y-3" role="listbox" aria-label={t.examList}>
                {seasonPlan.examTracks.map((track) => {
                  const selected = selectedTrack?.examId === track.examId;

                  return (
                    <button
                      key={track.examId}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setManualSelectedExamId(track.examId)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selected
                          ? "border-slate-300 bg-white shadow-sm ring-1 ring-slate-200"
                          : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                            {track.subjectName}
                          </span>
                          <p className="mt-3 text-base font-semibold text-slate-900">
                            {track.examTitle}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatExamDate(track.examDate, plannerLanguage)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${progressStateClasses(track.progressState)}`}
                        >
                          {getProgressStateLabel(track.progressState, t)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="planner-eyebrow">{t.daysLeft}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {track.daysLeft}
                          </p>
                        </div>
                        <div>
                          <p className="planner-eyebrow">{t.completionLabel}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {track.completionPercent}%
                          </p>
                        </div>
                        <div>
                          <p className="planner-eyebrow">{t.readiness}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {getProgressStateLabel(track.progressState, t)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="planner-eyebrow px-1">{t.planOverview}</p>
              {selectedTrack ? (
                <div className="mt-2 space-y-3">
                  <article className="planner-card border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                          {selectedTrack.subjectName}
                        </span>
                        <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                          {selectedTrack.examTitle}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {formatExamDate(selectedTrack.examDate, plannerLanguage)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${progressStateClasses(selectedTrack.progressState)}`}
                        >
                          {getProgressStateLabel(selectedTrack.progressState, t)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${focusContributionClasses(selectedTrack.focusContributionLevel)}`}
                        >
                          {t.focusContribution}: {selectedTrack.focusContributionPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="planner-eyebrow">{t.daysLeft}</p>
                        <p className="mt-1 text-2xl font-black text-slate-900">
                          {selectedTrack.daysLeft}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="planner-eyebrow">{t.completionLabel}</p>
                        <p className="mt-1 text-2xl font-black text-slate-900">
                          {selectedTrack.completionPercent}%
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="planner-eyebrow">{t.focusContribution}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {getFocusContributionLabel(selectedTrack.focusContributionLevel, t)}
                        </p>
                      </div>
                    </div>
                  </article>

                  <div className="grid gap-3 md:grid-cols-3">
                    <article className="planner-card border border-slate-200 bg-slate-50/90">
                      <p className="planner-eyebrow">{t.studyPace}</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-sm text-slate-500">{t.dailyTarget}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.recommendedPagesPerDay} {t.pagesUnit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">{t.dailyFocus}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.recommendedMinutesPerDay} {t.minutesUnit}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="planner-card border border-slate-200 bg-slate-50/90">
                      <p className="planner-eyebrow">{t.studyProgress}</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-sm text-slate-500">{t.completed}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.completedPages} {t.pagesUnit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">{t.remaining}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.remainingPages} {t.pagesUnit}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">{t.completionLabel}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.completionPercent}%
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="planner-card border border-slate-200 bg-slate-50/90">
                      <p className="planner-eyebrow">{t.recentStudy}</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {selectedTrack.lastTopic || t.noStudyData}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-500">{t.focusSessions}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.sessionsCompleted}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">{t.focusMinutes}</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {selectedTrack.minutesSpent} {t.minutesUnit}
                          </p>
                        </div>
                      </div>
                      {selectedTrack.updatedAt ? (
                        <p className="mt-4 text-xs text-slate-500">
                          {t.lastUpdate}: {formatUpdatedAt(selectedTrack.updatedAt, plannerLanguage)}
                        </p>
                      ) : null}
                    </article>
                  </div>

                  <article className="planner-card border border-slate-200 bg-white">
                    <p className="planner-eyebrow">{t.nextSteps}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {buildExamPlanSteps(selectedTrack, t, plannerLanguage).map((step) => (
                        <li key={step} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{t.noTimeline}</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/planner/exams"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.manageExams}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.manageExamsDesc}</p>
        </Link>
        <Link
          href="/planner/subjects"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.subjectHub}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {t.subjectHubDesc} ({subjects.length} loaded).
          </p>
        </Link>
        <Link
          href="/planner/focus"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.focusArena}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.focusArenaDesc}</p>
        </Link>
      </section>

      {loading ? (
        <section className="planner-panel space-y-3 py-3">
          <p className="text-sm text-slate-700">{t.loadingProfile}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="planner-skeleton h-16" />
            <div className="planner-skeleton h-16" />
            <div className="planner-skeleton h-16" />
          </div>
        </section>
      ) : null}

      {message || dataErrorMessage ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message || dataErrorMessage}
        </section>
      ) : null}
    </main>
  );
}
