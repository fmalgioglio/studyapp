"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { usePlannerData } from "@/app/planner/_hooks/use-planner-data";
import {
  notifyDataRevision,
  readFocusProgress,
  subscribeDataRevision,
  type FocusProgressMap,
} from "@/app/planner/_lib/focus-progress";
import {
  buildExamProgressSnapshot,
  type ExamProgressState,
  type FocusContributionLevel,
} from "@/app/planner/_lib/season-engine";
import {
  focusContributionClasses,
  progressStateClasses,
} from "@/app/planner/_lib/status-ui";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

const COPY = {
  en: {
    title: "Exams",
    subtitle: "Manage full-session exams and open timeline details.",
    subject: "Subject",
    selectSubject: "Select subject",
    examTitle: "Exam title",
    examDate: "Exam date",
    targetGrade: "Target grade (optional)",
    addExam: "Add exam",
    list: "Exam list",
    none: "No exams yet.",
    refresh: "Refresh",
    openTimeline: "Open timeline",
    delete: "Delete",
    readiness: "Readiness",
    focusContribution: "Focus contribution",
    focusSignals: "Focus signals",
    statusNotStarted: "Not started",
    statusWarmingUp: "Warming up",
    statusSteady: "Steady",
    statusAlmostReady: "Almost ready",
    statusReady: "Ready",
    contributionNone: "None",
    contributionLow: "Low",
    contributionMedium: "Medium",
    contributionHigh: "High",
    loading: "Loading account...",
    noAccount: "No account context found.",
    noSubject: "Select a subject first.",
    noDate: "Select an exam date.",
    created: "Exam created",
    deleted: "Exam deleted.",
    loadSubjectsError: "Failed to load subjects",
    loadExamsError: "Failed to load exams",
    createError: "Failed to create exam",
    deleteError: "Failed to delete exam",
  },
  it: {
    title: "Esami",
    subtitle: "Gestisci gli esami della sessione e apri la timeline.",
    subject: "Materia",
    selectSubject: "Seleziona materia",
    examTitle: "Titolo esame",
    examDate: "Data esame",
    targetGrade: "Voto target (opzionale)",
    addExam: "Aggiungi esame",
    list: "Lista esami",
    none: "Nessun esame.",
    refresh: "Aggiorna",
    openTimeline: "Apri timeline",
    delete: "Elimina",
    readiness: "Prontezza",
    focusContribution: "Contributo focus",
    focusSignals: "Segnali focus",
    statusNotStarted: "Non iniziato",
    statusWarmingUp: "In avvio",
    statusSteady: "Costante",
    statusAlmostReady: "Quasi pronto",
    statusReady: "Pronto",
    contributionNone: "Nullo",
    contributionLow: "Basso",
    contributionMedium: "Medio",
    contributionHigh: "Alto",
    loading: "Caricamento account...",
    noAccount: "Contesto account non trovato.",
    noSubject: "Seleziona prima una materia.",
    noDate: "Seleziona la data esame.",
    created: "Esame creato",
    deleted: "Esame eliminato.",
    loadSubjectsError: "Impossibile caricare le materie",
    loadExamsError: "Impossibile caricare gli esami",
    createError: "Impossibile creare l'esame",
    deleteError: "Impossibile eliminare l'esame",
  },
} as const;

type CreatedExam = {
  id: string;
  title: string;
};

type ExamsCopy = (typeof COPY)[keyof typeof COPY];

function progressStateLabel(state: ExamProgressState, t: ExamsCopy) {
  if (state === "ready") return t.statusReady;
  if (state === "almost_ready") return t.statusAlmostReady;
  if (state === "steady") return t.statusSteady;
  if (state === "warming_up") return t.statusWarmingUp;
  return t.statusNotStarted;
}

function focusContributionLabel(level: FocusContributionLevel, t: ExamsCopy) {
  if (level === "high") return t.contributionHigh;
  if (level === "medium") return t.contributionMedium;
  if (level === "low") return t.contributionLow;
  return t.contributionNone;
}

