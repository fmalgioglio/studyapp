"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import { calculateFocusSessionXp } from "@/app/planner/_lib/focus-xp";
import { useAuthStudent } from "../_hooks/use-auth-student";
import { usePlannerOverview } from "../_hooks/use-planner-overview";
import { requestJson } from "../_lib/client-api";

const FOCUS_PRESETS = [
  { minutes: 25, label: "Sprint", subtitle: "Quick momentum" },
  { minutes: 45, label: "Deep", subtitle: "Balanced focus" },
  { minutes: 60, label: "Exam", subtitle: "Long concentration" },
] as const;

type FocusStats = {
  xp: number;
  streak: number;
  sessionsCompleted: number;
  lastCompletionDate: string;
};

const COPY = {
  en: {
    title: "Study session",
    subtitle: "Log one real study block against one exam and let the planner adapt.",
    xp: "Focus score",
    streak: "Streak",
    sessions: "Sessions",
    targetExam: "Target exam",
    topic: "What are you covering?",
    topicPlaceholder: "Chapter, topic, or exercise set",
    pagesInput: "Pages completed",
    timer: "Timer",
    suggested: "Suggested from plan",
    suggestedHint: "Uses the daily target from the selected exam plan.",
    start: "Start",
    pause: "Pause",
    stop: "Stop",
    addTenMinutes: "+10 min",
    completed: "Session completed",
    stopped: "Session stopped early.",
    paused: "Session paused.",
    started: "Session started.",
    noExam: "No exams yet. Add one in Exams first.",
    loading: "Loading study sessions...",
    progressStrip: "Exam progress",
    dailyTarget: "Daily target",
    weeklyTime: "Weekly time",
    noMessage: "No study logs yet for this exam.",
    minutes: "min",
    pages: "pages",
  },
  it: {
    title: "Sessione di studio",
    subtitle: "Registra un blocco di studio reale su un esame e lascia che il planner si aggiorni.",
    xp: "Focus score",
    streak: "Streak",
    sessions: "Sessioni",
    targetExam: "Esame target",
    topic: "Cosa stai coprendo?",
    topicPlaceholder: "Capitolo, argomento o serie di esercizi",
    pagesInput: "Pagine completate",
    timer: "Timer",
    suggested: "Suggerito dal piano",
    suggestedHint: "Usa il target giornaliero del piano dell'esame selezionato.",
    start: "Avvia",
    pause: "Pausa",
    stop: "Stop",
    addTenMinutes: "+10 min",
    completed: "Sessione completata",
    stopped: "Sessione interrotta prima del termine.",
    paused: "Sessione in pausa.",
    started: "Sessione avviata.",
    noExam: "Nessun esame. Aggiungine uno nella pagina Esami.",
    loading: "Caricamento sessioni studio...",
    progressStrip: "Progresso esami",
    dailyTarget: "Target giornaliero",
    weeklyTime: "Tempo settimanale",
    noMessage: "Nessuna sessione registrata per questo esame.",
    minutes: "min",
    pages: "pagine",
  },
} as const;

