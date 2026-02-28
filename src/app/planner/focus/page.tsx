"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import {
  readFocusProgress,
  recordFocusProgress,
  subscribeDataRevision,
} from "@/app/planner/_lib/focus-progress";
import { inferSubjectPace } from "@/app/planner/_lib/season-engine";
import { requestJson } from "../_lib/client-api";

const FOCUS_PRESETS = [
  { minutes: 25, label: "Sprint", subtitle: "Quick momentum" },
  { minutes: 45, label: "Deep", subtitle: "Balanced focus" },
  { minutes: 60, label: "Exam", subtitle: "Long concentration" },
] as const;

const REWARD_REACTIONS = [
  "Aero says: great run, your brain just got sharper.",
  "Quest complete: tiny progress today, massive result later.",
  "Parrot hype: focus combo unlocked.",
  "Momentum++: consistency beats intensity chaos.",
] as const;

type FocusStats = {
  xp: number;
  streak: number;
  sessionsCompleted: number;
  lastCompletionDate: string;
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

const COPY = {
  en: {
    title: "Focus Sessions",
    subtitle: "Run focused blocks and connect each run to an exam timeline.",
    xp: "XP",
    streak: "Streak",
    sessions: "Sessions",
    mood: "Mood",
    targetExam: "Target exam",
    topic: "What are you studying?",
    pagesInput: "Pages completed this run (optional)",
    topicPlaceholder: "Chapter / mission / topic",
    timer: "Timer",
    start: "Start",
    pause: "Pause",
    stop: "Stop",
    simulation: "Dev full run simulation",
    lockTitle: "Focus Lock Active",
    lockSubtitle: "Stay on task until timer ends.",
    exitLock: "Exit lock",
    moodReady: "Ready",
    moodFocused: "Focused",
    moodWarm: "Warming up",
    moodTrack: "On track",
    moodAlert: "Alert",
    moodHintReady: "Pick an exam and start your first focused run.",
    moodHintFocused: "Timer is running, momentum is active.",
    moodHintWarm: "You started building consistency. Keep the chain alive.",
    moodHintTrack: "Strong rhythm. Your exam timeline is improving.",
    moodHintAlert: "Deadline is close. Prioritize this exam in the next runs.",
    noExam: "No exams available. Add one in Exams page first.",
    selectExamFirst: "Select an exam target before starting focus mode.",
    stoppedEarly: "Focus session stopped early.",
    started: "Focus mode started.",
    paused: "Session paused.",
    completed: "Session completed",
    progressLogged: "progress logged to exam timeline",
    autoEstimate: "auto-estimated",
    loadingExams: "Loading exams...",
    examLabel: "Exam",
    daysLeft: "days left",
    recorded: "Recorded",
  },
  it: {
    title: "Sessioni Focus",
    subtitle: "Esegui blocchi focus e collega ogni run alla timeline esame.",
    xp: "XP",
    streak: "Streak",
    sessions: "Sessioni",
    mood: "Mood",
    targetExam: "Esame target",
    topic: "Cosa stai studiando?",
    pagesInput: "Pagine completate in questa run (opzionale)",
    topicPlaceholder: "Capitolo / missione / topic",
    timer: "Timer",
    start: "Avvia",
    pause: "Pausa",
    stop: "Stop",
    simulation: "Simulazione run completa (dev)",
    lockTitle: "Blocco Focus Attivo",
    lockSubtitle: "Resta sul task finche il timer termina.",
    exitLock: "Esci dal lock",
    moodReady: "Pronto",
    moodFocused: "Concentrato",
    moodWarm: "In partenza",
    moodTrack: "In carreggiata",
    moodAlert: "Allerta",
    moodHintReady: "Scegli un esame e avvia la prima sessione focus.",
    moodHintFocused: "Timer attivo, momentum in corso.",
    moodHintWarm: "La costanza sta crescendo. Mantieni la catena.",
    moodHintTrack: "Ritmo solido. La timeline esame sta migliorando.",
    moodHintAlert: "Scadenza vicina. Dai priorita a questo esame.",
    noExam: "Nessun esame disponibile. Aggiungine uno nella pagina Esami.",
    selectExamFirst: "Seleziona prima un esame target.",
    stoppedEarly: "Sessione focus interrotta prima del termine.",
    started: "Modalita focus avviata.",
    paused: "Sessione in pausa.",
    completed: "Sessione completata",
    progressLogged: "progresso registrato nella timeline esame",
    autoEstimate: "stima automatica",
    loadingExams: "Caricamento esami...",
    examLabel: "Esame",
    daysLeft: "giorni rimanenti",
    recorded: "Registrato",
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
    const parsed = JSON.parse(raw) as FocusStats;
    return {
      xp: parsed.xp ?? 0,
      streak: parsed.streak ?? 0,
      sessionsCompleted: parsed.sessionsCompleted ?? 0,
      lastCompletionDate: parsed.lastCompletionDate ?? "",
    };
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
  const dayMs = 24 * 60 * 60 * 1000;
  return new Date(Date.now() - dayMs).toISOString().slice(0, 10);
}

function daysUntil(dateIso: string) {
  const diff = Math.ceil((new Date(dateIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(diff, 0);
}

function estimatePagesFromMinutes(subjectName: string, minutes: number) {
  const pace = inferSubjectPace(subjectName);
  const pages = (minutes / 60) * pace.pagesPerHour;
  return Math.max(1, Math.round(pages));
}

export default function PlannerFocusPage() {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [rewardLine, setRewardLine] = useState("");
  const [stats, setStats] = useState<FocusStats>(getInitialFocusStats);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [focusTopic, setFocusTopic] = useState("");
  const [pagesCompletedInput, setPagesCompletedInput] = useState("");
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(readFocusProgress);

  const minutesLeft = Math.floor(focusSecondsLeft / 60);
  const secondsLeft = focusSecondsLeft % 60;
  const { xp, streak, sessionsCompleted } = stats;

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId) ?? null,
    [exams, selectedExamId],
  );
  const selectedExamProgress = selectedExamId ? focusProgress[selectedExamId] : undefined;
  const selectedExamDaysLeft = selectedExam ? daysUntil(selectedExam.examDate) : null;

  const mascotMood = useMemo(() => {
    if (focusRunning) return t.moodFocused;
    if (
      selectedExamDaysLeft !== null &&
      selectedExamDaysLeft <= 5 &&
      (selectedExamProgress?.pagesCompleted ?? 0) < 40
    ) {
      return t.moodAlert;
    }
    if (streak >= 3 || (selectedExamProgress?.sessionsCompleted ?? 0) >= 3) return t.moodTrack;
    if (sessionsCompleted >= 1) return t.moodWarm;
    return t.moodReady;
  }, [
    focusRunning,
    selectedExamDaysLeft,
    selectedExamProgress?.pagesCompleted,
    selectedExamProgress?.sessionsCompleted,
    sessionsCompleted,
    streak,
    t.moodAlert,
    t.moodFocused,
    t.moodReady,
    t.moodTrack,
    t.moodWarm,
  ]);

  const moodHint = useMemo(() => {
    if (mascotMood === t.moodFocused) return t.moodHintFocused;
    if (mascotMood === t.moodAlert) return t.moodHintAlert;
    if (mascotMood === t.moodTrack) return t.moodHintTrack;
    if (mascotMood === t.moodWarm) return t.moodHintWarm;
    return t.moodHintReady;
  }, [mascotMood, t]);

  useEffect(() => {
    localStorage.setItem("studyapp_focus_stats", JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    let active = true;

    async function loadExams() {
      const { ok, payload } = await requestJson<Exam[]>("/api/exams");
      if (!active) return;
      if (ok && payload.data) {
        const loadedExams = payload.data;
        setExams(loadedExams);
        setSelectedExamId((current) => current || loadedExams[0]?.id || "");
      } else {
        setMessage(payload.error ?? "Failed to load exams");
      }
      setLoadingExams(false);
    }

    void loadExams();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeDataRevision(() => {
      setFocusProgress(readFocusProgress());
    });
  }, []);

  const finishFocusSession = useCallback(
    (completed: boolean) => {
      setFocusRunning(false);
      setFocusLocked(false);
      if (!completed) {
        setMessage(t.stoppedEarly);
        return;
      }

      const completionBonus = Math.round(focusMinutes * 2);
      const streakBonus = Math.min(stats.streak * 3, 30);
      const gainedXp = completionBonus + streakBonus;
      const today = getTodayIso();
      const yesterday = getYesterdayIso();

      setStats((current) => {
        const nextStreak =
          current.lastCompletionDate === today
            ? current.streak
            : current.lastCompletionDate === yesterday
              ? current.streak + 1
              : 1;

        return {
          xp: current.xp + gainedXp,
          streak: nextStreak,
          sessionsCompleted: current.sessionsCompleted + 1,
          lastCompletionDate: today,
        };
      });

      if (selectedExam) {
        const manualPages = Number(pagesCompletedInput);
        const hasManualPages = Number.isFinite(manualPages) && manualPages > 0;
        const loggedPages = hasManualPages
          ? Math.round(manualPages)
          : estimatePagesFromMinutes(selectedExam.subject.name, focusMinutes);
        const topic = focusTopic.trim() || selectedExam.title;
        recordFocusProgress(selectedExam.id, loggedPages, focusMinutes, topic);
        setMessage(
          `${t.completed}: +${gainedXp} XP. ${loggedPages}p ${t.progressLogged} (${hasManualPages ? t.recorded : t.autoEstimate}).`,
        );
      } else {
        setMessage(`${t.completed}: +${gainedXp} XP.`);
      }

      setRewardLine(REWARD_REACTIONS[Math.floor(Math.random() * REWARD_REACTIONS.length)]);
      setPagesCompletedInput("");
    },
    [focusMinutes, focusTopic, pagesCompletedInput, selectedExam, stats.streak, t],
  );

  useEffect(() => {
    if (!focusRunning) return;
    const timer = setInterval(() => {
      setFocusSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          finishFocusSession(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [focusRunning, finishFocusSession]);

  function selectPreset(minutes: number) {
    setFocusMinutes(minutes);
    if (!focusRunning) setFocusSecondsLeft(minutes * 60);
  }

  function startSession() {
    if (focusRunning) return;
    if (!selectedExamId) {
      setMessage(t.selectExamFirst);
      return;
    }
    setFocusSecondsLeft(focusMinutes * 60);
    setFocusLocked(true);
    setFocusRunning(true);
    setMessage(t.started);
  }

  function pauseSession() {
    setFocusRunning(false);
    setMessage(t.paused);
  }

  function runDevFullSimulation() {
    const gainedXp = 180;
    const today = getTodayIso();
    setStats((current) => ({
      xp: current.xp + gainedXp,
      streak: Math.max(current.streak, 1),
      sessionsCompleted: current.sessionsCompleted + 3,
      lastCompletionDate: today,
    }));

    if (selectedExam) {
      const simulatedPages = estimatePagesFromMinutes(selectedExam.subject.name, 120);
      recordFocusProgress(selectedExam.id, simulatedPages, 120, "Simulation run");
      setMessage(
        `${t.simulation}: +${gainedXp} XP, ${simulatedPages}p ${t.progressLogged}.`,
      );
    } else {
      setMessage(`${t.simulation}: +${gainedXp} XP.`);
    }
    setRewardLine("Aero says: full run simulated, systems green.");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.xp}</p>
          <p className="text-2xl font-extrabold text-slate-900">{xp}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.streak}</p>
          <p className="text-2xl font-extrabold text-slate-900">{streak}d</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.sessions}</p>
          <p className="text-2xl font-extrabold text-slate-900">{sessionsCompleted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.mood}</p>
          <p className="text-2xl font-extrabold text-slate-900">{mascotMood}</p>
          <p className="mt-1 text-xs text-slate-600">{moodHint}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loadingExams ? (
          <p className="text-sm text-slate-600">{t.loadingExams}</p>
        ) : exams.length === 0 ? (
          <p className="text-sm text-slate-600">{t.noExam}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.targetExam}
              </span>
              <select
                value={selectedExamId}
                onChange={(event) => setSelectedExamId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} - {exam.subject.name}
                  </option>
                ))}
              </select>
              {selectedExam ? (
                <p className="mt-2 text-xs text-slate-600">
                  {t.examLabel}: {selectedExam.title} - {daysUntil(selectedExam.examDate)} {t.daysLeft}
                </p>
              ) : null}
            </label>

            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.topic}
              </span>
              <input
                type="text"
                value={focusTopic}
                onChange={(event) => setFocusTopic(event.target.value)}
                placeholder={t.topicPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.pagesInput}
              </span>
              <input
                type="number"
                min={1}
                value={pagesCompletedInput}
                onChange={(event) => setPagesCompletedInput(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
            </label>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.timer}</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight text-slate-900">
            {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {FOCUS_PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => selectPreset(preset.minutes)}
              disabled={focusRunning}
              className={`rounded-2xl border p-4 text-left ${
                focusMinutes === preset.minutes
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              } ${focusRunning ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <p className="text-sm font-bold text-slate-900">{preset.minutes} min</p>
              <p className="text-xs text-slate-600">{preset.label}</p>
              <p className="mt-1 text-xs text-slate-500">{preset.subtitle}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startSession}
            className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {t.start}
          </button>
          <button
            type="button"
            onClick={pauseSession}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t.pause}
          </button>
          <button
            type="button"
            onClick={() => finishFocusSession(false)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t.stop}
          </button>
          <button
            type="button"
            onClick={runDevFullSimulation}
            className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            {t.simulation}
          </button>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </section>
      ) : null}

      {rewardLine ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {rewardLine}
        </section>
      ) : null}

      {focusLocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">{t.lockTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.lockSubtitle}</p>
            <p className="mt-4 text-5xl font-extrabold tracking-tight text-sky-700">
              {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={pauseSession}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.pause}
              </button>
              <button
                type="button"
                onClick={() => finishFocusSession(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.exitLock}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
