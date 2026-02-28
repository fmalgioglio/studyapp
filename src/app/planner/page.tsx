"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useSiteTheme } from "@/app/_hooks/use-site-theme";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { useAuthStudent } from "./_hooks/use-auth-student";
import { requestJson } from "./_lib/client-api";
import { buildSeasonPlan } from "./_lib/season-engine";
import { readFocusProgress, subscribeDataRevision } from "./_lib/focus-progress";

type Subject = {
  id: string;
  name: string;
  color: string | null;
};

type Exam = {
  id: string;
  title: string;
  examDate: string;
  subject: {
    id: string;
    name: string;
  };
};

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
    milestones: "Milestones",
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
    milestones: "Milestone",
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

function urgencyClasses(level: "low" | "medium" | "high") {
  if (level === "low") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (level === "medium") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-rose-100 text-rose-900 border-rose-200";
}

function missionKey(examId: string, subjectName: string, pages: number, minutes: number) {
  return `${examId}:${subjectName}:${pages}:${minutes}`;
}

export default function PlannerOverviewPage() {
  const { student, loading } = useAuthStudent();
  const searchParams = useSearchParams();
  const { language } = useUiLanguage("en");
  const { theme } = useSiteTheme("parrot");
  const t = COPY[language] ?? COPY.en;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [focusStats] = useState<FocusStats>(getFocusStats);
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(readFocusProgress);
  const [questCompletions, setQuestCompletions] = useState<Record<string, boolean>>(getQuestCompletions);
  const [seasonMode, setSeasonMode] = useState<"focused" | "balanced" | "full">("full");
  const [manualSelectedExamId, setManualSelectedExamId] = useState<string | null>(null);
  const [simXpReward, setSimXpReward] = useState(0);
  const [message, setMessage] = useState("");
  const selectedExamId = manualSelectedExamId ?? searchParams.get("exam");

  useEffect(() => {
    localStorage.setItem(QUEST_COMPLETIONS_STORAGE_KEY, JSON.stringify(questCompletions));
  }, [questCompletions]);

  useEffect(() => {
    return subscribeDataRevision(() => {
      setFocusProgress(readFocusProgress());
      void Promise.all([requestJson<Subject[]>("/api/subjects"), requestJson<Exam[]>("/api/exams")]).then(
        ([subjectsRes, examsRes]) => {
          if (subjectsRes.ok && subjectsRes.payload.data) {
            setSubjects(subjectsRes.payload.data);
          }
          if (examsRes.ok && examsRes.payload.data) {
            setExams(examsRes.payload.data);
          }
        },
      );
    });
  }, []);

  const seasonPlan = useMemo(
    () => buildSeasonPlan(exams, student?.weeklyHours ?? 10, focusProgress, seasonMode),
    [exams, student?.weeklyHours, focusProgress, seasonMode],
  );
  const selectedTrack = useMemo(() => {
    if (!selectedExamId) return seasonPlan.examTracks[0] ?? null;
    return seasonPlan.examTracks.find((track) => track.examId === selectedExamId) ?? null;
  }, [seasonPlan.examTracks, selectedExamId]);

  useEffect(() => {
    if (!student?.id) return;

    let active = true;
    async function load() {
      const [subjectsRes, examsRes] = await Promise.all([
        requestJson<Subject[]>("/api/subjects"),
        requestJson<Exam[]>("/api/exams"),
      ]);
      if (!active) return;
      if (subjectsRes.ok && subjectsRes.payload.data) setSubjects(subjectsRes.payload.data);
      if (examsRes.ok && examsRes.payload.data) setExams(examsRes.payload.data);
      if (!subjectsRes.ok || !examsRes.ok) {
        setMessage(subjectsRes.payload.error ?? examsRes.payload.error ?? "Failed to refresh data");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [student?.id]);

  async function refreshSeasonData() {
    if (!student?.id) return;
    const [subjectsRes, examsRes] = await Promise.all([
      requestJson<Subject[]>("/api/subjects"),
      requestJson<Exam[]>("/api/exams"),
    ]);

    if (subjectsRes.ok && subjectsRes.payload.data) setSubjects(subjectsRes.payload.data);
    if (examsRes.ok && examsRes.payload.data) setExams(examsRes.payload.data);
    if (!subjectsRes.ok || !examsRes.ok) {
      setMessage(subjectsRes.payload.error ?? examsRes.payload.error ?? "Failed to refresh data");
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
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#cffafe_0%,#fde68a_45%,#ffffff_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {t.badge}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">{t.subtitle}</p>
            <p className="mt-2 text-sm text-slate-700">
              Mascot coach: <strong>{mascotName}</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">{t.allExamsShown}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.mode}</p>
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
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    seasonMode === option.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.examsCount}</p>
            <p className="text-2xl font-black text-slate-900">{seasonPlan.totalExams}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.weekBudget}</p>
            <p className="text-2xl font-black text-slate-900">{seasonPlan.weeklyMinutesBudget} min</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.weeklyPages}</p>
            <p className="text-2xl font-black text-slate-900">{seasonPlan.weeklyPagesTarget}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.risk}</p>
            <p className="text-2xl font-black text-slate-900">{riskLabel}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3">
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
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black text-slate-900">{t.todayQuests}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshSeasonData}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.refresh}
              </button>
              <button
                type="button"
                onClick={runSimulation}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
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
                const done = Boolean(questCompletions[key]);
                return (
                  <article
                    key={key}
                    className={`rounded-2xl border p-4 ${done ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{mission.subjectName}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${urgencyClasses(mission.urgency)}`}
                      >
                        {mission.urgency}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{mission.examTitle}</p>
                    <p className="mt-3 text-sm text-slate-700">
                      <strong>{mission.pages} pages</strong> - <strong>{mission.minutes} min</strong>
                    </p>
                    <p className="text-xs text-indigo-700">Reward: +{mission.xp} XP</p>
                    <button
                      type="button"
                      onClick={() => completeQuest(key, mission.xp)}
                      disabled={done}
                      className={`mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold ${
                        done
                          ? "cursor-not-allowed border border-emerald-300 bg-emerald-100 text-emerald-800"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {done ? t.done : t.markDone}
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualSelectedExamId(mission.examId)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">{t.socialArena}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.rankingMetric}</p>
            <ul className="mt-3 space-y-2">
              {seasonPlan.leaderboardPreview.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-slate-800">{entry.name}</span>
                  <span className="text-xs text-slate-600">
                    {entry.score} score ({entry.xp} XP, {entry.consistency}% consistency)
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{t.momentum}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-xs uppercase text-slate-500">XP</p>
                <p className="text-xl font-black text-slate-900">{focusStats.xp + simXpReward}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-xs uppercase text-slate-500">Streak</p>
                <p className="text-xl font-black text-slate-900">{focusStats.streak}d</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-xs uppercase text-slate-500">Sessions</p>
                <p className="text-xl font-black text-slate-900">{focusStats.sessionsCompleted}</p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">{t.weeklyBoard}</h2>
        <p className="mt-1 text-sm text-slate-600">{seasonPlan.riskMessage}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {seasonPlan.dayRows.map((day) => (
            <article key={day.dateIso} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{day.label}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {day.totalPages} pages - {day.totalMinutes} min
              </p>
              <ul className="mt-2 space-y-1">
                {day.missions.slice(0, 2).map((mission) => (
                  <li
                    key={`${day.dateIso}-${mission.examId}`}
                    className="rounded-lg bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {mission.subjectName}: {mission.pages}p
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black text-slate-900">{t.timeline}</h2>
          <Link
            href="/planner/exams"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                selectedTrack?.examId === track.examId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {track.subjectName}
            </button>
          ))}
        </div>

        {selectedTrack ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Exam</p>
              <p className="text-sm font-bold text-slate-900">{selectedTrack.examTitle}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.daysLeft}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.daysLeft}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.dailyTarget}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.recommendedPagesPerDay}p</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.dailyFocus}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.recommendedMinutesPerDay}m</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.completed}</p>
              <p className="text-xl font-black text-slate-900">
                {selectedTrack.completedPages}p ({selectedTrack.completionPercent}%)
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.remaining}</p>
              <p className="text-xl font-black text-slate-900">{selectedTrack.remainingPages}p</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.latestTopic}</p>
              <p className="text-sm font-semibold text-slate-900">
                {focusProgress[selectedTrack.examId]?.lastTopic || t.noTopic}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t.milestones}</p>
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
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.manageExams}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.manageExamsDesc}</p>
        </Link>
        <Link
          href="/planner/subjects"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.subjectHub}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {t.subjectHubDesc} ({subjects.length} loaded).
          </p>
        </Link>
        <Link
          href="/planner/estimate"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.estimator}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.estimatorDesc}</p>
        </Link>
        <Link
          href="/planner/focus"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <h3 className="font-bold text-slate-900">{t.focusArena}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.focusArenaDesc}</p>
        </Link>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {t.loadingProfile}
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </section>
      ) : null}
    </main>
  );
}
