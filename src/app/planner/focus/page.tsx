"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import {
  readFocusProgress,
  recordFocusProgress,
  subscribeDataRevision,
} from "@/app/planner/_lib/focus-progress";
import {
  buildExamProgressSnapshot,
  inferSubjectPace,
  type ExamProgressState,
  type FocusContributionLevel,
} from "@/app/planner/_lib/season-engine";
import {
  focusContributionClasses,
  progressStateClasses,
} from "@/app/planner/_lib/status-ui";
import { calculateFocusSessionXp } from "@/app/planner/_lib/focus-xp";
import { useFocusExamsData } from "../_hooks/use-focus-exams-data";

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
    engineSuggested: "Engine suggested",
    engineSuggestedApply: "Use suggested",
    engineSuggestedHint: "Auto target from exam track baseline.",
    engineSuggestedMissing: "Select an exam to unlock the suggested timer.",
    engineSuggestedApplied: "Engine timer applied",
    addTenMinutes: "+10 min",
    liveControls: "Live controls",
    pagesQuick: "Pages quick adjust",
    pagesMinusOne: "-1 page",
    pagesPlusOne: "+1 page",
    start: "Start",
    pause: "Pause",
    stop: "Stop",
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
    syncingExams: "Syncing exams...",
    examLabel: "Exam",
    daysLeft: "days left",
    recorded: "Recorded",
    readiness: "Readiness",
    focusContribution: "Focus contribution",
    completion: "Completion",
    progressStrip: "Exam progress strip",
    statusNotStarted: "Not started",
    statusWarmingUp: "Warming up",
    statusSteady: "Steady",
    statusAlmostReady: "Almost ready",
    statusReady: "Ready",
    contributionNone: "None",
    contributionLow: "Low",
    contributionMedium: "Medium",
    contributionHigh: "High",
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
    engineSuggested: "Suggerito dal motore",
    engineSuggestedApply: "Usa suggerito",
    engineSuggestedHint: "Target automatico dal baseline della traccia esame.",
    engineSuggestedMissing: "Seleziona un esame per sbloccare il timer suggerito.",
    engineSuggestedApplied: "Timer del motore applicato",
    addTenMinutes: "+10 min",
    liveControls: "Controlli live",
    pagesQuick: "Regolazione rapida pagine",
    pagesMinusOne: "-1 pagina",
    pagesPlusOne: "+1 pagina",
    start: "Avvia",
    pause: "Pausa",
    stop: "Stop",
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
    syncingExams: "Sincronizzazione esami...",
    examLabel: "Esame",
    daysLeft: "giorni rimanenti",
    recorded: "Registrato",
    readiness: "Prontezza",
    focusContribution: "Contributo focus",
    completion: "Completamento",
    progressStrip: "Barra progresso esami",
    statusNotStarted: "Non iniziato",
    statusWarmingUp: "In avvio",
    statusSteady: "Costante",
    statusAlmostReady: "Quasi pronto",
    statusReady: "Pronto",
    contributionNone: "Nullo",
    contributionLow: "Basso",
    contributionMedium: "Medio",
    contributionHigh: "Alto",
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