function getInitialFocusStats(): FocusStats {
  if (typeof window === "undefined") {
    return {
      xp: 0,
      streak: 0,
      sessionsCompleted: 0,
      lastCompletionDate: "",
    };
  }

  const raw = localStorage.getItem("studyapp_focus_stats");
  if (!raw) {
    return {
      xp: 0,
      streak: 0,
      sessionsCompleted: 0,
      lastCompletionDate: "",
    };
  }

  try {
    return JSON.parse(raw) as FocusStats;
  } catch {
    return {
      xp: 0,
      streak: 0,
      sessionsCompleted: 0,
      lastCompletionDate: "",
    };
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayIso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function PlannerFocusPage() {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { student } = useAuthStudent();
  const { overview, loading, refresh } = usePlannerOverview({
    enabled: Boolean(student?.id),
    studentId: student?.id,
  });
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<FocusStats>(() => getInitialFocusStats());
  const [selectedExamId, setSelectedExamId] = useState("");
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

  const finishSession = useCallback(
    async (completed: boolean) => {
      setFocusRunning(false);
      if (!completed) {
        setMessage(t.stopped);
        return;
      }

      if (!selectedExam) {
        setMessage(t.noExam);
        return;
      }

      const { totalXp } = calculateFocusSessionXp(focusMinutes, stats.streak);
      const today = getTodayIso();
      const yesterday = getYesterdayIso();

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

      const normalizedPages = Number.isFinite(Number(pagesCompleted))
        ? Math.max(0, Math.round(Number(pagesCompleted)))
        : 0;

      const { ok, payload } = await requestJson<{
        recommendation?: { examId: string };
      }>("/api/exam-study-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExam.examId,
          minutesSpent: focusMinutes,
          pagesCompleted: normalizedPages,
          topic: topic.trim() || selectedExam.examTitle,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!ok) {
        setMessage(payload.error ?? "Failed to save study session");
        return;
      }

      notifyDataRevision();
      await refresh(true);
      setPagesCompleted("");
      setTopic("");
      setMessage(
        `${t.completed}: +${totalXp} XP • ${focusMinutes} ${t.minutes} • ${normalizedPages} ${t.pages}`,
      );
    },
    [focusMinutes, pagesCompleted, refresh, selectedExam, stats.streak, t, topic],
  );

  useEffect(() => {
    if (!focusRunning) return;
    const timer = setInterval(() => {
      setFocusSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          void finishSession(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishSession, focusRunning]);

  function startSession() {
    if (!selectedExam) {
      setMessage(t.noExam);
      return;
    }
    setFocusSecondsLeft(focusMinutes * 60);
    setFocusRunning(true);
    setMessage(t.started);
  }

  const minutesLeft = Math.floor(focusSecondsLeft / 60);
  const secondsLeft = focusSecondsLeft % 60;

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
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

      <section className="planner-panel">
        {loading ? (
          <p className="text-sm text-slate-600">{t.loading}</p>
        ) : !overview || overview.examRecommendations.length === 0 ? (
          <p className="text-sm text-slate-600">{t.noExam}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.targetExam}</span>
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

            {selectedExam ? (
              <div className="grid gap-3 md:grid-cols-3">
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
                </div>
                <div className="planner-card-soft bg-white">
                  <p className="planner-eyebrow">{t.weeklyTime}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedExam.weeklyAllocationHours} h
                  </p>
                </div>
              </div>
            ) : null}

            <div className="planner-card bg-gradient-to-br from-sky-50 to-cyan-50">
              <p className="planner-eyebrow">{t.timer}</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight text-slate-900">
                {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {FOCUS_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => {
                    setFocusMinutes(preset.minutes);
                    if (!focusRunning) {
                      setFocusSecondsLeft(preset.minutes * 60);
                    }
                  }}
                  disabled={focusRunning}
                  className={`planner-card text-left ${
                    focusMinutes === preset.minutes
                      ? "border-sky-300 bg-sky-50"
                      : "bg-white hover:bg-slate-50"
                  } ${focusRunning ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <p className="text-sm font-bold text-slate-900">{preset.minutes} min</p>
                  <p className="text-xs text-slate-600">{preset.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{preset.subtitle}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startSession} className="planner-btn planner-btn-accent">
                {t.start}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusRunning(false);
                  setMessage(t.paused);
                }}
                className="planner-btn planner-btn-secondary"
              >
                {t.pause}
              </button>
              <button
                type="button"
                onClick={() => void finishSession(false)}
                className="planner-btn planner-btn-secondary"
              >
                {t.stop}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!focusRunning) return;
                  setFocusMinutes((current) => current + 10);
                  setFocusSecondsLeft((current) => current + 10 * 60);
                }}
                className="planner-btn planner-btn-secondary"
              >
                {t.addTenMinutes}
              </button>
              {suggestedMinutes ? (
                <button
                  type="button"
                  onClick={() => {
                    setFocusMinutes(suggestedMinutes);
                    setFocusSecondsLeft(suggestedMinutes * 60);
                  }}
                  className="planner-btn planner-btn-secondary"
                >
                  {t.suggested}: {suggestedMinutes} {t.minutes}
                </button>
              ) : null}
            </div>

            <div>
              <p className="planner-eyebrow">{t.progressStrip}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {overview.examRecommendations.map((exam) => (
                  <button
                    key={exam.examId}
                    type="button"
                    onClick={() => setSelectedExamId(exam.examId)}
                    className="planner-chip border-slate-200 bg-white text-slate-700"
                  >
                    {exam.subjectName}: {exam.completionPercent}%
                  </button>
                ))}
              </div>
            </div>

            {selectedExam ? (
              <div className="planner-card bg-slate-50/90">
                <p className="planner-eyebrow">{selectedExam.examTitle}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedExam.studyLogSummary.lastTopic || t.noMessage}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {message ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message}
        </section>
      ) : null}
    </main>
  );
}
