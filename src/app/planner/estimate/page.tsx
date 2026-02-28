"use client";

import { FormEvent, useMemo, useState } from "react";

import { useUiLanguage } from "../_hooks/use-ui-language";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type PaceProfile = "conservative" | "balanced" | "fast";

type PlanningEstimate = {
  inferredSubject: string;
  studyDays: number;
  estimatedPages: number;
  completionProbability: number;
  requiredMinutesPerDayLikely: number;
  requiredMinutesPerDaySafe: number;
  studyModes: {
    tier: 1 | 2 | 3 | 4;
    id: "soft" | "medium" | "strong" | "sprint";
    label: string;
    windowLabel: string;
    minutesPerDay: number;
    hoursPerDay: number;
    likelyPagesPerDay: number;
    projectedTotalPages: number;
    pageGapToTarget: number;
    completionProbability: number;
    riskLevel: "low" | "moderate" | "high" | "critical";
    rewardPoints: number;
    guidance: string;
  }[];
  feasibility: {
    status: "on_track" | "tight" | "rescue";
    message: string;
    recommendedActions: string[];
  };
  calibration: {
    samplesUsed: number;
    confidence: "low" | "medium" | "high";
    confidenceScore: number;
    observedPagesPerHour: number | null;
    paceVariability: "stable" | "variable" | "unstable";
    modelSource: "profile_prior" | "user_samples";
    paceProfileUsed: PaceProfile;
  };
  researchModel: {
    version: string;
    baselineReadingWpm: number;
    baselineReadingSd: number;
    focusBlockMinutes: number;
    breakMinutes: number;
    notes: string[];
  };
  prescription: {
    basePagesPerDay: number;
    recommendedPagesPerDay: number;
    safePagesPerDay: number;
    stretchPagesPerDay: number;
    recommendedMinutesPerDay: number;
    safeMinutesPerDay: number;
  };
  summary: {
    pagesPerDayMessage: string;
    completionMessage: string;
    improvementMessage: string;
  };
};

type CalibrationSession = {
  minutes: number;
  pagesCompleted: number;
  retentionScore?: number;
};

const COPY = {
  en: {
    title: "Quick Estimator",
    subtitle: "Simple target first. Advanced stats only when needed.",
    run: "Generate plan",
    target: "Today target",
    finishChance: "Finish chance",
    tier: "Intensity tiers",
    optional: "Optional context",
    openOptional: "Open optional settings",
    closeOptional: "Hide optional settings",
  },
  it: {
    title: "Stimatore Rapido",
    subtitle: "Prima target semplice. Statistiche avanzate solo se servono.",
    run: "Genera piano",
    target: "Target di oggi",
    finishChance: "Probabilità completamento",
    tier: "Tier di intensità",
    optional: "Contesto opzionale",
    openOptional: "Apri impostazioni opzionali",
    closeOptional: "Nascondi impostazioni opzionali",
  },
} as const;

function toDateInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

const DEFAULT_EXAM_DATE = toDateInputValue(
  new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
);

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function riskClasses(level: "low" | "moderate" | "high" | "critical") {
  if (level === "low") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (level === "moderate") return "border-amber-300 bg-amber-50 text-amber-900";
  if (level === "high") return "border-orange-300 bg-orange-50 text-orange-900";
  return "border-rose-300 bg-rose-50 text-rose-900";
}

function feasibilityClasses(status: "on_track" | "tight" | "rescue") {
  if (status === "on_track") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (status === "tight") return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-rose-300 bg-rose-50 text-rose-900";
}

