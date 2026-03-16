"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

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
} from "@/app/planner/_lib/season-engine";
import { progressStateClasses } from "@/app/planner/_lib/status-ui";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type CreatedSubject = {
  id: string;
  name: string;
};

type SubjectHint = {
  workloadMode: "light" | "standard" | "deep";
  summaryCoverage: number;
};

type SubjectDeleteRelationCounts = {
  exams: number;
  sources: number;
  studySessions: number;
};

type DeletedSubject = {
  id: string;
  relationCounts: SubjectDeleteRelationCounts;
};

type SubjectDeleteConflictDetails = {
  id?: string;
  relationCounts?: SubjectDeleteRelationCounts;
  requiresConfirmCascade?: boolean;
};

const SUBJECT_PRESETS = [
  { name: "Biology", color: "#16a34a" },
  { name: "Chemistry", color: "#ea580c" },
  { name: "Physics", color: "#2563eb" },
  { name: "Mathematics", color: "#7c3aed" },
  { name: "Private Law", color: "#dc2626" },
  { name: "History", color: "#b45309" },
  { name: "Literature", color: "#0f766e" },
  { name: "English", color: "#0ea5e9" },
] as const;

const COPY = {
  en: {
    title: "Subject Hub",
    subtitle: "Subjects power organization and improve estimator quality.",
    presets: "Quick presets",
    name: "Subject name",
    color: "Color label",
    add: "Add subject",
    analytics: "Subject load dashboard",
    noSubjects: "No subjects yet. Add one to unlock planning cards.",
    workloadGuide: "Workload guide",
    linkedExams: "Exams linked",
    closestDeadline: "Closest deadline",
    readyExams: "Ready exams",
    avgProgress: "Average progress",
    focusMinutes: "Focus minutes",
    openTimeline: "Open timeline",
    workloadMode: "Workload mode",
    summaryCoverage: "Summary coverage %",
    loading: "Loading account...",
    noAccount: "No account context found.",
    subjectCreated: "Subject created",
    hintSaved: "Subject hint saved for algorithm tuning.",
    noDeadline: "n/a",
    daySuffix: "day(s)",
    examsPerSubject: "Exam timelines",
    openExams: "Open Exams",
    delete: "Delete",
    deleteConfirmPrompt: "Delete subject",
    deleteLinkedWarning:
      "This subject has linked data. Confirming will remove linked records too.",
    deleteCancelAction: "Cancel",
    deleteConfirmAction: "Confirm delete",
    subjectDeleted: "Subject deleted",
    deleteError: "Failed to delete subject",
    linkedSources: "Sources linked",
    linkedStudySessions: "Study sessions linked",
    loadExamsError: "Failed to load exams",
    statusNotStarted: "Not started",
    statusWarmingUp: "Warming up",
    statusSteady: "Steady",
    statusAlmostReady: "Almost ready",
    statusReady: "Ready",
    light: "Light",
    standard: "Standard",
    deep: "Deep",
    lightGuide:
      "Lower daily intensity, larger revision buffer, safer against overload.",
    standardGuide:
      "Balanced path for most students. Good tradeoff between pace and consistency.",
    deepGuide:
      "Higher daily load for tight deadlines. Better completion odds, higher fatigue risk.",
  },
  it: {
    title: "Hub Materie",
    subtitle: "Le materie migliorano organizzazione e qualita delle stime.",
    presets: "Preset rapidi",
    name: "Nome materia",
    color: "Colore",
    add: "Aggiungi materia",
    analytics: "Dashboard carico materie",
    noSubjects: "Nessuna materia. Aggiungine una per attivare le card.",
    workloadGuide: "Guida carico",
    linkedExams: "Esami collegati",
    closestDeadline: "Scadenza piu vicina",
    readyExams: "Esami pronti",
    avgProgress: "Progresso medio",
    focusMinutes: "Minuti focus",
    openTimeline: "Apri timeline",
    workloadMode: "Modalita carico",
    summaryCoverage: "Copertura riassunti %",
    loading: "Caricamento account...",
    noAccount: "Contesto account non trovato.",
    subjectCreated: "Materia creata",
    hintSaved: "Preferenza materia salvata per l'algoritmo.",
    noDeadline: "n/d",
    daySuffix: "giorni",
    examsPerSubject: "Timeline esami",
    openExams: "Apri Esami",
    delete: "Elimina",
    deleteConfirmPrompt: "Eliminare la materia",
    deleteLinkedWarning:
      "Questa materia ha dati collegati. Confermando verranno eliminati anche i record collegati.",
    deleteCancelAction: "Annulla",
    deleteConfirmAction: "Conferma eliminazione",
    subjectDeleted: "Materia eliminata",
    deleteError: "Impossibile eliminare la materia",
    linkedSources: "Fonti collegate",
    linkedStudySessions: "Sessioni studio collegate",
    loadExamsError: "Impossibile caricare gli esami",
    statusNotStarted: "Non iniziato",
    statusWarmingUp: "In avvio",
    statusSteady: "Costante",
    statusAlmostReady: "Quasi pronto",
    statusReady: "Pronto",
    light: "Light",
    standard: "Standard",
    deep: "Deep",
    lightGuide:
      "Intensita giornaliera ridotta, maggiore buffer di revisione, meno rischio di overload.",
    standardGuide:
      "Percorso bilanciato per la maggior parte degli studenti.",
    deepGuide:
      "Carico giornaliero alto per scadenze strette, piu rischio fatica.",
  },
} as const;

