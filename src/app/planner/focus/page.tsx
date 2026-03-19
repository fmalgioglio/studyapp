"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import {
  notifyDataRevision,
  recordFocusProgress,
} from "@/app/planner/_lib/focus-progress";
import { calculateFocusSessionXp } from "@/app/planner/_lib/focus-xp";
import { useAuthStudent } from "../_hooks/use-auth-student";
import { usePlannerOverview } from "../_hooks/use-planner-overview";
import { requestJson } from "../_lib/client-api";

type FocusStats = {
  xp: number;
  streak: number;
  sessionsCompleted: number;
  lastCompletionDate: string;
};

type SessionStage = "idle" | "running" | "paused" | "review";
type SessionOutcome = "completed" | "partial" | null;

const FOCUS_PRESETS = [
  { minutes: 25, key: "sprint" },
  { minutes: 45, key: "deep" },
  { minutes: 60, key: "exam" },
] as const;

const COPY = {
  en: {
    title: "Study Today",
    subtitle:
      "Open one clean focus block, follow the timer, then log what you actually completed.",
    xp: "Focus score",
    streak: "Streak",
    sessions: "Sessions",
    objective: "Objective",
    availableTime: "Time available today",
    timer: "Focus timer",
    timerHint:
      "Use the timer as your current study boundary. Review pages and notes only after the block ends.",
    suggested: "Suggested from the plan",
    suggestedHint: "Built from the selected objective and its current daily target.",
    dailyTarget: "Today target",
    weeklyTime: "Weekly time",
    materials: "Materials ready",
    nextStep: "Best next step",
    lastStudy: "Last study note",
    noMessage: "No study logs yet for this objective.",
    start: "Start focus",
    pause: "Pause",
    resume: "Resume",
    stop: "Finish early",
    skip: "Skip today",
    addTenMinutes: "+10 min",
    completed: "Session saved",
    stopped: "Partial session saved",
    skipped: "Session skipped. The planner will stay cautious.",
    paused: "Session paused.",
    started: "Focus block started.",
    resumed: "Focus block resumed.",
    reviewTitle: "Log what you completed",
    reviewBody:
      "Capture the real outcome now so planner, progress, and next steps stay reliable.",
    topic: "What did you cover?",
    topicPlaceholder: "Chapter, topic, or exercise set",
    pagesInput: "Pages completed",
    saveCompleted: "Save completed block",
    savePartial: "Save partial block",
    cancelReview: "Back to timer",
    noExam: "No objectives yet. Add one in Objectives first.",
    noAccount: "Your session is missing or expired.",
    noAccountBody:
      "Sign in again to reopen your planner and keep your study data in sync.",
    login: "Go to login",
    createAccount: "Create account",
    loading: "Loading study sessions...",
    minutes: "min",
    pages: "pages",
    hours: "hours",
    openObjectives: "Open Objectives",
    backToPlanner: "Back to Planner",
    presetSprint: "Pomodoro",
    presetSprintHint: "Fast restart",
    presetDeep: "Focus",
    presetDeepHint: "Balanced block",
    presetExam: "Long block",
    presetExamHint: "Extended concentration",
  },
  it: {
    title: "Studia oggi",
    subtitle:
      "Apri un blocco pulito di concentrazione, segui il timer e registra il risultato solo alla fine.",
    xp: "Focus score",
    streak: "Streak",
    sessions: "Sessioni",
    objective: "Obiettivo",
    availableTime: "Tempo disponibile oggi",
    timer: "Timer focus",
    timerHint:
      "Usa il timer come perimetro del blocco attuale. Pagine e note si registrano alla fine.",
    suggested: "Suggerito dal piano",
    suggestedHint: "Nasce dall'obiettivo selezionato e dal suo target giornaliero.",
    dailyTarget: "Target di oggi",
    weeklyTime: "Tempo settimanale",
    materials: "Materiali pronti",
    nextStep: "Prossimo passo migliore",
    lastStudy: "Ultimo appunto di studio",
    noMessage: "Nessuna sessione registrata per questo obiettivo.",
    start: "Avvia focus",
    pause: "Pausa",
    resume: "Riprendi",
    stop: "Chiudi prima",
    skip: "Salta oggi",
    addTenMinutes: "+10 min",
    completed: "Sessione salvata",
    stopped: "Sessione parziale salvata",
    skipped: "Sessione saltata. Il planner resta prudente.",
    paused: "Sessione in pausa.",
    started: "Blocco focus avviato.",
    resumed: "Blocco focus ripreso.",
    reviewTitle: "Registra cosa hai completato",
    reviewBody:
      "Segna ora il risultato reale cosi planner, progresso e prossimi passi restano affidabili.",
    topic: "Cosa hai coperto?",
    topicPlaceholder: "Capitolo, argomento o serie di esercizi",
    pagesInput: "Pagine completate",
    saveCompleted: "Salva blocco completato",
    savePartial: "Salva blocco parziale",
    cancelReview: "Torna al timer",
    noExam: "Non ci sono ancora obiettivi. Aggiungine uno in Obiettivi.",
    noAccount: "La sessione manca o e scaduta.",
    noAccountBody:
      "Accedi di nuovo per riaprire il planner e tenere sincronati i dati di studio.",
    login: "Vai al login",
    createAccount: "Crea account",
    loading: "Caricamento sessioni studio...",
    minutes: "min",
    pages: "pagine",
    hours: "ore",
    openObjectives: "Apri Obiettivi",
    backToPlanner: "Torna al Planner",
    presetSprint: "Pomodoro",
    presetSprintHint: "Ripartenza veloce",
    presetDeep: "Focus",
    presetDeepHint: "Blocco bilanciato",
    presetExam: "Blocco lungo",
    presetExamHint: "Concentrazione estesa",
  },
} as const;

