"use client";

import { FormEvent, useMemo, useState } from "react";

import { useAuthStudent } from "../_hooks/use-auth-student";
import { useUiLanguage } from "../_hooks/use-ui-language";
import { requestJson } from "../_lib/client-api";

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
    planReady: "Plan generated.",
    addSample: "Calibration sample added.",
    missingAccount: "Missing student context.",
    failEstimate: "Failed to estimate.",
    pagesPerDay: "Pages/day",
    minutesPerDay: "Minutes/day",
    advanced: "Advanced details",
    activeTier: "Active tier",
    projectedCoverage: "projected coverage",
    gap: "gap",
    bookTitleLabel: "Book title",
    bookTitlePlaceholder: "Manuale di diritto privato",
    examDateLabel: "Exam date",
    knownPagesLabel: "Known pages (optional)",
    paceProfileLabel: "Pace profile",
    paceConservative: "Conservative",
    paceBalanced: "Balanced",
    paceFast: "Fast",
    optionalSubjectLabel: "Subject (optional)",
    optionalNotesLabel: "Notes (optional)",
    quickCalibration: "Quick calibration samples",
    pagesPerDayUnit: "pages/day",
    minutesPerDayUnit: "min/day",
    daysSuffix: "day(s)",
    subjectInference: "Subject inference",
    studyWindow: "Study window",
    calibration: "Calibration",
    confidence: "confidence",
    researchModel: "Research model",
    baseline: "baseline",
  },
  it: {
    title: "Stimatore Rapido",
    subtitle: "Prima target semplice. Statistiche avanzate solo se servono.",
    run: "Genera piano",
    target: "Target di oggi",
    finishChance: "Probabilita completamento",
    tier: "Tier di intensita",
    optional: "Contesto opzionale",
    openOptional: "Apri impostazioni opzionali",
    closeOptional: "Nascondi impostazioni opzionali",
    planReady: "Piano generato.",
    addSample: "Campione di calibrazione aggiunto.",
    missingAccount: "Contesto studente mancante.",
    failEstimate: "Stima non riuscita.",
    pagesPerDay: "Pagine/giorno",
    minutesPerDay: "Minuti/giorno",
    advanced: "Dettagli avanzati",
    activeTier: "Tier attivo",
    projectedCoverage: "copertura prevista",
    gap: "gap",
    bookTitleLabel: "Titolo libro",
    bookTitlePlaceholder: "Manuale di diritto privato",
    examDateLabel: "Data esame",
    knownPagesLabel: "Pagine note (opzionale)",
    paceProfileLabel: "Profilo ritmo",
    paceConservative: "Conservativo",
    paceBalanced: "Bilanciato",
    paceFast: "Veloce",
    optionalSubjectLabel: "Materia (opzionale)",
    optionalNotesLabel: "Note (opzionale)",
    quickCalibration: "Campioni rapidi calibrazione",
    pagesPerDayUnit: "pagine/giorno",
    minutesPerDayUnit: "min/giorno",
    daysSuffix: "giorni",
    subjectInference: "Inferenza materia",
    studyWindow: "Finestra studio",
    calibration: "Calibrazione",
    confidence: "confidenza",
    researchModel: "Modello di ricerca",
    baseline: "baseline",
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
  const t = COPY[language] ?? COPY.en;

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
      setMessage(t.missingAccount);
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
      setMessage(payload.error ?? t.failEstimate);
      return;
    }

    setEstimate(payload.data);
    setSelectedTier(
      payload.data.studyModes.find((mode) => mode.completionProbability >= 0.8)?.tier ?? 2,
    );
    setMessage(t.planReady);
  }

  function addCalibrationPreset(session: CalibrationSession) {
    setCalibrationSessions((current) => [...current, session]);
    setMessage(t.addSample);
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="planner-panel">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={runEstimate}>
          <label className="planner-field">
            <span className="planner-eyebrow mb-1 block">{t.bookTitleLabel}</span>
            <input
              required
              type="text"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
              placeholder={t.bookTitlePlaceholder}
              className="planner-input"
            />
          </label>

          <label className="planner-field">
            <span className="planner-eyebrow mb-1 block">{t.examDateLabel}</span>
            <input
              required
              type="date"
              value={planExamDate}
              onChange={(event) => setPlanExamDate(event.target.value)}
              className="planner-input"
            />
          </label>

          <label className="planner-field">
            <span className="planner-eyebrow mb-1 block">{t.knownPagesLabel}</span>
            <input
              type="number"
              min={1}
              value={knownPages}
              onChange={(event) => setKnownPages(event.target.value)}
              className="planner-input"
            />
          </label>

          <div className="planner-field">
            <span className="planner-eyebrow mb-1 block">{t.paceProfileLabel}</span>
            <div className="grid grid-cols-3 gap-2">
              {(["conservative", "balanced", "fast"] as const).map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => setPaceProfile(profile)}
                  className={`planner-btn min-h-0 px-2 py-2 text-sm ${
                    paceProfile === profile ? "planner-btn-primary" : "planner-btn-secondary"
                  }`}
                >
                  {profile === "conservative"
                    ? t.paceConservative
                    : profile === "balanced"
                      ? t.paceBalanced
                      : t.paceFast}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowOptional((current) => !current)}
              className="planner-btn planner-btn-secondary"
              aria-expanded={showOptional}
              aria-controls="estimate-optional-settings"
            >
              {showOptional ? t.closeOptional : t.openOptional}
            </button>
          </div>

          {showOptional ? (
            <>
              <label id="estimate-optional-settings" className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.optionalSubjectLabel}</span>
                <input
                  type="text"
                  value={planSubject}
                  onChange={(event) => setPlanSubject(event.target.value)}
                  className="planner-input"
                />
              </label>

              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.optionalNotesLabel}</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="planner-input"
                />
              </label>

              <div className="planner-card md:col-span-2">
                <p className="planner-eyebrow">{t.quickCalibration}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 25, pagesCompleted: 5, retentionScore: 72 })
                    }
                    className="planner-btn planner-btn-secondary"
                  >
                    25m / 5p / 72%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 40, pagesCompleted: 8, retentionScore: 76 })
                    }
                    className="planner-btn planner-btn-secondary"
                  >
                    40m / 8p / 76%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addCalibrationPreset({ minutes: 50, pagesCompleted: 10, retentionScore: 80 })
                    }
                    className="planner-btn planner-btn-secondary"
                  >
                    50m / 10p / 80%
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <button type="submit" className="planner-btn planner-btn-accent w-full md:col-span-2">
            {t.run}
          </button>
        </form>
      </section>

      {estimate ? (
        <section className="space-y-4">
          <article className="planner-panel">
            <p className="planner-eyebrow">{t.target}</p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div className="planner-card bg-slate-50">
                <p className="planner-eyebrow">{t.pagesPerDay}</p>
                <p className="text-3xl font-black text-slate-900">
                  {estimate.prescription.safePagesPerDay}
                </p>
              </div>
              <div className="planner-card bg-slate-50">
                <p className="planner-eyebrow">{t.minutesPerDay}</p>
                <p className="text-3xl font-black text-slate-900">
                  {estimate.prescription.safeMinutesPerDay}
                </p>
              </div>
              <div className="planner-card bg-slate-50">
                <p className="planner-eyebrow">{t.finishChance}</p>
                <p className="text-3xl font-black text-slate-900">
                  {pct(estimate.completionProbability)}
                </p>
              </div>
            </div>

            <div
              className={`mt-3 rounded-2xl border p-3 text-sm ${feasibilityClasses(estimate.feasibility.status)}`}
            >
              {estimate.feasibility.message}
            </div>
          </article>

          <article className="planner-panel">
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
                    Tier {mode.tier} - {mode.windowLabel}
                  </p>
                  <h3 className="mt-1 text-lg font-black">{mode.label}</h3>
                  <p className="mt-1 text-sm">{mode.guidance}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {mode.likelyPagesPerDay} {t.pagesPerDayUnit} - {mode.minutesPerDay} {t.minutesPerDayUnit}
                  </p>
                  <p className="text-xs">
                    {pct(mode.completionProbability)} - +{mode.rewardPoints} XP
                  </p>
                </button>
              ))}
            </div>

            {selectedMode ? (
              <div className="planner-card mt-3 bg-slate-50 text-sm text-slate-700">
                {t.activeTier}: <strong>{selectedMode.label}</strong> - {t.projectedCoverage}{" "}
                <strong>{selectedMode.projectedTotalPages}</strong> pages - {t.gap}{" "}
                <strong>{selectedMode.pageGapToTarget}</strong> pages.
              </div>
            ) : null}
          </article>

          <details className="planner-panel">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              {t.advanced}
            </summary>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <p>
                {t.subjectInference}: <strong>{estimate.inferredSubject}</strong>
              </p>
              <p>
                {t.studyWindow}: <strong>{estimate.studyDays}</strong> {t.daysSuffix}, book size{" "}
                <strong>{estimate.estimatedPages}</strong> pages.
              </p>
              <p>
                {t.calibration}: <strong>{estimate.calibration.modelSource}</strong> - {t.confidence}{" "}
                <strong>{estimate.calibration.confidenceScore}/100</strong>.
              </p>
              <p>
                {t.researchModel}: <strong>{estimate.researchModel.version}</strong> - {t.baseline}{" "}
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
        <section className="planner-alert" role="status" aria-live="polite">
          {message}
        </section>
      ) : null}
    </main>
  );
}