const SUBJECT_HINTS_STORAGE_KEY = "studyapp_subject_hints";
const EMPTY_SUBJECT_HINTS: Record<string, SubjectHint> = {};

const HYDRATION_SUBSCRIBE = () => () => {};
const getHydratedSnapshot = () => true;
const getHydratedServerSnapshot = () => false;

type SubjectsCopy = (typeof COPY)[keyof typeof COPY];

function progressStateLabel(state: ExamProgressState, t: SubjectsCopy) {
  if (state === "ready") return t.statusReady;
  if (state === "almost_ready") return t.statusAlmostReady;
  if (state === "steady") return t.statusSteady;
  if (state === "warming_up") return t.statusWarmingUp;
  return t.statusNotStarted;
}

function normalizeRelationCounts(
  relationCounts: SubjectDeleteRelationCounts | undefined,
): SubjectDeleteRelationCounts {
  return {
    exams: Number(relationCounts?.exams ?? 0),
    sources: Number(relationCounts?.sources ?? 0),
    studySessions: Number(relationCounts?.studySessions ?? 0),
  };
}

function buildCascadeConfirmMessage(
  subjectName: string,
  relationCounts: SubjectDeleteRelationCounts,
  t: SubjectsCopy,
) {
  return [
    `${t.deleteConfirmPrompt}: ${subjectName}?`,
    t.deleteLinkedWarning,
    `${t.linkedExams}: ${relationCounts.exams}`,
    `${t.linkedSources}: ${relationCounts.sources}`,
    `${t.linkedStudySessions}: ${relationCounts.studySessions}`,
    "",
    `${t.deleteConfirmAction}: OK`,
    `${t.deleteCancelAction}: Cancel`,
  ].join("\n");
}

function getInitialSubjectHints(): Record<string, SubjectHint> {
  if (typeof window === "undefined") return EMPTY_SUBJECT_HINTS;

  const raw = localStorage.getItem(SUBJECT_HINTS_STORAGE_KEY);
  if (!raw) return EMPTY_SUBJECT_HINTS;

  try {
    return JSON.parse(raw) as Record<string, SubjectHint>;
  } catch {
    return EMPTY_SUBJECT_HINTS;
  }
}

