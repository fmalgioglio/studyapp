"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useSiteTheme } from "@/app/_hooks/use-site-theme";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { useAuthStudent } from "./_hooks/use-auth-student";
import { usePlannerData } from "./_hooks/use-planner-data";
import {
  buildSeasonPlan,
  type ExamProgressState,
  type FocusContributionLevel,
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
    socialArena: "Subject cohort arena",
    riskLow: "On Track",
    riskMedium: "Tight",
    riskHigh: "Critical",
    runSimulation: "Run dev simulation",
    refresh: "Refresh season",
    noMissions: "Add exams to generate your first mission board.",
    markDone: "Mark done",
    done: "Done",
    breakReminder: "Great push. Take a short break and hydrate before the next block.",
    mode: "Plan mode",
    focused: "Focused",
    balanced: "Balanced",
    full: "Full session",
    timeline: "Exam timeline explorer",
    openInExams: "Manage in Exams page",
    noTimeline: "Select an exam to view timeline details.",
    allExamsShown: "All exams are shown in Full session mode.",
    completed: "Completed",
    remaining: "Remaining",
    latestTopic: "Latest focus topic",
    noTopic: "No topic logged yet.",
    examsCount: "Exams",
    weekBudget: "Week budget",
    weeklyPages: "Weekly pages",
    risk: "Risk",
    rankingMetric: "Ranking metric: XP + consistency score.",
    momentum: "Momentum",
    loadingProfile: "Loading profile...",
    manageExams: "Manage Exams",
    manageExamsDesc: "Add all exams in your session.",
    subjectHub: "Subject Hub",
    subjectHubDesc: "Structure subjects for better algorithm fit",
    estimator: "Quick Estimator",
    estimatorDesc: "Run safe targets for each exam.",
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
    milestones: "Milestones",
    pagesUnit: "pages",
    minutesUnit: "min",
    xpLabel: "XP",
    streakLabel: "Streak",
    sessionsLabel: "Sessions",
    scoreLabel: "score",
    consistencyLabel: "consistency",
    examLabel: "Exam",
  },
  it: {
    badge: "Planner Sessione",
    title: "Sessione esami a missioni",
    subtitle:
      "Pianifica tutti gli esami in una board settimanale, completa quest e mantieni il ritmo.",
    todayQuests: "Missioni di oggi",
    weeklyBoard: "Board settimanale",
    socialArena: "Arena coorte materia",
    riskLow: "In carreggiata",
    riskMedium: "Tirato",
    riskHigh: "Critico",
    runSimulation: "Simulazione dev",
    refresh: "Aggiorna stagione",
    noMissions: "Aggiungi esami per generare la prima board.",
    markDone: "Completa",
    done: "Completata",
    breakReminder: "Ottimo ritmo. Fai una piccola pausa prima del prossimo blocco.",
    mode: "Modalita piano",
    focused: "Focalizzata",
    balanced: "Bilanciata",
    full: "Sessione completa",
    timeline: "Timeline esame",
    openInExams: "Gestisci nella pagina Esami",
    noTimeline: "Seleziona un esame per vedere i dettagli timeline.",
    allExamsShown: "In modalita Sessione completa vedi tutti gli esami.",
    completed: "Completato",
    remaining: "Residuo",
    latestTopic: "Ultimo topic focus",
    noTopic: "Nessun topic registrato.",
    examsCount: "Esami",
    weekBudget: "Budget settimanale",
    weeklyPages: "Pagine settimanali",
    risk: "Rischio",
    rankingMetric: "Metrica ranking: XP + consistenza.",
    momentum: "Momentum",
    loadingProfile: "Caricamento profilo...",
    manageExams: "Gestisci Esami",
    manageExamsDesc: "Aggiungi tutti gli esami della sessione.",
    subjectHub: "Hub Materie",
    subjectHubDesc: "Struttura le materie per migliorare l'algoritmo",
    estimator: "Stimatore Rapido",
    estimatorDesc: "Esegui target sicuri per ogni esame.",
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
    milestones: "Milestone",
    pagesUnit: "pagine",
    minutesUnit: "min",
    xpLabel: "XP",
    streakLabel: "Streak",
    sessionsLabel: "Sessioni",
    scoreLabel: "punteggio",
    consistencyLabel: "costanza",
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
  const { theme } = useSiteTheme("parrot");
  const t = COPY[language] ?? COPY.en;
  const { subjects, exams, errors, refresh } = usePlannerData({
    enabled: Boolean(student?.id),
    subscribeToRevision: false,
  });

  const [focusStats] = useState<FocusStats>(getFocusStats);
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(readFocusProgress);
  const [questCompletions, setQuestCompletions] = useState<Record<string, boolean>>(getQuestCompletions);
  const [seasonMode, setSeasonMode] = useState<"focused" | "balanced" | "full">("full");
  const [manualSelectedExamId, setManualSelectedExamId] = useState<string | null>(null);
  const [simXpReward, setSimXpReward] = useState(0);
  const [message, setMessage] = useState("");
  const dataErrorMessage = errors.subjects ?? errors.exams ?? "";
  const selectedExamId = manualSelectedExamId ?? searchParams.get("exam");

  useEffect(() => {
    localStorage.setItem(QUEST_COMPLETIONS_STORAGE_KEY, JSON.stringify(questCompletions));
  }, [questCompletions]);

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
      setFocusProgress(readFocusProgress());
    });
  }, []);

  const seasonPlan = useMemo(
    () => buildSeasonPlan(exams, student?.weeklyHours ?? 10, focusProgress, seasonMode),
    [exams, student?.weeklyHours, focusProgress, seasonMode],
  );
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
    setSimXpReward((current) => current + xp);
    if (completedCount % 2 === 0) {
      setMessage(`${language === "en" ? "Quest complete" : "Quest completata"}: +${xp} XP. ${t.breakReminder}`);
    } else {
      setMessage(`${language === "en" ? "Quest complete" : "Quest completata"}: +${xp} XP.`);
    }
  }

  function runSimulation() {
    const quests = seasonPlan.todayMissions;
    if (quests.length === 0) {
      setMessage(language === "en" ? "No missions available for simulation yet." : "Nessuna missione disponibile per la simulazione.");
      return;
    }

    const xp = quests.reduce((acc, quest) => acc + quest.xp, 0);
    const completed = { ...questCompletions };
    quests.forEach((quest) => {
      completed[missionKey(quest.examId, quest.subjectName, quest.pages, quest.minutes)] = true;
    });
    setQuestCompletions(completed);
    setSimXpReward((current) => current + xp);
    setMessage(
      language === "en"
        ? `Simulation complete: ${quests.length} quests cleared, +${xp} XP.`
        : `Simulazione completata: ${quests.length} missioni completate, +${xp} XP.`,
    );
  }

  const riskLabel =
    seasonPlan.riskLevel === "low"
      ? t.riskLow
      : seasonPlan.riskLevel === "medium"
        ? t.riskMedium
        : t.riskHigh;

  const mascotName = theme === "parrot" ? "Aero the Parrot" : "Nami the Dolphin";
  const mascotImage = theme === "parrot" ? "/mascots/parrot.svg" : "/mascots/dolphin.svg";

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
            <p className="mt-2 text-sm text-slate-700">
              Mascot coach: <strong>{mascotName}</strong>
            </p>
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
            <p className="text-2xl font-black text-slate-900">{seasonPlan.weeklyPagesTarget}</p>
          </div>
          <div className="planner-card bg-white/90">
            <p className="planner-eyebrow">{t.risk}</p>
            <p className="text-2xl font-black text-slate-900">{riskLabel}</p>
          </div>
        </div>
        <div className="planner-card mt-4 flex items-center gap-3 bg-white/90">
          <Image
            src={mascotImage}
            alt={mascotName}
            width={56}
            height={56}
            className="h-14 w-14 animate-[floaty_3.5s_ease-in-out_infinite]"
          />
          <p className="text-sm text-slate-700">
            {language === "en"
              ? "Mascot reaction: complete quests to unlock cheerful break reminders."
              : "Reazione mascotte: completa missioni per sbloccare reminder e ricompense."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
              <button
                type="button"
                onClick={runSimulation}
                className="planner-btn planner-btn-accent"
              >
                {t.runSimulation}
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
                    <p className="mt-3 text-sm text-slate-700">
                      <strong>{mission.pages} pages</strong> - <strong>{mission.minutes} min</strong>
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

        <div className="space-y-4">
          <section className="planner-panel">
            <h2 className="text-xl font-black text-slate-900">{t.socialArena}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.rankingMetric}</p>
            <ul className="mt-3 space-y-2">
              {seasonPlan.leaderboardPreview.map((entry) => (
                <li
                  key={entry.name}
                  className="planner-card-soft flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-slate-800">{entry.name}</span>
                  <span className="text-xs text-slate-600">
                    {entry.score} {t.scoreLabel} ({entry.xp} {t.xpLabel}, {entry.consistency}% {t.consistencyLabel})
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="planner-panel">
            <h2 className="text-lg font-black text-slate-900">{t.momentum}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="planner-card-soft p-2">
                <p className="planner-eyebrow">{t.xpLabel}</p>
                <p className="text-xl font-black text-slate-900">{focusStats.xp + simXpReward}</p>
              </div>
              <div className="planner-card-soft p-2">
                <p className="planner-eyebrow">{t.streakLabel}</p>
                <p className="text-xl font-black text-slate-900">{focusStats.streak}d</p>
              </div>
              <div className="planner-card-soft p-2">
                <p className="planner-eyebrow">{t.sessionsLabel}</p>
                <p className="text-xl font-black text-slate-900">{focusStats.sessionsCompleted}</p>
              </div>
            </div>
          </section>
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
          <h2 className="text-xl font-black text-slate-900">{t.timeline}</h2>
          <Link
            href="/planner/exams"
            className="planner-btn planner-btn-secondary"
          >
            {t.openInExams}
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {seasonPlan.examTracks.map((track) => (
            <button
              key={track.examId}
              type="button"
              onClick={() => setManualSelectedExamId(track.examId)}
              className={`planner-btn ${selectedTrack?.examId === track.examId ? "planner-btn-primary" : "planner-btn-secondary"}`}
            >
              {track.subjectName} ({track.completionPercent}%)
            </button>
          ))}
        </div>

        {selectedTrack ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.examLabel}</p>
              <p className="text-sm font-bold text-slate-900">{selectedTrack.examTitle}</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.daysLeft}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.daysLeft}</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.dailyTarget}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.recommendedPagesPerDay}p</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.dailyFocus}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.recommendedMinutesPerDay}m</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.readiness}</p>
              <p
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-sm font-semibold ${progressStateClasses(selectedTrack.progressState)}`}
              >
                {getProgressStateLabel(selectedTrack.progressState, t)}
              </p>
            </div>

            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.completed}</p>
              <p className="text-xl font-black text-slate-900">
                {selectedTrack.completedPages}p ({selectedTrack.completionPercent}%)
              </p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.remaining}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.remainingPages}p</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.focusContribution}</p>
              <p
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-sm font-semibold ${focusContributionClasses(selectedTrack.focusContributionLevel)}`}
              >
                {getFocusContributionLabel(selectedTrack.focusContributionLevel, t)} (
                {selectedTrack.focusContributionPercent}%)
              </p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.focusMinutes}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.minutesSpent}m</p>
            </div>
            <div className="planner-card bg-slate-50">
              <p className="planner-eyebrow">{t.focusSessions}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.sessionsCompleted}</p>
            </div>
            <div className="planner-card bg-slate-50 md:col-span-2">
              <p className="planner-eyebrow">{t.latestTopic}</p>
              <p className="text-sm font-semibold text-slate-900">
                {selectedTrack.lastTopic || t.noTopic}
              </p>
            </div>

            <div className="planner-card bg-slate-50 md:col-span-4">
              <p className="planner-eyebrow">{t.milestones}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {selectedTrack.weeklyMilestones.map((milestone) => (
                  <li key={milestone}>{milestone}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{t.noTimeline}</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          href="/planner/estimate"
          className="planner-card transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.estimator}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.estimatorDesc}</p>
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
