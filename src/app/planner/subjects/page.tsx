"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import {
  usePlannerData,
  type PlannerSubject,
} from "@/app/planner/_hooks/use-planner-data";
import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import type { ExamPaceRecommendation } from "@/lib/exam-plan";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type CreatedSubject = PlannerSubject;

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
  relationCounts?: SubjectDeleteRelationCounts;
  requiresConfirmCascade?: boolean;
};

const COPY = {
  en: {
    title: "Subjects",
    subtitle: "Keep subjects tidy so targets and materials stay easy to manage.",
    addTitle: "Add subject",
    name: "Subject name",
    color: "Color",
    add: "Add subject",
    noSubjects: "No subjects yet.",
    linkedExams: "Linked exams",
    studyDirection: "Current study direction",
    openExams: "Open targets",
    delete: "Delete",
    created: "Subject created",
    deleted: "Subject deleted",
    deleteError: "Failed to delete subject",
    loadError: "Failed to load subjects",
    noAccount: "Your session is missing or expired.",
    loading: "Loading subjects...",
    noDirection: "No exam plan yet for this subject.",
    confirmDelete: "Delete subject?",
    confirmCascade: "This subject has linked records. Confirm to remove them too.",
    whyTitle: "Why subjects matter",
    whyBody: "Use each subject as the home for related targets, materials, and study fit.",
    statsSubjects: "Subjects",
    statsTargets: "Targets",
    statsNext: "Ready next",
    statsNextEmpty: "Create one",
    statsNextReady: "Link targets",
    noAccountBody: "Sign in again to manage subjects and keep them linked to the right targets.",
    login: "Go to login",
    createAccount: "Create account",
    emptyBody: "Create the first subject now so targets and materials have a clear home.",
  },
  it: {
    title: "Materie",
    subtitle: "Tieni ordinate le materie cosi target e materiali restano facili da gestire.",
    addTitle: "Aggiungi materia",
    name: "Nome materia",
    color: "Colore",
    add: "Aggiungi materia",
    noSubjects: "Nessuna materia per ora.",
    linkedExams: "Esami collegati",
    studyDirection: "Direzione di studio attuale",
    openExams: "Apri target",
    delete: "Elimina",
    created: "Materia creata",
    deleted: "Materia eliminata",
    deleteError: "Impossibile eliminare la materia",
    loadError: "Impossibile caricare le materie",
    noAccount: "La sessione manca o e scaduta.",
    loading: "Caricamento materie...",
    noDirection: "Nessun piano esame disponibile per questa materia.",
    confirmDelete: "Eliminare la materia?",
    confirmCascade: "Questa materia ha record collegati. Conferma per eliminarli.",
    whyTitle: "Perche le materie aiutano",
    whyBody: "Usa ogni materia come casa per target collegati, materiali e ritmo di studio.",
    statsSubjects: "Materie",
    statsTargets: "Target",
    statsNext: "Prossimo passo",
    statsNextEmpty: "Creane una",
    statsNextReady: "Collega i target",
    noAccountBody: "Accedi di nuovo per gestire le materie e tenerle collegate ai target giusti.",
    login: "Vai al login",
    createAccount: "Crea account",
    emptyBody: "Crea ora la prima materia cosi target e materiali hanno una base chiara.",
  },
} as const;