export default function PlannerSubjectsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { subjects, exams, errors, refresh } = usePlannerData({
    enabled: Boolean(student?.id),
    subscribeToRevision: false,
  });
  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(() =>
    readFocusProgress(),
  );
  const [subjectHints, setSubjectHints] = useState<Record<string, SubjectHint>>(
    () => getInitialSubjectHints(),
  );
  const storageHydrated = useSyncExternalStore(
    HYDRATION_SUBSCRIBE,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  );
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("");
  const [message, setMessage] = useState("");
  const dataErrorMessage = errors.subjects ?? errors.exams ?? "";
  const examTracks = useMemo(
    () => buildExamProgressSnapshot(exams, focusProgress),
    [exams, focusProgress],
  );

  useEffect(() => {
    if (!storageHydrated) return;
    localStorage.setItem(SUBJECT_HINTS_STORAGE_KEY, JSON.stringify(subjectHints));
  }, [storageHydrated, subjectHints]);

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
      setFocusProgress(readFocusProgress());
    });
  }, []);

  async function createSubjectByValues(name: string, color?: string) {
    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    const { ok, payload } = await requestJson<CreatedSubject>("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to create subject");
      return;
    }

    setMessage(`${t.subjectCreated}: ${payload.data.name}`);
    const refreshResult = await refresh();
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.subjects ?? refreshResult.errors.exams ?? "Failed to load subjects");
      return;
    }
    notifyDataRevision();
  }

  async function createSubject(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    await createSubjectByValues(subjectName, subjectColor || undefined);
    setSubjectName("");
    setSubjectColor("");
  }

  async function deleteSubject(subjectId: string, subjectName: string) {
    setMessage("");

    const endpoint = `/api/subjects?id=${encodeURIComponent(subjectId)}`;
    const firstAttempt = await requestJson<DeletedSubject>(endpoint, {
      method: "DELETE",
    });

    if (!firstAttempt.ok) {
      const details = firstAttempt.payload.details as SubjectDeleteConflictDetails | undefined;
      if (details?.requiresConfirmCascade === true) {
        const relationCounts = normalizeRelationCounts(details.relationCounts);
        const confirmed = window.confirm(
          buildCascadeConfirmMessage(subjectName, relationCounts, t),
        );

        if (!confirmed) {
          return;
        }

        const confirmedAttempt = await requestJson<DeletedSubject>(
          `${endpoint}&confirmCascade=true`,
          {
            method: "DELETE",
          },
        );

        if (!confirmedAttempt.ok || !confirmedAttempt.payload.data) {
          setMessage(confirmedAttempt.payload.error ?? t.deleteError);
          return;
        }
      } else {
        setMessage(firstAttempt.payload.error ?? t.deleteError);
        return;
      }
    }

    const refreshResult = await refresh({ force: true });
    notifyDataRevision();
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.subjects ?? refreshResult.errors.exams ?? t.loadExamsError);
      return;
    }
    setMessage(`${t.subjectDeleted}: ${subjectName}`);
  }

  function setSubjectHint(subjectId: string, patch: Partial<SubjectHint>) {
    setSubjectHints((current) => ({
      ...current,
      [subjectId]: {
        workloadMode: current[subjectId]?.workloadMode ?? "standard",
        summaryCoverage: current[subjectId]?.summaryCoverage ?? 30,
        ...patch,
      },
    }));
    setMessage(t.hintSaved);
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="planner-panel">
        <h2 className="text-lg font-bold text-slate-900">{t.workloadGuide}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="planner-card border-emerald-300 bg-emerald-50">
            <p className="planner-eyebrow text-emerald-700">{t.light}</p>
            <p className="mt-1 text-sm text-emerald-900">
              {t.lightGuide}
            </p>
          </article>
          <article className="planner-card border-sky-300 bg-sky-50">
            <p className="planner-eyebrow text-sky-700">{t.standard}</p>
            <p className="mt-1 text-sm text-sky-900">
              {t.standardGuide}
            </p>
          </article>
          <article className="planner-card border-violet-300 bg-violet-50">
            <p className="planner-eyebrow text-violet-700">{t.deep}</p>
            <p className="mt-1 text-sm text-violet-900">
              {t.deepGuide}
            </p>
          </article>
        </div>
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
          <div className="space-y-4">
            <div>
              <p className="planner-eyebrow">{t.presets}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUBJECT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => createSubjectByValues(preset.name, preset.color)}
                    className="planner-btn planner-btn-secondary"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-3" onSubmit={createSubject}>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">
                  {t.name}
                </span>
                <input
                  required
                  type="text"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  className="planner-input"
                  placeholder="Biology"
                />
              </label>

              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">
                  {t.color}
                </span>
                <select
                  value={subjectColor}
                  onChange={(event) => setSubjectColor(event.target.value)}
                  className="planner-input"
                >
                  <option value="">No color</option>
                  <option value="#2563eb">Blue</option>
                  <option value="#16a34a">Green</option>
                  <option value="#ea580c">Orange</option>
                  <option value="#dc2626">Red</option>
                  <option value="#7c3aed">Purple</option>
                </select>
              </label>

              <button
                type="submit"
                className="planner-btn planner-btn-accent"
              >
                {t.add}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="planner-panel">
        <h2 className="text-lg font-bold text-slate-900">{t.analytics}</h2>
        {subjects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.noSubjects}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {subjects.map((subject) => {
              const linkedTracks = examTracks.filter((track) => track.subjectId === subject.id);
              const nearestDays =
                linkedTracks.length === 0
                  ? null
                  : Math.min(...linkedTracks.map((track) => track.daysLeft));
              const nearestExam = linkedTracks[0];
              const readyExams = linkedTracks.filter((track) => track.progressState === "ready").length;
              const avgProgress =
                linkedTracks.length === 0
                  ? 0
                  : Math.round(
                      linkedTracks.reduce((acc, track) => acc + track.completionPercent, 0) /
                        linkedTracks.length,
                    );
              const totalFocusMinutes = linkedTracks.reduce(
                (acc, track) => acc + track.minutesSpent,
                0,
              );
              const hint = subjectHints[subject.id] ?? {
                workloadMode: "standard",
                summaryCoverage: 30,
              };

              return (
                <article key={subject.id} className="planner-card bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-slate-900">{subject.name}</p>
                    <span
                      className="inline-flex h-6 w-6 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: subject.color ?? "#94a3b8" }}
                    />
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    <p>
                      {t.linkedExams}: <strong>{linkedTracks.length}</strong>
                    </p>
                    <p>
                      {t.closestDeadline}:{" "}
                      <strong>
                        {nearestDays === null ? t.noDeadline : `${nearestDays} ${t.daySuffix}`}
                      </strong>
                    </p>
                    <p>
                      {t.readyExams}: <strong>{readyExams}</strong>
                    </p>
                    <p>
                      {t.avgProgress}: <strong>{avgProgress}%</strong>
                    </p>
                    <p>
                      {t.focusMinutes}: <strong>{totalFocusMinutes}m</strong>
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {nearestExam ? (
                      <Link
                        href={`/planner?exam=${nearestExam.examId}`}
                        className="planner-btn planner-btn-secondary min-h-0 py-1.5"
                      >
                        {t.openTimeline}
                      </Link>
                    ) : null}
                    <Link
                      href="/planner/exams"
                      className="planner-btn planner-btn-secondary min-h-0 py-1.5"
                    >
                      {t.openExams}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void deleteSubject(subject.id, subject.name)}
                      className="planner-btn planner-btn-danger min-h-0 py-1.5"
                      aria-label={`${t.delete} ${subject.name}`}
                    >
                      {t.delete}
                    </button>
                  </div>

                  <div className="planner-card-soft mt-2 bg-white p-2">
                    <p className="planner-eyebrow">
                      {t.examsPerSubject}
                    </p>
                    {linkedTracks.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-600">{t.noDeadline}</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {linkedTracks.map((track) => (
                            <Link
                              key={track.examId}
                              href={`/planner?exam=${track.examId}`}
                              className={`planner-chip min-h-0 rounded-lg border px-2 py-1 text-xs ${progressStateClasses(track.progressState)}`}
                            >
                              {track.examTitle} ({track.completionPercent}%)
                              {" - "}
                              {progressStateLabel(track.progressState, t)}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="planner-card-soft bg-white p-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t.workloadMode}
                      <select
                        value={hint.workloadMode}
                        onChange={(event) =>
                          setSubjectHint(subject.id, {
                            workloadMode: event.target.value as SubjectHint["workloadMode"],
                          })
                        }
                        className="planner-input mt-1 normal-case text-sm text-slate-800"
                      >
                        <option value="light">{t.light}</option>
                        <option value="standard">{t.standard}</option>
                        <option value="deep">{t.deep}</option>
                      </select>
                    </label>

                    <label className="planner-card-soft bg-white p-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t.summaryCoverage}
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={hint.summaryCoverage}
                        onChange={(event) =>
                          setSubjectHint(subject.id, {
                            summaryCoverage: Number(event.target.value),
                          })
                        }
                        className="planner-input mt-1 normal-case text-sm text-slate-800"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
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
