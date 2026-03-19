"use client";

import { FormEvent, useEffect, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import type { EducationLevel, SchoolProfile } from "@/lib/study-domain";
import { requestJson } from "../_lib/client-api";
import { syncAuthStudentCache, useAuthStudent } from "../_hooks/use-auth-student";

type Student = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
  educationLevel: EducationLevel;
  schoolProfile: SchoolProfile;
  subjectAffinity?: {
    easiestSubjects: string[];
    effortSubjects: string[];
  } | null;
};

type SubjectAffinity = {
  easiestSubjects: string[];
  effortSubjects: string[];
};

type AffinityRole = "easy" | "effort" | "none";

type FeedbackState =
  | {
      kind: "success" | "error";
      text: string;
    }
  | null;

const SUBJECT_AFFINITY_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Literature",
  "English",
  "Law",
  "Economics",
  "Computer Science",
  "Philosophy",
  "Art / Design",
] as const;

const AFFINITY_LIMIT = 3;
const SUBJECT_AFFINITY_SET = new Set<string>(SUBJECT_AFFINITY_OPTIONS);

type SubjectAffinityOption = (typeof SUBJECT_AFFINITY_OPTIONS)[number];

const COPY = {
  en: {
    saveProfileError: "Failed to save profile",
    saveProfileSuccess: "Profile updated.",
    saveAffinityError: "Failed to save subject preferences",
    saveAffinitySuccess: "Subject preferences saved.",
    signInAgain: "Please sign in again to continue.",
    recommendationName: "Add your name so the planner feels personal.",
    recommendationHours: "Set a realistic weekly study budget.",
    recommendationEasy: "Choose one subject that usually feels easier.",
    recommendationEffort: "Choose one subject that usually needs more effort.",
    noSessionTitle: "Session required",
    noSessionBody: "Sign in again to reopen your study profile and planner settings.",
    login: "Go to login",
    createAccount: "Create account",
    title: "Profile",
    subtitle: "Keep only the details that help the planner suggest a better weekly rhythm.",
    overview: "Profile overview",
    ready: "ready",
    detailsTitle: "Profile details",
    detailsBody:
      "Name, weekly time, education level, and school profile are enough for the planner to start well.",
    hideEditor: "Hide editor",
    editProfile: "Edit profile",
    name: "Name",
    notSet: "Not set",
    email: "Email",
    noAccount: "No account",
    weeklyCapacity: "Weekly capacity",
    hours: "hours",
    educationLevel: "Education level",
    schoolProfile: "School profile",
    loadingProfile: "Loading profile...",
    fullName: "Full name",
    weeklyHours: "Weekly hours",
    highSchool: "High school",
    university: "University",
    independent: "Independent",
    technical: "Technical",
    professional: "Professional",
    selfStudy: "Self study",
    other: "Other",
    saveProfile: "Save profile",
    preferencesTitle: "Study preferences",
    preferencesBody:
      "Mark the subjects that usually feel easier and the ones that usually need more effort.",
    collapseEditor: "Collapse editor",
    editPreferences: "Edit preferences",
    feelsEasier: "Feels easier",
    feelsEasierEmpty: "No easier subjects selected yet.",
    needsMoreEffort: "Needs more effort",
    needsMoreEffortEmpty: "No higher-effort subjects selected yet.",
    selected: "selected",
    subject: "Subject",
    easy: "Easy",
    effort: "Effort",
    savedProfileSummary: "Saved profile",
    savePreferences: "Save preferences",
  },
  it: {
    saveProfileError: "Impossibile salvare il profilo",
    saveProfileSuccess: "Profilo aggiornato.",
    saveAffinityError: "Impossibile salvare le preferenze sulle materie",
    saveAffinitySuccess: "Preferenze materie salvate.",
    signInAgain: "Accedi di nuovo per continuare.",
    recommendationName: "Aggiungi il tuo nome cosi il planner diventa piu personale.",
    recommendationHours: "Imposta un monte ore settimanale realistico.",
    recommendationEasy: "Scegli una materia che di solito senti piu facile.",
    recommendationEffort: "Scegli una materia che di solito richiede piu sforzo.",
    noSessionTitle: "Sessione richiesta",
    noSessionBody: "Accedi di nuovo per riaprire il tuo profilo di studio e le impostazioni del planner.",
    login: "Vai al login",
    createAccount: "Crea account",
    title: "Profilo",
    subtitle: "Tieni solo i dettagli che aiutano il planner a suggerire un ritmo settimanale migliore.",
    overview: "Panoramica profilo",
    ready: "pronto",
    detailsTitle: "Dettagli profilo",
    detailsBody:
      "Nome, tempo settimanale, livello di studio e percorso bastano per far partire bene il planner.",
    hideEditor: "Nascondi editor",
    editProfile: "Modifica profilo",
    name: "Nome",
    notSet: "Non impostato",
    email: "Email",
    noAccount: "Nessun account",
    weeklyCapacity: "Capacita settimanale",
    hours: "ore",
    educationLevel: "Livello di studio",
    schoolProfile: "Percorso",
    loadingProfile: "Caricamento profilo...",
    fullName: "Nome completo",
    weeklyHours: "Ore settimanali",
    highSchool: "Scuola superiore",
    university: "Universita",
    independent: "Studio autonomo",
    technical: "Tecnico",
    professional: "Professionale",
    selfStudy: "Autonomo",
    other: "Altro",
    saveProfile: "Salva profilo",
    preferencesTitle: "Preferenze di studio",
    preferencesBody:
      "Segna le materie che senti piu semplici e quelle che di solito richiedono piu energia.",
    collapseEditor: "Chiudi editor",
    editPreferences: "Modifica preferenze",
    feelsEasier: "Ti viene piu facile",
    feelsEasierEmpty: "Non hai ancora segnato materie piu facili.",
    needsMoreEffort: "Richiede piu sforzo",
    needsMoreEffortEmpty: "Non hai ancora segnato materie piu impegnative.",
    selected: "selezionate",
    subject: "Materia",
    easy: "Facile",
    effort: "Impegno",
    savedProfileSummary: "Profilo salvato",
    savePreferences: "Salva preferenze",
  },
} as const;