export default function PlannerExamsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { subjects, exams, errors, refresh, refreshing } = usePlannerData({
    enabled: Boolean(student?.id),
    subscribeToRevision: false,
  });

  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(readFocusProgress);
  const [subjectId, setSubjectId] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedSubjectId = subjectId || subjects[0]?.id || "";
  const dataErrorMessage = errors.subjects ?? errors.exams ?? "";
  const examTracks = useMemo(
    () => buildExamProgressSnapshot(exams, focusProgress),
    [exams, focusProgress],
  );

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
      setFocusProgress(readFocusProgress());
    });
  }, []);

  async function handleRefresh() {
    const result = await refresh();
    if (!result.ok && !result.skipped) {
      setMessage(result.errors.exams ?? result.errors.subjects ?? t.loadExamsError);
    }
  }

  async function createExam(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    if (!selectedSubjectId) {
      setMessage(t.noSubject);
      return;
    }

    if (!examDate) {
      setMessage(t.noDate);
      return;
    }

    setSubmitting(true);
    const { ok, payload } = await requestJson<CreatedExam>("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: selectedSubjectId,
        title: examTitle.trim(),
        examDate,
        targetGrade: targetGrade.trim() || undefined,
      }),
    });
    setSubmitting(false);

    if (!ok || !payload.data) {
      setMessage(payload.error ?? t.createError);
      return;
    }

    setExamTitle("");
    setExamDate("");
    setTargetGrade("");
    setMessage(`${t.created}: ${payload.data.title}`);
    const refreshResult = await refresh();
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.exams ?? refreshResult.errors.subjects ?? t.loadExamsError);
      return;
    }
    notifyDataRevision();
  }

  async function deleteExam(id: string) {
    const { ok, payload } = await requestJson<{ id: string }>(`/api/exams?id=${id}`, {
      method: "DELETE",
    });

    if (!ok) {
      setMessage(payload.error ?? t.deleteError);
      return;
    }

    setMessage(t.deleted);
    const refreshResult = await refresh();
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.exams ?? refreshResult.errors.subjects ?? t.loadExamsError);
      return;
    }
    notifyDataRevision();
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="planner-panel">
        {loading ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{t.loading}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="planner-skeleton h-12" />
              <div className="planner-skeleton h-12" />
            </div>
          </div>
        ) : (
          <form className="grid gap-3 md:grid-cols-4" onSubmit={createExam}>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                {t.subject}
              </span>
              <select
                value={selectedSubjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="planner-input"
              >
                <option value="">{t.selectSubject}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                {t.examTitle}
              </span>
              <input
                required
                type="text"
                value={examTitle}
                onChange={(event) => setExamTitle(event.target.value)}
                className="planner-input"
              />
            </label>

            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                {t.examDate}
              </span>
              <input
                required
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="planner-input"
              />
            </label>

            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                {t.targetGrade}
              </span>
              <input
                type="text"
                value={targetGrade}
                onChange={(event) => setTargetGrade(event.target.value)}
                className="planner-input"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="planner-btn planner-btn-accent w-full md:col-span-4"
            >
              {t.addExam}
            </button>
          </form>
        )}
      </section>

      <section className="planner-panel">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {t.list} ({examTracks.length})
          </h2>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="planner-btn planner-btn-secondary"
          >
            {t.refresh}
          </button>
        </div>

        {examTracks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.none}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {examTracks.map((track) => (
              <li
                key={track.examId}
                className="planner-card flex flex-wrap items-center justify-between gap-2 bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{track.examTitle}</p>
                  <p className="text-sm text-slate-600">
                    {track.subjectName} -{" "}
                    {new Date(track.examDate).toLocaleDateString(
                      language === "it" ? "it-IT" : "en-US",
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${progressStateClasses(track.progressState)}`}>
                      {t.readiness}: {progressStateLabel(track.progressState, t)}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${focusContributionClasses(track.focusContributionLevel)}`}>
                      {t.focusContribution}: {focusContributionLabel(track.focusContributionLevel, t)} ({track.focusContributionPercent}%)
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                      {track.completedPages}/{track.estimatedPages}p
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                      {t.focusSignals}: {track.sessionsCompleted} sessions, {track.minutesSpent}m
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/planner?exam=${track.examId}`}
                    className="planner-btn planner-btn-secondary min-h-0 py-1.5"
                  >
                    {t.openTimeline}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void deleteExam(track.examId)}
                    className="planner-btn planner-btn-danger min-h-0 py-1.5"
                    aria-label={`${t.delete} ${track.examTitle}`}
                  >
                    {t.delete} x
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message || dataErrorMessage ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message || dataErrorMessage}
        </section>
      ) : null}
    </main>
  );
}
