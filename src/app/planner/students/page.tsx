"use client";

import { FormEvent, useEffect, useState } from "react";

import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import { syncAuthStudentCache, useAuthStudent } from "../_hooks/use-auth-student";

type Student = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
  subjectAffinity?: {
    easiestSubjects: string[];
    effortSubjects: string[];
  } | null;
};

type SubjectAffinity = {
  easiestSubjects: string[];
  effortSubjects: string[];
};

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

const STUDY_CONTEXT_OPTIONS = [
  "University",
  "High school",
  "Middle school",
  "Primary school",
  "Personal study",
] as const;

type StudyContext = (typeof STUDY_CONTEXT_OPTIONS)[number];

const STUDY_CONTEXT_STORAGE_KEY = "studyapp_profile_context_v1";

type SubjectAffinityOption = (typeof SUBJECT_AFFINITY_OPTIONS)[number];

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

export default function PlannerStudentsPage() {
  const { student, loading } = useAuthStudent();
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [weeklyHoursDraft, setWeeklyHoursDraft] = useState<number | null>(null);
  const [savedAffinityOverride, setSavedAffinityOverride] = useState<SubjectAffinity | null>(null);
  const [affinityDraft, setAffinityDraft] = useState<SubjectAffinity | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [studyContext, setStudyContext] = useState<StudyContext | null>(() => {
    try {
      const stored = localStorage.getItem(STUDY_CONTEXT_STORAGE_KEY);
      if (stored && (STUDY_CONTEXT_OPTIONS as readonly string[]).includes(stored)) {
        return stored as StudyContext;
      }
    } catch {
      // storage unavailable
    }
    return null;
  });

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

  function handleContextChange(ctx: StudyContext) {
    setStudyContext(ctx);
    try {
      localStorage.setItem(STUDY_CONTEXT_STORAGE_KEY, ctx);
    } catch {
      // storage unavailable
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!student) {
      showError("No account context found.");
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
      }),
    });

    if (!ok || !payload.data) {
      showError(payload.error ?? "Failed to save profile");
      return;
    }

    showSuccess("Profile updated.");
    syncAuthStudentCache(payload.data);
    setFullNameDraft(payload.data.fullName ?? "");
    setWeeklyHoursDraft(payload.data.weeklyHours);
    notifyDataRevision();
  }

  function toggleAffinity(
    key: keyof SubjectAffinity,
    subject: (typeof SUBJECT_AFFINITY_OPTIONS)[number],
  ) {
    setAffinityDraft((current) => {
      const base = current ?? savedAffinity;
      const oppositeKey = key === "easiestSubjects" ? "effortSubjects" : "easiestSubjects";
      const nextSelected = [...base[key]];
      const nextOpposite = [...base[oppositeKey]];
      const selectedIndex = nextSelected.indexOf(subject);

      if (selectedIndex >= 0) {
        nextSelected.splice(selectedIndex, 1);
      } else {
        if (nextSelected.length >= AFFINITY_LIMIT) return base;
        nextSelected.push(subject);
        const oppositeIndex = nextOpposite.indexOf(subject);
        if (oppositeIndex >= 0) {
          nextOpposite.splice(oppositeIndex, 1);
        }
      }

      return normalizeAffinity(
        key === "easiestSubjects"
          ? {
              easiestSubjects: nextSelected,
              effortSubjects: nextOpposite,
            }
          : {
              easiestSubjects: nextOpposite,
              effortSubjects: nextSelected,
            },
      );
    });
  }

  async function saveAffinity() {
    setFeedback(null);

    if (!student) {
      showError("No account context found.");
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
      showError(payload.error ?? "Failed to save subject preferences");
      return;
    }

    showSuccess("Subject preferences saved.");
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
  const profileScore =
    (resolvedName.trim().length > 0 ? 25 : 0) +
    (resolvedWeeklyHours >= 6 ? 25 : 0) +
    (easiestCount > 0 ? 25 : 0) +
    (effortCount > 0 ? 25 : 0);
  const recommendations: string[] = [];
  if (!resolvedName.trim()) recommendations.push("Add your full name.");
  if (resolvedWeeklyHours < 6) recommendations.push("Set at least 6 weekly study hours.");
  if (easiestCount === 0) recommendations.push("Pick at least one easy subject.");
  if (effortCount === 0) recommendations.push("Pick at least one effort-heavy subject.");

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure your personal study capacity and account details.
        </p>
      </section>

      <section className="planner-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Learning profile</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {studyContext ?? "No context selected"} · {profileScore}% complete
            </p>
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

        {recommendations.length > 0 && (
          <ul className="mt-3 space-y-1">
            {recommendations.map((rec) => (
              <li key={rec} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
                {rec}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <p className="planner-eyebrow mb-2 block text-xs">Study context</p>
          <div className="flex flex-wrap gap-2">
            {STUDY_CONTEXT_OPTIONS.map((ctx) => (
              <button
                key={ctx}
                type="button"
                onClick={() => handleContextChange(ctx)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  studyContext === ctx
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="planner-panel">
        {loading ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Loading profile...</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="planner-skeleton h-12" />
              <div className="planner-skeleton h-12" />
            </div>
          </div>
        ) : (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={saveProfile}>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">Email</span>
              <input
                type="email"
                value={student?.email ?? ""}
                disabled
                className="planner-input"
              />
            </label>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">Full name</span>
              <input
                type="text"
                value={fullNameDraft ?? student?.fullName ?? ""}
                onChange={(event) => setFullNameDraft(event.target.value)}
                className="planner-input"
              />
            </label>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">Weekly hours</span>
              <input
                type="number"
                min={1}
                max={80}
                value={weeklyHoursDraft ?? student?.weeklyHours ?? 10}
                onChange={(event) => setWeeklyHoursDraft(Number(event.target.value))}
                className="planner-input"
              />
            </label>
            <button
              type="submit"
              className="planner-btn planner-btn-accent w-full md:col-span-3"
            >
              Save profile
            </button>
          </form>
        )}
      </section>

      <section className="planner-panel">
        <h2 className="text-lg font-bold text-slate-900">Subject Affinity Onboarding</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pick your natural strengths and effort-heavy subjects so StudyApp can prepare a basic
          preference profile.
        </p>

        <div className="mt-5 space-y-5">
          <article>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Which subjects feel easiest or most natural to you?
              </p>
              <span className="text-xs font-medium text-slate-500">
                {easiestCount}/{AFFINITY_LIMIT}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUBJECT_AFFINITY_OPTIONS.map((subjectName) => {
                const selected = affinity.easiestSubjects.includes(subjectName);
                return (
                  <button
                    key={`easy-${subjectName}`}
                    type="button"
                    onClick={() => toggleAffinity("easiestSubjects", subjectName)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {subjectName}
                  </button>
                );
              })}
            </div>
          </article>

          <article>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Which subjects usually require more effort from you?
              </p>
              <span className="text-xs font-medium text-slate-500">
                {effortCount}/{AFFINITY_LIMIT}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUBJECT_AFFINITY_OPTIONS.map((subjectName) => {
                const selected = affinity.effortSubjects.includes(subjectName);
                return (
                  <button
                    key={`effort-${subjectName}`}
                    type="button"
                    onClick={() => toggleAffinity("effortSubjects", subjectName)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {subjectName}
                  </button>
                );
              })}
            </div>
          </article>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Saved profile: {savedAffinity.easiestSubjects.length} easy / {savedAffinity.effortSubjects.length} effort-heavy
            </div>
            <button
              type="button"
              onClick={() => void saveAffinity()}
              className="planner-btn planner-btn-accent"
            >
              Save preferences and continue
            </button>
          </div>
        </div>
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