function normalizeAffinityList(values: string[] | null | undefined): SubjectAffinityOption[] {
  const normalized: SubjectAffinityOption[] = [];
  const seen = new Set<SubjectAffinityOption>();

  for (const entry of values ?? []) {
    if (!SUBJECT_AFFINITY_SET.has(entry)) continue;
    const subject = entry as SubjectAffinityOption;
    if (seen.has(subject)) continue;
    seen.add(subject);
    normalized.push(subject);
    if (normalized.length >= AFFINITY_LIMIT) break;
  }

  return normalized;
}

function normalizeAffinity(value: Student["subjectAffinity"] | null | undefined): SubjectAffinity {
  const easiestSubjects = normalizeAffinityList(value?.easiestSubjects);
  const easiestSet = new Set(easiestSubjects);
  const effortSubjects = normalizeAffinityList(value?.effortSubjects).filter(
    (subject) => !easiestSet.has(subject),
  );

  return {
    easiestSubjects,
    effortSubjects,
  };
}

function formatEducationLevelLabel(value: EducationLevel, language: keyof typeof COPY) {
  const t = COPY[language];
  if (value === "HIGH_SCHOOL") return t.highSchool;
  if (value === "UNIVERSITY") return t.university;
  return t.independent;
}

function formatSchoolProfileLabel(value: SchoolProfile, language: keyof typeof COPY) {
  const t = COPY[language];
  if (value === "LICEO") return "Liceo";
  if (value === "TECHNICAL") return t.technical;
  if (value === "PROFESSIONAL") return t.professional;
  if (value === "UNIVERSITY") return t.university;
  if (value === "SELF_STUDY") return t.selfStudy;
  return t.other;
}