function estimatePagesFromMinutes(subjectName: string, minutes: number) {
  const pace = inferSubjectPace(subjectName);
  const pages = (minutes / 60) * pace.pagesPerHour;
  return Math.max(1, Math.round(pages));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type FocusCopy = (typeof COPY)[keyof typeof COPY];

function progressStateLabel(state: ExamProgressState, t: FocusCopy) {
  if (state === "ready") return t.statusReady;
  if (state === "almost_ready") return t.statusAlmostReady;
  if (state === "steady") return t.statusSteady;
  if (state === "warming_up") return t.statusWarmingUp;
  return t.statusNotStarted;
}

function focusContributionLabel(level: FocusContributionLevel, t: FocusCopy) {
  if (level === "high") return t.contributionHigh;
  if (level === "medium") return t.contributionMedium;
  if (level === "low") return t.contributionLow;
  return t.contributionNone;
}

export default function PlannerFocusPage() {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { exams, loading: loadingExams, syncing: syncingExams, error: examsError } =
    useFocusExamsData();
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [rewardLine, setRewardLine] = useState("");
  const [stats, setStats] = useState<FocusStats>(() => getInitialFocusStats());
  const [selectedExamId, setSelectedExamId] = useState("");
  const [focusTopic, setFocusTopic] = useState("");
  const [pagesCompletedInput, setPagesCompletedInput] = useState("");
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(() =>
    readFocusProgress(),
  );
  const hasHydratedClientState = useSyncExternalStore(
    HYDRATION_SUBSCRIBE,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );
  const dataErrorMessage = examsError;

  const minutesLeft = Math.floor(focusSecondsLeft / 60);
  const secondsLeft = focusSecondsLeft % 60;
  const { xp, streak, sessionsCompleted } = stats;
  const examTracks = useMemo(
    () => buildExamProgressSnapshot(exams, focusProgress),
    [exams, focusProgress],
  );
  const resolvedSelectedExamId = useMemo(() => {
    if (selectedExamId && examTracks.some((track) => track.examId === selectedExamId)) {
      return selectedExamId;
    }
    return examTracks[0]?.examId ?? "";
  }, [examTracks, selectedExamId]);

  const selectedExam = useMemo(
    () => examTracks.find((track) => track.examId === resolvedSelectedExamId) ?? null,
    [examTracks, resolvedSelectedExamId],
  );
  const suggestedFocusMinutes = useMemo(() => {
    if (!selectedExam) return null;
    const baselineMinutes = Number(selectedExam.recommendedMinutesPerDay);
    if (!Number.isFinite(baselineMinutes) || baselineMinutes <= 0) return null;
    const roundedToFive = Math.round(baselineMinutes / 5) * 5;
    return clamp(roundedToFive, 20, 120);
  }, [selectedExam]);
  const selectedExamDaysLeft = selectedExam ? selectedExam.daysLeft : null;
  const pagesCompletedValue = useMemo(() => {
    const parsed = Number(pagesCompletedInput);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
  }, [pagesCompletedInput]);

  const mascotMood = useMemo(() => {
    if (focusRunning) return t.moodFocused;
    if (
      selectedExamDaysLeft !== null &&
      selectedExamDaysLeft <= 5 &&
      (selectedExam?.completionPercent ?? 0) < 35
    ) {
      return t.moodAlert;
    }
    if (streak >= 3 || (selectedExam?.sessionsCompleted ?? 0) >= 3) return t.moodTrack;
    if (sessionsCompleted >= 1) return t.moodWarm;
    return t.moodReady;
  }, [
    focusRunning,
    selectedExam?.completionPercent,
    selectedExam?.sessionsCompleted,
    selectedExamDaysLeft,
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
    if (!hasHydratedClientState) return;
    localStorage.setItem("studyapp_focus_stats", JSON.stringify(stats));
  }, [hasHydratedClientState, stats]);

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
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

      const { totalXp: gainedXp } = calculateFocusSessionXp(
        focusMinutes,
        stats.streak,
      );
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
          : estimatePagesFromMinutes(selectedExam.subjectName, focusMinutes);
        const topic = focusTopic.trim() || selectedExam.examTitle;
        recordFocusProgress(selectedExam.examId, loggedPages, focusMinutes, topic);
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
    if (!resolvedSelectedExamId) {
      setMessage(t.selectExamFirst);
      return;
    }
    setFocusSecondsLeft(focusMinutes * 60);
    setFocusLocked(true);
    setFocusRunning(true);
    setMessage(t.started);
  }

  function applyEngineSuggestedTimer() {
    if (focusRunning || suggestedFocusMinutes === null) return;
    setFocusMinutes(suggestedFocusMinutes);
    setFocusSecondsLeft(suggestedFocusMinutes * 60);
    setMessage(`${t.engineSuggestedApplied}: ${suggestedFocusMinutes} min.`);
  }

  function addTenMinutes() {
    if (!focusRunning) return;
    setFocusMinutes((current) => current + 10);
    setFocusSecondsLeft((current) => current + 10 * 60);
  }

  function adjustPagesCompleted(delta: number) {
    if (!focusRunning) return;
    setPagesCompletedInput((current) => {
      const parsed = Number(current);
      const normalized = Number.isFinite(parsed) ? Math.round(parsed) : 0;
      return String(Math.max(0, normalized + delta));
    });
  }

  function pauseSession() {
    setFocusRunning(false);
    setMessage(t.paused);
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="planner-card">
          <p className="planner-eyebrow">{t.xp}</p>
          <p className="text-2xl font-extrabold text-slate-900">{xp}</p>
        </div>
        <div className="planner-card">
          <p className="planner-eyebrow">{t.streak}</p>
          <p className="text-2xl font-extrabold text-slate-900">{streak}d</p>
        </div>
        <div className="planner-card">
          <p className="planner-eyebrow">{t.sessions}</p>
          <p className="text-2xl font-extrabold text-slate-900">{sessionsCompleted}</p>
        </div>
        <div className="planner-card">
          <p className="planner-eyebrow">{t.mood}</p>
          <p className="text-2xl font-extrabold text-slate-900">{mascotMood}</p>
          <p className="mt-1 text-xs text-slate-600">{moodHint}</p>
        </div>
      </section>

      <section className="planner-panel">
        {loadingExams ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{t.loadingExams}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="planner-skeleton h-12" />
              <div className="planner-skeleton h-12" />
            </div>
          </div>
        ) : examTracks.length === 0 ? (
          <p className="text-sm text-slate-600">{t.noExam}</p>
        ) : (
          <div className="space-y-3">
            {syncingExams ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.syncingExams}
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
            <label className="planner-field">
              <span className="planner-eyebrow mb-1 block">
                {t.targetExam}
              </span>
              <select
                value={resolvedSelectedExamId}
                onChange={(event) => setSelectedExamId(event.target.value)}
                className="planner-input"
              >
                {examTracks.map((track) => (
                  <option key={track.examId} value={track.examId}>
                    {track.examTitle} - {track.subjectName} ({track.completionPercent}%)
                  </option>
                ))}
              </select>
              {selectedExam ? (
                <p className="mt-2 text-xs text-slate-600">
                  {t.examLabel}: {selectedExam.examTitle} - {selectedExam.daysLeft} {t.daysLeft}
                </p>
              ) : null}
            </label>

            <label className="planner-field">
              <span className="planner-eyebrow mb-1 block">
                {t.topic}
              </span>
              <input
                type="text"
                value={focusTopic}
                onChange={(event) => setFocusTopic(event.target.value)}
                placeholder={t.topicPlaceholder}
                className="planner-input"
              />
            </label>

            <label className="planner-field">
              <span className="planner-eyebrow mb-1 block">
                {t.pagesInput}
              </span>
              <input
                type="number"
                min={1}
                value={pagesCompletedInput}
                onChange={(event) => setPagesCompletedInput(event.target.value)}
                className="planner-input"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="planner-eyebrow">{t.pagesQuick}</span>
                <button
                  type="button"
                  onClick={() => adjustPagesCompleted(-1)}
                  disabled={!focusRunning || pagesCompletedValue <= 0}
                  className={`planner-btn planner-btn-secondary px-3 py-1 text-xs ${
                    !focusRunning || pagesCompletedValue <= 0
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  {t.pagesMinusOne}
                </button>
                <button
                  type="button"
                  onClick={() => adjustPagesCompleted(1)}
                  disabled={!focusRunning}
                  className={`planner-btn planner-btn-secondary px-3 py-1 text-xs ${
                    !focusRunning ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {t.pagesPlusOne}
                </button>
              </div>
            </label>
            </div>

            {selectedExam ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="planner-card-soft bg-white px-3 py-2 text-xs text-slate-700">
                  <span className="planner-eyebrow">{t.readiness}</span>
                  <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 font-semibold ${progressStateClasses(selectedExam.progressState)}`}>
                    {progressStateLabel(selectedExam.progressState, t)}
                  </p>
                </div>
                <div className="planner-card-soft bg-white px-3 py-2 text-xs text-slate-700">
                  <span className="planner-eyebrow">{t.focusContribution}</span>
                  <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 font-semibold ${focusContributionClasses(selectedExam.focusContributionLevel)}`}>
                    {focusContributionLabel(selectedExam.focusContributionLevel, t)} ({selectedExam.focusContributionPercent}%)
                  </p>
                </div>
                <div className="planner-card-soft bg-white px-3 py-2 text-xs text-slate-700">
                  <span className="planner-eyebrow">{t.completion}</span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedExam.completedPages}/{selectedExam.estimatedPages}p
                  </p>
                </div>
              </div>
            ) : null}

            <div>
              <p className="planner-eyebrow">{t.progressStrip}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {examTracks.map((track) => (
                  <button
                    key={track.examId}
                    type="button"
                    onClick={() => setSelectedExamId(track.examId)}
                    className={`planner-chip rounded-lg border px-2 py-1 text-xs font-semibold ${progressStateClasses(track.progressState)}`}
                  >
                    {track.subjectName}: {track.completionPercent}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="planner-panel">
        <div className="planner-card bg-gradient-to-br from-sky-50 to-cyan-50">
          <p className="planner-eyebrow">{t.timer}</p>
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

        <div className="mt-4 planner-card-soft bg-white px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="planner-eyebrow">{t.engineSuggested}</p>
            <button
              type="button"
              onClick={applyEngineSuggestedTimer}
              disabled={focusRunning || suggestedFocusMinutes === null || !selectedExam}
              className={`planner-btn planner-btn-secondary ${
                focusRunning || suggestedFocusMinutes === null || !selectedExam
                  ? "cursor-not-allowed opacity-60"
                  : ""
              }`}
            >
              {t.engineSuggestedApply}
              {suggestedFocusMinutes !== null ? ` (${suggestedFocusMinutes} min)` : ""}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {selectedExam ? t.engineSuggestedHint : t.engineSuggestedMissing}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startSession}
            className="planner-btn planner-btn-accent"
          >
            {t.start}
          </button>
          <button
            type="button"
            onClick={pauseSession}
            className="planner-btn planner-btn-secondary"
          >
            {t.pause}
          </button>
          <button
            type="button"
            onClick={() => finishFocusSession(false)}
            className="planner-btn planner-btn-secondary"
          >
            {t.stop}
          </button>
          <button
            type="button"
            onClick={addTenMinutes}
            disabled={!focusRunning}
            className={`planner-btn planner-btn-secondary ${
              !focusRunning ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {t.addTenMinutes}
          </button>
        </div>
      </section>

      {message || dataErrorMessage ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message || dataErrorMessage}
        </section>
      ) : null}

      {rewardLine ? (
        <section
          className="planner-card border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
          role="status"
          aria-live="polite"
        >
          {rewardLine}
        </section>
      ) : null}

      {focusLocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="planner-panel w-full max-w-md bg-white text-center shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">{t.lockTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.lockSubtitle}</p>
            <p className="mt-4 text-5xl font-extrabold tracking-tight text-sky-700">
              {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t.liveControls}: {t.pagesQuick}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={addTenMinutes}
                disabled={!focusRunning}
                className={`planner-btn planner-btn-secondary ${
                  !focusRunning ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {t.addTenMinutes}
              </button>
              <button
                type="button"
                onClick={() => adjustPagesCompleted(-1)}
                disabled={!focusRunning || pagesCompletedValue <= 0}
                className={`planner-btn planner-btn-secondary ${
                  !focusRunning || pagesCompletedValue <= 0
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
              >
                {t.pagesMinusOne}
              </button>
              <button
                type="button"
                onClick={() => adjustPagesCompleted(1)}
                disabled={!focusRunning}
                className={`planner-btn planner-btn-secondary ${
                  !focusRunning ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {t.pagesPlusOne}
              </button>
              <button
                type="button"
                onClick={pauseSession}
                className="planner-btn planner-btn-secondary"
              >
                {t.pause}
              </button>
              <button
                type="button"
                onClick={() => finishFocusSession(false)}
                className="planner-btn planner-btn-secondary"
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
