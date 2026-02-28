"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type Subject = {
  id: string;
  name: string;
};

type Exam = {
  id: string;
  title: string;
  examDate: string;
  targetGrade: string | null;
  subject: Subject;
};

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

export default function PlannerExamsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadExams() {
    setRefreshing(true);
    const { ok, payload } = await requestJson<Exam[]>("/api/exams");
    setRefreshing(false);
    if (!ok || !payload.data) {
      setMessage(payload.error ?? t.loadExamsError);
      return false;
    }
    setExams(payload.data);
    return true;
  }

  const loadInitialData = useCallback(async () => {
    const [subjectsRes, examsRes] = await Promise.all([
      requestJson<Subject[]>("/api/subjects"),
      requestJson<Exam[]>("/api/exams"),
    ]);

    if (subjectsRes.ok && subjectsRes.payload.data) {
      const subjectsData = subjectsRes.payload.data;
      setSubjects(subjectsData);
      setSubjectId((current) => current || subjectsData[0]?.id || "");
    } else {
      setMessage(subjectsRes.payload.error ?? t.loadSubjectsError);
    }

    if (examsRes.ok && examsRes.payload.data) {
      setExams(examsRes.payload.data);
    } else {
      setMessage(examsRes.payload.error ?? t.loadExamsError);
    }
  }, [t.loadExamsError, t.loadSubjectsError]);

  useEffect(() => {
    if (!student?.id) return;

    let active = true;

    async function load() {
      await loadInitialData();
      if (!active) return;
    }

    void load();

    return () => {
      active = false;
    };
  }, [student?.id, loadInitialData]);

  async function createExam(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    if (!subjectId) {
      setMessage(t.noSubject);
      return;
    }

    if (!examDate) {
      setMessage(t.noDate);
      return;
    }

    setSubmitting(true);
    const { ok, payload } = await requestJson<Exam>("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
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
    await loadExams();
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
    await loadExams();
    notifyDataRevision();
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">{t.loading}</p>
        ) : (
          <form className="grid gap-3 md:grid-cols-4" onSubmit={createExam}>
            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.subject}
              </span>
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              >
                <option value="">{t.selectSubject}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.examTitle}
              </span>
              <input
                required
                type="text"
                value={examTitle}
                onChange={(event) => setExamTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
            </label>

            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.examDate}
              </span>
              <input
                required
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
            </label>

            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.targetGrade}
              </span>
              <input
                type="text"
                value={targetGrade}
                onChange={(event) => setTargetGrade(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-4"
            >
              {t.addExam}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {t.list} ({exams.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadExams()}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {t.refresh}
          </button>
        </div>

        {exams.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.none}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-sm text-slate-600">
                    {exam.subject.name} -{" "}
                    {new Date(exam.examDate).toLocaleDateString(
                      language === "it" ? "it-IT" : "en-US",
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/planner?exam=${exam.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.openTimeline}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void deleteExam(exam.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    aria-label={`${t.delete} ${exam.title}`}
                  >
                    {t.delete} x
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