export default function PlannerStudentsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [weeklyHoursDraft, setWeeklyHoursDraft] = useState<number | null>(null);
  const [savedAffinityOverride, setSavedAffinityOverride] = useState<SubjectAffinity | null>(null);
  const [affinityDraft, setAffinityDraft] = useState<SubjectAffinity | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [preferencesExpanded, setPreferencesExpanded] = useState(false);
  const [educationLevelDraft, setEducationLevelDraft] = useState<EducationLevel | null>(null);
  const [schoolProfileDraft, setSchoolProfileDraft] = useState<SchoolProfile | null>(null);

  useEffect(() => {
    if (!feedback || feedback.kind !== "success") return;
    const timer = window.setTimeout(() => {
      setFeedback((current) => (current?.kind === "success" ? null : current));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function showError(text: string) {
    setFeedback({ kind: "error", text });
  }

  function showSuccess(text: string) {
    setFeedback({ kind: "success", text });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!student) {
      showError(t.signInAgain);
      return;
    }

    const fullName = fullNameDraft ?? student.fullName ?? "";
    const weeklyHours = weeklyHoursDraft ?? student.weeklyHours;

    const { ok, payload } = await requestJson<Student>("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName || undefined,
        weeklyHours,
        educationLevel: educationLevelDraft ?? student.educationLevel,
        schoolProfile: schoolProfileDraft ?? student.schoolProfile,
      }),
    });

    if (!ok || !payload.data) {
      showError(payload.error ?? t.saveProfileError);
      return;
    }

    showSuccess(t.saveProfileSuccess);
    syncAuthStudentCache(payload.data);
    setFullNameDraft(payload.data.fullName ?? "");
    setWeeklyHoursDraft(payload.data.weeklyHours);
    setEducationLevelDraft(payload.data.educationLevel);
    setSchoolProfileDraft(payload.data.schoolProfile);
    notifyDataRevision();
  }

  function setAffinityRole(subject: SubjectAffinityOption, role: AffinityRole) {
    setAffinityDraft((current) => {
      const base = current ?? savedAffinity;
      let easiest = base.easiestSubjects.filter((entry) => entry !== subject);
      let effort = base.effortSubjects.filter((entry) => entry !== subject);

      if (role === "easy") {
        if (easiest.length >= AFFINITY_LIMIT) {
          return base;
        }
        easiest = [...easiest, subject];
      }

      if (role === "effort") {
        if (effort.length >= AFFINITY_LIMIT) {
          return base;
        }
        effort = [...effort, subject];
      }

      return normalizeAffinity({
        easiestSubjects: easiest,
        effortSubjects: effort,
      });
    });
  }

  async function saveAffinity() {
    setFeedback(null);

    if (!student) {
      showError(t.signInAgain);
      return;
    }

    const baseAffinity = savedAffinityOverride ?? normalizeAffinity(student.subjectAffinity);
    const subjectAffinity = normalizeAffinity(affinityDraft ?? baseAffinity);
    const { ok, payload } = await requestJson<Student>("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectAffinity,
      }),
    });

    if (!ok || !payload.data) {
      showError(payload.error ?? t.saveAffinityError);
      return;
    }

    showSuccess(t.saveAffinitySuccess);
    syncAuthStudentCache(payload.data);
    const normalized = normalizeAffinity(payload.data.subjectAffinity);
    setSavedAffinityOverride(normalized);
    setAffinityDraft(normalized);
    notifyDataRevision();
  }

  const savedAffinity = savedAffinityOverride ?? normalizeAffinity(student?.subjectAffinity);
  const affinity = affinityDraft ?? savedAffinity;
  const easiestCount = affinity.easiestSubjects.length;
  const effortCount = affinity.effortSubjects.length;

  const resolvedName = fullNameDraft ?? student?.fullName ?? "";
  const resolvedWeeklyHours = weeklyHoursDraft ?? student?.weeklyHours ?? 0;
  const resolvedEducationLevel =
    educationLevelDraft ?? student?.educationLevel ?? "INDEPENDENT";
  const resolvedSchoolProfile =
    schoolProfileDraft ?? student?.schoolProfile ?? "SELF_STUDY";
  const profileScore =
    (resolvedName.trim().length > 0 ? 25 : 0) +
    (resolvedWeeklyHours >= 6 ? 25 : 0) +
    (easiestCount > 0 ? 25 : 0) +
    (effortCount > 0 ? 25 : 0);
  const recommendations: string[] = [];
  if (!resolvedName.trim()) recommendations.push(t.recommendationName);
  if (resolvedWeeklyHours < 6) recommendations.push(t.recommendationHours);
  if (easiestCount === 0) recommendations.push(t.recommendationEasy);
  if (effortCount === 0) recommendations.push(t.recommendationEffort);

  if (!student && !loading) {
    return (
      <main className="space-y-5 sm:space-y-6">
        <section className="planner-panel">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.noSessionTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t.noSessionBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/login" className="planner-btn planner-btn-accent">
              {t.login}
            </a>
            <a href="/signup" className="planner-btn planner-btn-secondary">
              {t.createAccount}
            </a>
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t.overview}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{profileScore}% {t.ready}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${profileScore}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700">{profileScore}%</span>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {recommendations.map((rec) => (
              <li key={rec} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
                {rec}
              </li>
            ))}
          </ul>
        ) : null}

      </section>

      <section className="planner-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.detailsTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.detailsBody}</p>
          </div>
          <button
            type="button"
            onClick={() => setProfileExpanded((current) => !current)}
            className="planner-btn planner-btn-secondary rounded-full"
          >
            {profileExpanded ? t.hideEditor : t.editProfile}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <article className="planner-card bg-slate-50/80">
            <p className="planner-eyebrow">{t.name}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {resolvedName.trim() || t.notSet}
            </p>
          </article>
          <article className="planner-card bg-slate-50/80">
            <p className="planner-eyebrow">{t.email}</p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-900">
              {student?.email ?? t.noAccount}
            </p>
          </article>
          <article className="planner-card bg-slate-50/80">
            <p className="planner-eyebrow">{t.weeklyCapacity}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {resolvedWeeklyHours} {t.hours}
            </p>
          </article>
          <article className="planner-card bg-slate-50/80">
            <p className="planner-eyebrow">{t.educationLevel}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {formatEducationLevelLabel(resolvedEducationLevel, language)}
            </p>
          </article>
          <article className="planner-card bg-slate-50/80">
            <p className="planner-eyebrow">{t.schoolProfile}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {formatSchoolProfileLabel(resolvedSchoolProfile, language)}
            </p>
          </article>
        </div>

        {profileExpanded ? (
          loading ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-600">{t.loadingProfile}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="planner-skeleton h-12" />
                <div className="planner-skeleton h-12" />
              </div>
            </div>
          ) : (
            <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={saveProfile}>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">{t.email}</span>
                <input
                  type="email"
                  value={student?.email ?? ""}
                  disabled
                  className="planner-input"
                />
              </label>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">{t.fullName}</span>
                <input
                  type="text"
                  value={fullNameDraft ?? student?.fullName ?? ""}
                  onChange={(event) => setFullNameDraft(event.target.value)}
                  className="planner-input"
                />
              </label>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">{t.weeklyHours}</span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={weeklyHoursDraft ?? student?.weeklyHours ?? 10}
                  onChange={(event) => setWeeklyHoursDraft(Number(event.target.value))}
                  className="planner-input"
                />
              </label>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">{t.educationLevel}</span>
                <select
                  value={educationLevelDraft ?? student?.educationLevel ?? "INDEPENDENT"}
                  onChange={(event) =>
                    setEducationLevelDraft(event.target.value as EducationLevel)
                  }
                  className="planner-input"
                >
                  <option value="HIGH_SCHOOL">{t.highSchool}</option>
                  <option value="UNIVERSITY">{t.university}</option>
                  <option value="INDEPENDENT">{t.independent}</option>
                </select>
              </label>
              <label className="planner-field space-y-1">
                <span className="planner-eyebrow mb-1 block">{t.schoolProfile}</span>
                <select
                  value={schoolProfileDraft ?? student?.schoolProfile ?? "SELF_STUDY"}
                  onChange={(event) =>
                    setSchoolProfileDraft(event.target.value as SchoolProfile)
                  }
                  className="planner-input"
                >
                  <option value="LICEO">Liceo</option>
                  <option value="TECHNICAL">{t.technical}</option>
                  <option value="PROFESSIONAL">{t.professional}</option>
                  <option value="UNIVERSITY">{t.university}</option>
                  <option value="SELF_STUDY">{t.selfStudy}</option>
                  <option value="OTHER">{t.other}</option>
                </select>
              </label>
              <button
                type="submit"
                className="planner-btn planner-btn-accent w-full rounded-full md:col-span-4"
              >
                {t.saveProfile}
              </button>
            </form>
          )
        ) : null}
      </section>

      <section className="planner-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.preferencesTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.preferencesBody}</p>
          </div>
          <button
            type="button"
            onClick={() => setPreferencesExpanded((current) => !current)}
            className="planner-btn planner-btn-secondary rounded-full"
          >
            {preferencesExpanded ? t.collapseEditor : t.editPreferences}
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="planner-card rounded-3xl bg-emerald-50/70">
            <p className="planner-eyebrow text-emerald-700">{t.feelsEasier}</p>
            <p className="mt-1 text-sm text-slate-700">
              {affinity.easiestSubjects.length > 0
                ? affinity.easiestSubjects.join(" | ")
                : t.feelsEasierEmpty}
            </p>
            <p className="mt-3 text-xs font-semibold text-emerald-800">
              {easiestCount}/{AFFINITY_LIMIT} {t.selected}
            </p>
          </article>
          <article className="planner-card rounded-3xl bg-amber-50/70">
            <p className="planner-eyebrow text-amber-700">{t.needsMoreEffort}</p>
            <p className="mt-1 text-sm text-slate-700">
              {affinity.effortSubjects.length > 0
                ? affinity.effortSubjects.join(" | ")
                : t.needsMoreEffortEmpty}
            </p>
            <p className="mt-3 text-xs font-semibold text-amber-900">
              {effortCount}/{AFFINITY_LIMIT} {t.selected}
            </p>
          </article>
        </div>

        {preferencesExpanded ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <p>{t.subject}</p>
              <p className="text-center">{t.easy}</p>
              <p className="text-center">{t.effort}</p>
            </div>

            <div className="space-y-2">
              {SUBJECT_AFFINITY_OPTIONS.map((subjectName) => {
                const isEasy = affinity.easiestSubjects.includes(subjectName);
                const isEffort = affinity.effortSubjects.includes(subjectName);
                return (
                  <div
                    key={subjectName}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-slate-800">{subjectName}</p>
                    <button
                      type="button"
                      onClick={() => setAffinityRole(subjectName, isEasy ? "none" : "easy")}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        isEasy
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t.easy}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAffinityRole(subjectName, isEffort ? "none" : "effort")}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        isEffort
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t.effort}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {t.savedProfileSummary}: {savedAffinity.easiestSubjects.length} {t.easy.toLowerCase()} / {savedAffinity.effortSubjects.length} {t.effort.toLowerCase()}
              </div>
              <button
                type="button"
                onClick={() => void saveAffinity()}
                className="planner-btn planner-btn-accent rounded-full"
              >
                {t.savePreferences}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {feedback?.kind === "error" ? (
        <section className="planner-alert">{feedback.text}</section>
      ) : null}
      {feedback?.kind === "success" ? (
        <section
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </section>
      ) : null}
    </main>
  );
}