function getInitialFocusStats(): FocusStats {
  if (typeof window === "undefined") {
    return { xp: 0, streak: 0, sessionsCompleted: 0, lastCompletionDate: "" };
  }
  const raw = localStorage.getItem("studyapp_focus_stats");
  if (!raw) {
    return { xp: 0, streak: 0, sessionsCompleted: 0, lastCompletionDate: "" };
  }
  try {
    return JSON.parse(raw) as FocusStats;
  } catch {
    return { xp: 0, streak: 0, sessionsCompleted: 0, lastCompletionDate: "" };
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayIso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function PlannerFocusPage() {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { student } = useAuthStudent();
  const searchParams = useSearchParams();
  const initialExamId = searchParams.get("exam")?.trim() ?? "";
  const { overview, loading, refresh } = usePlannerOverview({
    enabled: Boolean(student?.id),
    studentId: student?.id,
  });

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [sessionStage, setSessionStage] = useState<SessionStage>("idle");
  const [sessionOutcome, setSessionOutcome] = useState<SessionOutcome>(null);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<FocusStats>(() => getInitialFocusStats());
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [availableTimeMinutes, setAvailableTimeMinutes] = useState("60");
  const [topic, setTopic] = useState("");
  const [pagesCompleted, setPagesCompleted] = useState("");

  useEffect(() => {
    localStorage.setItem("studyapp_focus_stats", JSON.stringify(stats));
  }, [stats]);

  const selectedExam = useMemo(() => {
    if (!overview?.examRecommendations.length) return null;
    return (
      overview.examRecommendations.find((exam) => exam.examId === selectedExamId) ??
      overview.examRecommendations[0]
    );
  }, [overview, selectedExamId]);

  const suggestedMinutes = selectedExam
    ? Math.max(20, Math.round(selectedExam.dailyTargetMinutes / 5) * 5)
    : null;
  const elapsedMinutes = Math.max(1, focusMinutes - Math.ceil(focusSecondsLeft / 60));
  const progressPercent =
    focusMinutes > 0
      ? clampPercent(((focusMinutes * 60 - focusSecondsLeft) / (focusMinutes * 60)) * 100)
      : 0;

  const presetMeta = FOCUS_PRESETS.map((preset) => ({
    minutes: preset.minutes,
    label:
      preset.key === "sprint"
        ? t.presetSprint
        : preset.key === "deep"
          ? t.presetDeep
          : t.presetExam,
    hint:
      preset.key === "sprint"
        ? t.presetSprintHint
        : preset.key === "deep"
          ? t.presetDeepHint
          : t.presetExamHint,
  }));

  const submitReview = useCallback(async () => {
    if (!selectedExam || !sessionOutcome) {
      setMessage(t.noExam);
      return;
    }

    const loggedMinutes = sessionOutcome === "completed" ? focusMinutes : elapsedMinutes;
    const normalizedPages = Number.isFinite(Number(pagesCompleted))
      ? Math.max(0, Math.round(Number(pagesCompleted)))
      : 0;
    const normalizedTopic = topic.trim() || selectedExam.examTitle;

    const { ok, payload } = await requestJson<{ error?: string }>("/api/exam-study-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: selectedExam.examId,
        minutesSpent: loggedMinutes,
        pagesCompleted: normalizedPages,
        topic: normalizedTopic,
        completedAt: new Date().toISOString(),
      }),
    });

    if (!ok) {
      setMessage(payload.error ?? "Failed to save study session");
      return;
    }

    const today = getTodayIso();
    const yesterday = getYesterdayIso();
    const { totalXp } = calculateFocusSessionXp(loggedMinutes, stats.streak);

    setStats((current) => ({
      xp: current.xp + totalXp,
      streak:
        current.lastCompletionDate === today
          ? current.streak
          : current.lastCompletionDate === yesterday
            ? current.streak + 1
            : 1,
      sessionsCompleted: current.sessionsCompleted + 1,
      lastCompletionDate: today,
    }));

    recordFocusProgress(selectedExam.examId, normalizedPages, loggedMinutes, normalizedTopic);
    notifyDataRevision("focus_progress");
    await refresh(true);

    setTopic("");
    setPagesCompleted("");
    setSessionOutcome(null);
    setSessionStage("idle");
    setFocusSecondsLeft(focusMinutes * 60);
    setMessage(
      `${sessionOutcome === "completed" ? t.completed : t.stopped}: +${totalXp} XP | ${loggedMinutes} ${t.minutes} | ${normalizedPages} ${t.pages}`,
    );
  }, [
    elapsedMinutes,
    focusMinutes,
    pagesCompleted,
    refresh,
    selectedExam,
    sessionOutcome,
    stats.streak,
    t,
    topic,
  ]);

  useEffect(() => {
    if (sessionStage !== "running") return;
    const timer = setInterval(() => {
      setFocusSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setSessionStage("review");
          setSessionOutcome("completed");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStage]);

  function startSession() {
    if (!selectedExam) {
      setMessage(t.noExam);
      return;
    }
    if (sessionStage === "paused") {
      setSessionStage("running");
      setMessage(t.resumed);
      return;
    }
    const cappedMinutes = Math.min(focusMinutes, Number(availableTimeMinutes));
    setFocusMinutes(cappedMinutes);
    setFocusSecondsLeft(cappedMinutes * 60);
    setSessionOutcome(null);
    setSessionStage("running");
    setMessage(t.started);
  }

  function pauseSession() {
    if (sessionStage !== "running") return;
    setSessionStage("paused");
    setMessage(t.paused);
  }

  function skipToday() {
    setSessionStage("idle");
    setSessionOutcome(null);
    setFocusSecondsLeft(focusMinutes * 60);
    setMessage(t.skipped);
  }

  const minutesLeft = Math.floor(focusSecondsLeft / 60);
  const secondsLeft = focusSecondsLeft % 60;

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

  if (loading) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <section className="planner-panel planner-hero">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.subtitle}</p>
          <p className="mt-4 text-sm text-slate-600">{t.loading}</p>
        </section>
      </main>
    );
  }

  if (!overview || overview.examRecommendations.length === 0) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <section className="planner-panel planner-hero">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.subtitle}</p>
        </section>
        <section className="planner-panel">
          <p className="text-base font-semibold text-slate-900">{t.noExam}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/planner/exams" className="planner-btn planner-btn-accent">
              {t.openObjectives}
            </Link>
            <Link href="/planner" className="planner-btn planner-btn-secondary">
              {t.backToPlanner}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="planner-card">
          <p className="planner-eyebrow">{t.xp}</p>
          <p className="text-2xl font-extrabold text-slate-900">{stats.xp}</p>
        </div>
        <div className="planner-card">
          <p className="planner-eyebrow">{t.streak}</p>
          <p className="text-2xl font-extrabold text-slate-900">{stats.streak}d</p>
        </div>
        <div className="planner-card">
          <p className="planner-eyebrow">{t.sessions}</p>
          <p className="text-2xl font-extrabold text-slate-900">{stats.sessionsCompleted}</p>
        </div>
      </section>

      <section className="planner-panel space-y-4">
        <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.objective}</span>
                <select
                  value={selectedExam?.examId ?? ""}
                  onChange={(event) => setSelectedExamId(event.target.value)}
                  className="planner-input"
                >
                  {overview.examRecommendations.map((exam) => (
                    <option key={exam.examId} value={exam.examId}>
                      {exam.examTitle} - {exam.subjectName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.availableTime}</span>
                <select
                  value={availableTimeMinutes}
                  onChange={(event) => setAvailableTimeMinutes(event.target.value)}
                  className="planner-input"
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </label>
            </div>

            {selectedExam ? (
              <>
                <article className="planner-card bg-slate-50/90">
                  <p className="planner-chip border-slate-200 bg-white text-slate-700">
                    {selectedExam.subjectName}
                  </p>
                  <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900">
                    {selectedExam.examTitle}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{selectedExam.paceDescription}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="planner-card-soft bg-white">
                      <p className="planner-eyebrow">{t.suggested}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {suggestedMinutes ?? selectedExam.dailyTargetMinutes} {t.minutes}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{t.suggestedHint}</p>
                    </div>
                    <div className="planner-card-soft bg-white">
                      <p className="planner-eyebrow">{t.dailyTarget}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.dailyTargetPages} {t.pages}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedExam.dailyTargetMinutes} {t.minutes}
                      </p>
                    </div>
                    <div className="planner-card-soft bg-white">
                      <p className="planner-eyebrow">{t.materials}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.linkedMaterialsCount}
                      </p>
                      <p className="text-xs text-slate-500">{selectedExam.scopeSummary}</p>
                    </div>
                    <div className="planner-card-soft bg-white">
                      <p className="planner-eyebrow">{t.nextStep}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.nextSteps[0] ?? selectedExam.paceDescription}
                      </p>
                    </div>
                  </div>
                </article>
                <article className="planner-card bg-slate-50/90">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="planner-eyebrow">{t.weeklyTime}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {selectedExam.weeklyAllocationHours} {t.hours}
                      </p>
                    </div>
                    <div>
                      <p className="planner-eyebrow">{t.lastStudy}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {selectedExam.studyLogSummary.lastTopic || t.noMessage}
                      </p>
                    </div>
                  </div>
                </article>
              </>
            ) : null}
          </div>

          <article className="planner-timer-card">
            <div className="planner-timer-meta">
              <p className="planner-eyebrow">{t.timer}</p>
              <p className="mt-2 text-sm text-slate-600">{t.timerHint}</p>
            </div>
            <div
              className="planner-timer-ring"
              style={{
                background: `conic-gradient(var(--accent) ${progressPercent * 3.6}deg, rgba(var(--accent-rgb), 0.12) 0deg)`,
              }}
            >
              <div className="planner-timer-core">
                <span className="planner-timer-value">
                  {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
                </span>
                <span className="planner-timer-caption">
                  {sessionStage === "paused"
                    ? t.paused
                    : sessionStage === "review"
                      ? t.reviewTitle
                      : t.timer}
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {presetMeta.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => {
                    setFocusMinutes(preset.minutes);
                    if (sessionStage !== "running") {
                      setFocusSecondsLeft(preset.minutes * 60);
                    }
                  }}
                  disabled={sessionStage === "review"}
                  className={`planner-card text-left ${
                    focusMinutes === preset.minutes
                      ? "border-sky-300 bg-sky-50"
                      : "bg-white hover:bg-slate-50"
                  } ${sessionStage === "review" ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <p className="text-sm font-bold text-slate-900">{preset.minutes} min</p>
                  <p className="text-xs text-slate-600">{preset.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{preset.hint}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={startSession} className="planner-btn planner-btn-accent">
                {sessionStage === "paused" ? t.resume : t.start}
              </button>
              <button
                type="button"
                onClick={pauseSession}
                disabled={sessionStage !== "running"}
                className="planner-btn planner-btn-secondary"
              >
                {t.pause}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionStage("review");
                  setSessionOutcome("partial");
                }}
                disabled={sessionStage === "review"}
                className="planner-btn planner-btn-secondary"
              >
                {t.stop}
              </button>
              <button
                type="button"
                onClick={skipToday}
                className="planner-btn planner-btn-secondary"
              >
                {t.skip}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusMinutes((current) => current + 10);
                  setFocusSecondsLeft((current) => current + 10 * 60);
                }}
                disabled={sessionStage === "review"}
                className="planner-btn planner-btn-secondary"
              >
                {t.addTenMinutes}
              </button>
            </div>
          </article>
        </div>

        {sessionStage === "review" ? (
          <article className="planner-card border border-slate-200 bg-white">
            <h3 className="text-lg font-black text-slate-900">{t.reviewTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">{t.reviewBody}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.topic}</span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder={t.topicPlaceholder}
                  className="planner-input"
                />
              </label>
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.pagesInput}</span>
                <input
                  type="number"
                  min={0}
                  value={pagesCompleted}
                  onChange={(event) => setPagesCompleted(event.target.value)}
                  className="planner-input"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void submitReview()}
                className="planner-btn planner-btn-accent"
              >
                {sessionOutcome === "completed" ? t.saveCompleted : t.savePartial}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionStage("paused");
                  setSessionOutcome(null);
                }}
                className="planner-btn planner-btn-secondary"
              >
                {t.cancelReview}
              </button>
            </div>
          </article>
        ) : null}
      </section>

      {message ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message}
        </section>
      ) : null}
    </main>
  );
}