export default function PlannerSubjectsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { subjects, exams, errors, upsertSubject, removeSubject, refresh } = usePlannerData({
    enabled: Boolean(student?.id),
    studentId: student?.id,
    subscribeToRevision: true,
  });
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("");
  const [message, setMessage] = useState("");

  const subjectCards = useMemo(
    () =>
      subjects.map((subject) => {
        const linkedExams = exams.filter((exam) => exam.subject.id === subject.id);
        const linkedRecommendation = linkedExams
          .map((exam) => exam.planState?.lastRecommendationSnapshot)
          .find(Boolean) as ExamPaceRecommendation | undefined;

        return {
          subject,
          linkedExams,
          linkedRecommendation,
        };
      }),
    [exams, subjects],
  );

  async function createSubject(event: FormEvent) {
    event.preventDefault();
    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    const { ok, payload } = await requestJson<CreatedSubject>("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: subjectName.trim(),
        color: subjectColor.trim() || undefined,
      }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? t.loadError);
      return;
    }

    upsertSubject(payload.data);
    setSubjectName("");
    setSubjectColor("");
    setMessage(`${t.created}: ${payload.data.name}`);
    notifyDataRevision();
    void refresh({ force: true });
  }

  async function deleteSubject(subjectId: string, subjectLabel: string) {
    const endpoint = `/api/subjects?id=${encodeURIComponent(subjectId)}`;
    const firstAttempt = await requestJson<DeletedSubject>(endpoint, {
      method: "DELETE",
    });

    if (!firstAttempt.ok) {
      const details = firstAttempt.payload.details as SubjectDeleteConflictDetails | undefined;
      if (!details?.requiresConfirmCascade) {
        setMessage(firstAttempt.payload.error ?? t.deleteError);
        return;
      }

      const confirmed = window.confirm(`${t.confirmDelete}\n\n${t.confirmCascade}`);
      if (!confirmed) return;

      const secondAttempt = await requestJson<DeletedSubject>(
        `${endpoint}&confirmCascade=true`,
        {
          method: "DELETE",
        },
      );
      if (!secondAttempt.ok) {
        setMessage(secondAttempt.payload.error ?? t.deleteError);
        return;
      }
    }

    removeSubject(subjectId, { removeLinkedExams: true });
    setMessage(`${t.deleted}: ${subjectLabel}`);
    notifyDataRevision();
    void refresh({ force: true });
  }

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

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="planner-panel">
        {loading ? (
          <p className="text-sm text-slate-600">{t.loading}</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <form className="grid gap-3 md:grid-cols-3" onSubmit={createSubject}>
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.name}</span>
                <input
                  required
                  type="text"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  className="planner-input"
                />
              </label>
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.color}</span>
                <input
                  type="text"
                  value={subjectColor}
                  onChange={(event) => setSubjectColor(event.target.value)}
                  className="planner-input"
                  placeholder="#0ea5e9"
                />
              </label>
              <button type="submit" className="planner-btn planner-btn-accent">
                {t.add}
              </button>
            </form>

            <article className="planner-card bg-slate-50/80">
              <p className="planner-eyebrow">{t.whyTitle}</p>
              <p className="mt-2 text-sm text-slate-700">{t.whyBody}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-3">
                  <p className="planner-eyebrow">{t.statsSubjects}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{subjects.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="planner-eyebrow">{t.statsTargets}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{exams.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="planner-eyebrow">{t.statsNext}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {subjects.length === 0 ? t.statsNextEmpty : t.statsNextReady}
                  </p>
                </div>
              </div>
            </article>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {subjectCards.length === 0 ? (
          <article className="planner-card">
            <p className="text-base font-semibold text-slate-900">{t.noSubjects}</p>
            <p className="mt-2 text-sm text-slate-600">{t.emptyBody}</p>
          </article>
        ) : (
          subjectCards.map(({ subject, linkedExams, linkedRecommendation }) => (
            <article key={subject.id} className="planner-card border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{subject.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {linkedExams.length} {t.linkedExams}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteSubject(subject.id, subject.name)}
                  className="planner-btn planner-btn-secondary"
                >
                  {t.delete}
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="planner-eyebrow">{t.studyDirection}</p>
                {linkedRecommendation ? (
                  <>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {linkedRecommendation.paceLabel}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {linkedRecommendation.paceDescription}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">{t.noDirection}</p>
                )}
              </div>

              {linkedExams.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {linkedExams.map((exam) => {
                    const recommendation =
                      exam.planState?.lastRecommendationSnapshot as
                        | ExamPaceRecommendation
                        | undefined;
                    return (
                      <div
                        key={exam.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="font-semibold text-slate-900">{exam.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {recommendation?.dailyTargetPages ?? 0}{" "}
                          {language === "it" ? "pagine/giorno" : "pages/day"} |{" "}
                          {recommendation?.weeklyAllocationHours ?? 0}h/week
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <Link
                href="/planner/exams"
                className="planner-btn planner-btn-secondary mt-4 inline-flex"
              >
                {t.openExams}
              </Link>
            </article>
          ))
        )}
      </section>

      {message || errors.subjects || errors.exams ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message || errors.subjects || errors.exams}
        </section>
      ) : null}
    </main>
  );
}