export default function PlannerEstimatePage() {
  const { student } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language];
  const [bookTitle, setBookTitle] = useState("");
  const [planSubject, setPlanSubject] = useState("");
  const [planExamDate, setPlanExamDate] = useState(DEFAULT_EXAM_DATE);
  const [knownPages, setKnownPages] = useState("");
  const [notes, setNotes] = useState("");
  const [paceProfile, setPaceProfile] = useState<PaceProfile>("balanced");
  const [showOptional, setShowOptional] = useState(false);
  const [calibrationSessions, setCalibrationSessions] = useState<CalibrationSession[]>([]);
  const [estimate, setEstimate] = useState<PlanningEstimate | null>(null);
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3 | 4>(2);
  const [message, setMessage] = useState("");

  const selectedMode = useMemo(() => {
    if (!estimate) return null;
    return estimate.studyModes.find((mode) => mode.tier === selectedTier) ?? null;
  }, [estimate, selectedTier]);

  async function runEstimate(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!student) {
      setMessage("Missing student context.");
      return;
    }

    const { ok, payload } = await requestJson<PlanningEstimate>("/api/planning/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookTitle,
        subject: planSubject || undefined,
        examDate: new Date(`${planExamDate}T00:00:00`).toISOString(),
        knownPages: knownPages ? Number(knownPages) : undefined,
        notes: notes || undefined,
        paceProfile,
        calibrationSessions:
          calibrationSessions.length > 0 ? calibrationSessions : undefined,
      }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to estimate.");
      return;
    }

    setEstimate(payload.data);
    setSelectedTier(
      payload.data.studyModes.find((mode) => mode.completionProbability >= 0.8)?.tier ?? 2,
    );
    setMessage("Plan generated.");
  }

  function addCalibrationPreset(session: CalibrationSession) {
    setCalibrationSessions((current) => [...current, session]);
    setMessage("Calibration sample added.");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#fef9c3_48%,#ffffff_100%)] p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={runEstimate}>
          <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Book title
            </span>
            <input
              required
              type="text"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
              placeholder="Manuale di diritto privato"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exam date
            </span>
            <input
              required
              type="date"
              value={planExamDate}
              onChange={(event) => setPlanExamDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
            />
          </label>

          <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Known pages (optional)
            </span>
            <input
              type="number"
              min={1}
              value={knownPages}
              onChange={(event) => setKnownPages(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pace profile
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["conservative", "balanced", "fast"] as const).map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => setPaceProfile(profile)}
                  className={`rounded-xl border px-2 py-2 text-sm font-semibold ${
                    paceProfile === profile
                      ? "border-sky-400 bg-sky-100 text-sky-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {profile}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowOptional((current) => !current)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {showOptional ? t.closeOptional : t.openOptional}
            </button>
          </div>

          {showOptional ? (
            <>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subject ({t.optional})
                </span>
                <input
                  type="text"
                  value={planSubject}
                  onChange={(event) => setPlanSubject(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes ({t.optional})
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Quick calibration samples
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 25, pagesCompleted: 5, retentionScore: 72 })
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    25m / 5p / 72%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 40, pagesCompleted: 8, retentionScore: 76 })
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    40m / 8p / 76%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 50, pagesCompleted: 10, retentionScore: 80 })
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    50m / 10p / 80%
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white md:col-span-2"
          >
            {t.run}
          </button>
        </form>
      </section>

      {estimate ? (
        <section className="space-y-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.target}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Pages/day</p>
                <p className="text-3xl font-black text-slate-900">
                  {estimate.prescription.safePagesPerDay}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Minutes/day</p>
                <p className="text-3xl font-black text-slate-900">
                  {estimate.prescription.safeMinutesPerDay}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">{t.finishChance}</p>
                <p className="text-3xl font-black text-slate-900">{pct(estimate.completionProbability)}</p>
              </div>
            </div>

            <div
              className={`mt-3 rounded-2xl border p-3 text-sm ${feasibilityClasses(estimate.feasibility.status)}`}
            >
              {estimate.feasibility.message}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{t.tier}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {estimate.studyModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedTier(mode.tier)}
                  className={`rounded-2xl border p-4 text-left ${riskClasses(mode.riskLevel)} ${
                    selectedTier === mode.tier ? "ring-2 ring-indigo-400" : ""
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Tier {mode.tier} · {mode.windowLabel}
                  </p>
                  <h3 className="mt-1 text-lg font-black">{mode.label}</h3>
                  <p className="mt-1 text-sm">{mode.guidance}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {mode.likelyPagesPerDay} pages/day · {mode.minutesPerDay} min/day
                  </p>
                  <p className="text-xs">
                    {pct(mode.completionProbability)} · +{mode.rewardPoints} XP
                  </p>
                </button>
              ))}
            </div>

            {selectedMode ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Active tier: <strong>{selectedMode.label}</strong> · projected coverage{" "}
                <strong>{selectedMode.projectedTotalPages}</strong> pages · gap{" "}
                <strong>{selectedMode.pageGapToTarget}</strong> pages.
              </div>
            ) : null}
          </article>

          <details className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Advanced details
            </summary>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <p>
                Subject inference: <strong>{estimate.inferredSubject}</strong>
              </p>
              <p>
                Study window: <strong>{estimate.studyDays}</strong> day(s), book size{" "}
                <strong>{estimate.estimatedPages}</strong> pages.
              </p>
              <p>
                Calibration: <strong>{estimate.calibration.modelSource}</strong> · confidence{" "}
                <strong>{estimate.calibration.confidenceScore}/100</strong>.
              </p>
              <p>
                Research model: <strong>{estimate.researchModel.version}</strong> · baseline{" "}
                {estimate.researchModel.baselineReadingWpm}+/-{estimate.researchModel.baselineReadingSd} wpm.
              </p>
              <ul className="list-disc pl-5">
                {estimate.researchModel.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <ul className="list-disc pl-5">
                {estimate.feasibility.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          </details>
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </section>
      ) : null}
    </main>
  );
}

