"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { notifyDataRevision, subscribeDataRevision } from "@/app/planner/_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type Subject = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
};

type Exam = {
  id: string;
  examDate: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
};

type SubjectHint = {
  workloadMode: "light" | "standard" | "deep";
  summaryCoverage: number;
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
    loadExamsError: "Failed to load exams",
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
    loadExamsError: "Impossibile caricare gli esami",
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

function daysUntil(examDate: string) {
  const diff = Math.ceil((new Date(examDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(diff, 0);
}

export default function PlannerSubjectsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectHints, setSubjectHints] = useState<Record<string, SubjectHint>>(() => {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(SUBJECT_HINTS_STORAGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, SubjectHint>;
    } catch {
      return {};
    }
  });
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("");
  const [message, setMessage] = useState("");

  async function loadSubjects() {
    const { ok, payload } = await requestJson<Subject[]>("/api/subjects");
    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to load subjects");
      return false;
    }
    setSubjects(payload.data);
    return true;
  }

  useEffect(() => {
    if (!student?.id) return;

    let active = true;
    void Promise.all([requestJson<Subject[]>("/api/subjects"), requestJson<Exam[]>("/api/exams")]).then(
      ([subjectsRes, examsRes]) => {
        if (!active) return;
        if (!subjectsRes.ok || !subjectsRes.payload.data) {
          setMessage(subjectsRes.payload.error ?? "Failed to load subjects");
          return;
        }
        setSubjects(subjectsRes.payload.data);
        if (examsRes.ok && examsRes.payload.data) {
          setExams(examsRes.payload.data);
        } else {
          setMessage(examsRes.payload.error ?? t.loadExamsError);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [student?.id, t.loadExamsError]);

  useEffect(() => {
    return subscribeDataRevision(() => {
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

  useEffect(() => {
    localStorage.setItem(SUBJECT_HINTS_STORAGE_KEY, JSON.stringify(subjectHints));
  }, [subjectHints]);

  async function createSubjectByValues(name: string, color?: string) {
    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    const { ok, payload } = await requestJson<Subject>("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to create subject");
      return;
    }

    setMessage(`${t.subjectCreated}: ${payload.data.name}`);
    await loadSubjects();
    notifyDataRevision();
  }

  async function createSubject(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    await createSubjectByValues(subjectName, subjectColor || undefined);
    setSubjectName("");
    setSubjectColor("");
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
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#fef9c3_0%,#ecfeff_48%,#ffffff_100%)] p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t.workloadGuide}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t.light}</p>
            <p className="mt-1 text-sm text-emerald-900">
              {t.lightGuide}
            </p>
          </article>
          <article className="rounded-2xl border border-sky-300 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{t.standard}</p>
            <p className="mt-1 text-sm text-sky-900">
              {t.standardGuide}
            </p>
          </article>
          <article className="rounded-2xl border border-violet-300 bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{t.deep}</p>
            <p className="mt-1 text-sm text-violet-900">
              {t.deepGuide}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">{t.loading}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.presets}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUBJECT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => createSubjectByValues(preset.name, preset.color)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-3" onSubmit={createSubject}>
              <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.name}
                </span>
                <input
                  required
                  type="text"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
                  placeholder="Biology"
                />
              </label>

              <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.color}
                </span>
                <select
                  value={subjectColor}
                  onChange={(event) => setSubjectColor(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
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
                className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
              >
                {t.add}
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t.analytics}</h2>
        {subjects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.noSubjects}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {subjects.map((subject) => {
              const linkedExams = exams.filter((exam) => exam.subject.id === subject.id);
              const nearestDays =
                linkedExams.length === 0
                  ? null
                  : Math.min(...linkedExams.map((exam) => daysUntil(exam.examDate)));
              const nearestExam = linkedExams
                .slice()
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];
              const hint = subjectHints[subject.id] ?? {
                workloadMode: "standard",
                summaryCoverage: 30,
              };

              return (
                <article key={subject.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-slate-900">{subject.name}</p>
                    <span
                      className="inline-flex h-6 w-6 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: subject.color ?? "#94a3b8" }}
                    />
                  </div>

                  <div className="mt-2 text-sm text-slate-700">
                    <p>
                      {t.linkedExams}: <strong>{linkedExams.length}</strong>
                    </p>
                    <p>
                      {t.closestDeadline}:{" "}
                      <strong>
                        {nearestDays === null ? t.noDeadline : `${nearestDays} ${t.daySuffix}`}
                      </strong>
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {nearestExam ? (
                      <Link
                        href={`/planner?exam=${nearestExam.id}`}
                        className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {t.openTimeline}
                      </Link>
                    ) : null}
                    <Link
                      href="/planner/exams"
                      className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t.openExams}
                    </Link>
                  </div>

                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t.examsPerSubject}
                    </p>
                    {linkedExams.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-600">{t.noDeadline}</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {linkedExams
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
                          )
                          .map((exam) => (
                            <Link
                              key={exam.id}
                              href={`/planner?exam=${exam.id}`}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {exam.title}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t.workloadMode}
                      <select
                        value={hint.workloadMode}
                        onChange={(event) =>
                          setSubjectHint(subject.id, {
                            workloadMode: event.target.value as SubjectHint["workloadMode"],
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm normal-case text-slate-800"
                      >
                        <option value="light">{t.light}</option>
                        <option value="standard">{t.standard}</option>
                        <option value="deep">{t.deep}</option>
                      </select>
                    </label>

                    <label className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm normal-case text-slate-800"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {message ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </section>
      ) : null}
    </main>
  );
}
