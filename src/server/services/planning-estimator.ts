type CalibrationSession = {
  minutes: number;
  pagesCompleted: number;
  retentionScore?: number;
};

type PaceProfile = "conservative" | "balanced" | "fast";

type EstimateInput = {
  bookTitle: string;
  subject?: string;
  examDate: string;
  paceProfile?: PaceProfile;
  weeklyHours: number;
  knownPages?: number;
  notes?: string;
  calibrationSessions?: CalibrationSession[];
};

type StudyModePlan = {
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
};

type EstimateOutput = {
  inferredSubject: string;
  subjectInferenceSource: "user" | "book_metadata" | "default";
  subjectInferenceConfidence: "high" | "medium" | "low";
  studyDays: number;
  estimatedPages: number;
  inferredDifficulty: number;
  dailyPages: {
    min: number;
    likely: number;
    max: number;
  };
  dailyMinutes: {
    min: number;
    likely: number;
    max: number;
  };
  completionProbability: number;
  targetProbability: number;
  extraMinutesPerDayForTarget: number;
  requiredMinutesPerDayLikely: number;
  requiredMinutesPerDaySafe: number;
  studyModes: StudyModePlan[];
  passChanceRationale: string;
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
    targetConfidence: number;
    basePagesPerDay: number;
    recommendedPagesPerDay: number;
    safePagesPerDay: number;
    stretchPagesPerDay: number;
    recommendedMinutesPerDay: number;
    safeMinutesPerDay: number;
  };
  workloadScenario: {
    label: "balanced" | "compressed" | "extreme";
    intensityScore: number;
    suggestedCoverageMode: "full_scope" | "core_chapters" | "survival_outline";
    pagesToDeprioritize: number;
    suggestedSummaryShare: number;
  };
  burnDownPreview: Array<{
    day: number;
    remainingPages: number;
  }>;
  summary: {
    pagesPerDayMessage: string;
    completionMessage: string;
    improvementMessage: string;
  };
};

type SubjectPriors = {
  wordsPerPageMean: number;
  wordsPerPageSigma: number;
  speedMeanWpm: number;
  speedSdWpm: number;
  reductionAlpha: number;
  reductionBeta: number;
  pagesMean: number;
  pagesSd: number;
  difficulty: number;
};

const DEFAULT_PRIORS: SubjectPriors = {
  wordsPerPageMean: 330,
  wordsPerPageSigma: 0.22,
  speedMeanWpm: 95,
  speedSdWpm: 20,
  reductionAlpha: 3,
  reductionBeta: 5,
  pagesMean: 280,
  pagesSd: 90,
  difficulty: 3,
};

const SUBJECT_PRIORS: Record<string, SubjectPriors> = {
  math: {
    wordsPerPageMean: 240,
    wordsPerPageSigma: 0.25,
    speedMeanWpm: 75,
    speedSdWpm: 18,
    reductionAlpha: 2.8,
    reductionBeta: 5.2,
    pagesMean: 260,
    pagesSd: 80,
    difficulty: 4,
  },
  physics: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 260,
    speedMeanWpm: 80,
    reductionAlpha: 2.8,
    reductionBeta: 5.2,
    difficulty: 4,
  },
  chemistry: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 270,
    speedMeanWpm: 82,
    reductionAlpha: 2.9,
    reductionBeta: 5.1,
    difficulty: 4,
  },
  biology: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 340,
    speedMeanWpm: 92,
    reductionAlpha: 3.1,
    reductionBeta: 4.9,
    difficulty: 3,
  },
  history: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 380,
    speedMeanWpm: 110,
    reductionAlpha: 3.4,
    reductionBeta: 4.6,
    difficulty: 3,
  },
  literature: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 390,
    speedMeanWpm: 115,
    reductionAlpha: 3.5,
    reductionBeta: 4.5,
    difficulty: 2,
  },
  law: {
    ...DEFAULT_PRIORS,
    wordsPerPageMean: 410,
    speedMeanWpm: 90,
    reductionAlpha: 2.7,
    reductionBeta: 5.4,
    difficulty: 4,
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTE_CARLO_RUNS = 1000;
const TARGET_PROBABILITY = 0.9;
const MODE_SUCCESS_THRESHOLD = 0.8;
const RESEARCH_MODEL_VERSION = "2026.02-r1";

const RESEARCH_BASELINE = {
  readingWpmMean: 184,
  readingWpmSd: 29,
  focusBlockMinutes: 35,
  breakMinutes: 7,
} as const;

const PACE_PROFILE_MAP: Record<
  PaceProfile,
  {
    studySpeedFactorFromReading: number;
    speedSdMultiplier: number;
    defaultRetention: number;
  }
> = {
  conservative: {
    studySpeedFactorFromReading: 0.36,
    speedSdMultiplier: 1.14,
    defaultRetention: 0.8,
  },
  balanced: {
    studySpeedFactorFromReading: 0.44,
    speedSdMultiplier: 1.0,
    defaultRetention: 0.73,
  },
  fast: {
    studySpeedFactorFromReading: 0.53,
    speedSdMultiplier: 1.08,
    defaultRetention: 0.67,
  },
};

const STUDY_MODES = [
  {
    tier: 1 as const,
    id: "soft" as const,
    label: "Tier 1 Soft",
    windowLabel: "Wide window",
    minutesPerDay: 90,
    rewardPoints: 120,
    guidance: "Balanced load with extra buffer for breaks and revision.",
  },
  {
    tier: 2 as const,
    id: "medium" as const,
    label: "Tier 2 Medium",
    windowLabel: "Standard window",
    minutesPerDay: 150,
    rewardPoints: 95,
    guidance: "Focused pace for users with stable daily availability.",
  },
  {
    tier: 3 as const,
    id: "strong" as const,
    label: "Tier 3 Strong",
    windowLabel: "Tight window",
    minutesPerDay: 230,
    rewardPoints: 70,
    guidance: "High commitment mode for compressed exam timelines.",
  },
  {
    tier: 4 as const,
    id: "sprint" as const,
    label: "Tier 4 Sprint",
    windowLabel: "Extreme window",
    minutesPerDay: 320,
    rewardPoints: 45,
    guidance: "Rescue mode: hardest intensity, lowest reliability margin.",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function daysUntil(examDateIso: string) {
  const now = new Date();
  const examDate = new Date(examDateIso);
  const diff = Math.ceil((examDate.getTime() - now.getTime()) / DAY_MS);
  return Math.max(diff, 1);
}

function inferSubjectPriors(subject: string): SubjectPriors {
  const normalized = subject.toLowerCase();
  const matched = Object.keys(SUBJECT_PRIORS).find((key) =>
    normalized.includes(key),
  );
  return matched ? SUBJECT_PRIORS[matched] : DEFAULT_PRIORS;
}

function inferSubjectFromBookContext(
  bookTitle: string,
  notes?: string,
): {
  subject: string;
  source: "book_metadata" | "default";
  confidence: "high" | "medium" | "low";
} {
  const text = `${bookTitle} ${notes ?? ""}`.toLowerCase();

  const heuristics: Array<{ subject: string; tokens: string[]; confidence: "high" | "medium" }> =
    [
      { subject: "law", tokens: ["diritto", "private law", "civil law"], confidence: "high" },
      { subject: "math", tokens: ["calculus", "algebra", "probability", "statistics"], confidence: "high" },
      { subject: "physics", tokens: ["physics", "mechanics", "thermodynamics"], confidence: "high" },
      { subject: "chemistry", tokens: ["chemistry", "organic", "inorganic"], confidence: "high" },
      { subject: "biology", tokens: ["biology", "anatomy", "genetics"], confidence: "high" },
      { subject: "history", tokens: ["history", "modern age", "medieval"], confidence: "medium" },
      { subject: "literature", tokens: ["literature", "poetry", "novel"], confidence: "medium" },
    ];

  for (const rule of heuristics) {
    if (rule.tokens.some((token) => text.includes(token))) {
      return {
        subject: rule.subject,
        source: "book_metadata",
        confidence: rule.confidence,
      };
    }
  }

  return {
    subject: "general",
    source: "default",
    confidence: "low",
  };
}

function inferBookTypePageShift(bookTitle: string, notes?: string) {
  const text = `${bookTitle} ${notes ?? ""}`.toLowerCase();

  if (text.includes("handbook") || text.includes("manual")) return 40;
  if (text.includes("summary") || text.includes("quick")) return -70;
  if (text.includes("atlas") || text.includes("collection")) return 90;
  return 0;
}

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomNormalWith(mean: number, sd: number) {
  return mean + sd * randomNormal();
}

function randomLogNormal(mean: number, sigma: number) {
  const mu = Math.log(mean) - (sigma * sigma) / 2;
  return Math.exp(mu + sigma * randomNormal());
}

function randomGamma(shape: number): number {
  if (shape < 1) {
    const u = Math.random();
    return randomGamma(shape + 1) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    const x = randomNormal();
    const v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = Math.random();
    if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randomBeta(alpha: number, beta: number) {
  const x = randomGamma(alpha);
  const y = randomGamma(beta);
  return x / (x + y);
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance =
    values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function getPaceProfileAdjustments(profile: PaceProfile) {
  return PACE_PROFILE_MAP[profile];
}

function extractMultimodalSignals(bookTitle: string, notes?: string) {
  const text = `${bookTitle} ${notes ?? ""}`.toLowerCase();

  const complexityKeywords = [
    "advanced",
    "proof",
    "theorem",
    "constitutional",
    "jurisprudence",
    "organic",
    "quantum",
    "mechanics",
    "statistical",
    "analysis",
  ];
  const supportKeywords = [
    "summary",
    "slides",
    "notes",
    "flashcards",
    "highlighted",
    "schema",
    "map",
    "outline",
  ];
  const compressionKeywords = [
    "quick",
    "essentials",
    "compendium",
    "short",
    "review",
  ];

  const complexityHits = complexityKeywords.filter((keyword) => text.includes(keyword)).length;
  const supportHits = supportKeywords.filter((keyword) => text.includes(keyword)).length;
  const compressionHits = compressionKeywords.filter((keyword) => text.includes(keyword)).length;

  return {
    complexityScore: clamp(complexityHits / 5, 0, 1),
    supportScore: clamp(supportHits / 5, 0, 1),
    compressionScore: clamp(compressionHits / 4, 0, 1),
  };
}

function deriveColdStartPrior(
  priors: SubjectPriors,
  paceProfile: PaceProfile,
  signals: {
    complexityScore: number;
    supportScore: number;
    compressionScore: number;
  },
) {
  const profileConfig = getPaceProfileAdjustments(paceProfile);
  const researchSpeedMean =
    RESEARCH_BASELINE.readingWpmMean * profileConfig.studySpeedFactorFromReading;
  const researchSpeedSd =
    RESEARCH_BASELINE.readingWpmSd * profileConfig.studySpeedFactorFromReading;

  const blendedMean = 0.66 * priors.speedMeanWpm + 0.34 * researchSpeedMean;
  const complexityPenalty = 1 - signals.complexityScore * 0.18;
  const supportBoost = 1 + signals.supportScore * 0.08 + signals.compressionScore * 0.05;
  const priorMean = clamp(blendedMean * complexityPenalty * supportBoost, 40, 190);

  const baseSd = Math.sqrt(
    priors.speedSdWpm * priors.speedSdWpm + researchSpeedSd * researchSpeedSd * 0.3,
  );
  const uncertaintyBoost = 1 + signals.complexityScore * 0.15;
  const priorSd = clamp(
    baseSd * profileConfig.speedSdMultiplier * uncertaintyBoost,
    10,
    38,
  );

  return { mean: priorMean, sd: priorSd };
}

function buildResearchNotes() {
  return [
    "Cold-start speed prior blends subject priors with reading benchmark constraints.",
    "Complexity and support cues are inferred from title/notes as multimodal signals.",
    "Long uninterrupted study durations receive fatigue penalties.",
    "Model transitions from research prior to personal samples when data is available.",
  ];
}

function bayesianSpeedPosterior(
  sessions: CalibrationSession[] | undefined,
  baselineWordsPerPage: number,
  baselineReduction: number,
  priorMean: number,
  priorSd: number,
) {
  if (!sessions || sessions.length === 0) {
    return { mean: priorMean, sd: priorSd };
  }

  const speeds = sessions
    .filter((session) => session.minutes > 0 && session.pagesCompleted > 0)
    .map((session) => {
      const retention = session.retentionScore ?? 70;
      const retentionFactor = clamp(retention / 70, 0.7, 1.3);
      const effectiveWords =
        session.pagesCompleted * baselineWordsPerPage * baselineReduction;
      return (effectiveWords / session.minutes) * retentionFactor;
    })
    .filter((speed) => Number.isFinite(speed) && speed > 20);

  if (speeds.length === 0) {
    return { mean: priorMean, sd: priorSd };
  }

  const sampleMean = speeds.reduce((acc, value) => acc + value, 0) / speeds.length;
  const obsSd = 18;
  const priorVar = priorSd * priorSd;
  const obsVar = (obsSd * obsSd) / speeds.length;
  const postVar = 1 / (1 / priorVar + 1 / obsVar);
  const postMean = postVar * (priorMean / priorVar + sampleMean / obsVar);

  return { mean: clamp(postMean, 45, 180), sd: clamp(Math.sqrt(postVar), 8, 25) };
}

function summarizeCalibration(
  sessions: CalibrationSession[] | undefined,
  paceProfile: PaceProfile,
): EstimateOutput["calibration"] {
  if (!sessions || sessions.length === 0) {
    return {
      samplesUsed: 0,
      confidence: "low",
      confidenceScore: 30,
      observedPagesPerHour: null,
      paceVariability: "unstable",
      modelSource: "profile_prior",
      paceProfileUsed: paceProfile,
    };
  }

  const paceSamples = sessions
    .filter((session) => session.minutes > 0 && session.pagesCompleted > 0)
    .map((session) => (session.pagesCompleted / session.minutes) * 60);

  if (paceSamples.length === 0) {
    return {
      samplesUsed: 0,
      confidence: "low",
      confidenceScore: 30,
      observedPagesPerHour: null,
      paceVariability: "unstable",
      modelSource: "profile_prior",
      paceProfileUsed: paceProfile,
    };
  }

  const meanPph = average(paceSamples);
  const sdPph = standardDeviation(paceSamples);
  const cv = meanPph > 0 ? sdPph / meanPph : 1;

  const retentionCoverage =
    sessions.filter((session) => typeof session.retentionScore === "number").length /
    sessions.length;
  const sampleFactor = clamp(sessions.length / 8, 0, 1);
  const stabilityFactor = clamp(1 - cv / 0.65, 0, 1);

  const confidenceScore = Math.round(
    100 * (0.55 * sampleFactor + 0.35 * stabilityFactor + 0.1 * retentionCoverage),
  );

  let confidence: EstimateOutput["calibration"]["confidence"] = "low";
  if (confidenceScore >= 75) confidence = "high";
  else if (confidenceScore >= 45) confidence = "medium";

  const paceVariability: EstimateOutput["calibration"]["paceVariability"] =
    cv < 0.25 ? "stable" : cv < 0.45 ? "variable" : "unstable";

  return {
    samplesUsed: sessions.length,
    confidence,
    confidenceScore,
    observedPagesPerHour: Math.round(meanPph * 10) / 10,
    paceVariability,
    modelSource: "user_samples",
    paceProfileUsed: paceProfile,
  };
}

function inferRiskLevel(probability: number): StudyModePlan["riskLevel"] {
  if (probability >= 0.85) return "low";
  if (probability >= 0.65) return "moderate";
  if (probability >= 0.45) return "high";
  return "critical";
}

function buildBurnDownPreview(estimatedPages: number, dailyPagesLikely: number, studyDays: number) {
  const points = 7;
  const result: Array<{ day: number; remainingPages: number }> = [];

  for (let i = 0; i < points; i += 1) {
    const ratio = i / (points - 1);
    const day = Math.round(studyDays * ratio);
    const remainingPages = Math.max(0, Math.round(estimatedPages - dailyPagesLikely * day));
    result.push({ day, remainingPages });
  }

  return result;
}

export function estimateStudyPlan(input: EstimateInput): EstimateOutput {
  const paceProfile: PaceProfile = input.paceProfile ?? "balanced";
  const paceProfileAdjustments = getPaceProfileAdjustments(paceProfile);

  const subjectContext = input.subject?.trim()
    ? {
        subject: input.subject.trim(),
        source: "user" as const,
        confidence: "high" as const,
      }
    : inferSubjectFromBookContext(input.bookTitle, input.notes);

  const priors = inferSubjectPriors(subjectContext.subject);
  const inferredDifficulty = priors.difficulty;
  const multimodalSignals = extractMultimodalSignals(input.bookTitle, input.notes);
  const dayCount = daysUntil(input.examDate);
  const studyDays = Math.max(Math.ceil(dayCount * (6 / 7)), 1);
  const bookShift = inferBookTypePageShift(input.bookTitle, input.notes);
  const estimatedPages = input.knownPages
    ? input.knownPages
    : Math.round(
        clamp(
          randomNormalWith(priors.pagesMean + bookShift, priors.pagesSd),
          80,
          1200,
        ),
      );

  const baselineReduction = priors.reductionAlpha / (priors.reductionAlpha + priors.reductionBeta);
  const coldStartPrior = deriveColdStartPrior(priors, paceProfile, multimodalSignals);
  const calibrationSummary = summarizeCalibration(input.calibrationSessions, paceProfile);
  const speedPosterior = bayesianSpeedPosterior(
    input.calibrationSessions,
    priors.wordsPerPageMean,
    baselineReduction,
    coldStartPrior.mean,
    coldStartPrior.sd,
  );

  const neededMinutesRuns: number[] = [];
  const dailyPagesRuns: number[] = [];
  const dailyMinutesRuns: number[] = [];
  const pagesPerMinuteRuns: number[] = [];
  const calibratedRetention =
    input.calibrationSessions && input.calibrationSessions.length > 0
      ? clamp(
          average(
            input.calibrationSessions
              .map((session) => session.retentionScore)
              .filter((value): value is number => typeof value === "number"),
          ) / 100,
          0.45,
          0.95,
        )
      : clamp(
          paceProfileAdjustments.defaultRetention +
            multimodalSignals.supportScore * 0.04 -
            multimodalSignals.complexityScore * 0.05,
          0.45,
          0.95,
        );
  const confidenceUncertaintyMultiplier =
    calibrationSummary.confidence === "high"
      ? 1.0
      : calibrationSummary.confidence === "medium"
        ? 1.06
        : 1.13;

  for (let i = 0; i < MONTE_CARLO_RUNS; i += 1) {
    const wordsPerPage = clamp(
      randomLogNormal(priors.wordsPerPageMean, priors.wordsPerPageSigma),
      120,
      650,
    );
    const reductionRate = clamp(
      randomBeta(priors.reductionAlpha, priors.reductionBeta),
      0.18,
      0.78,
    );
    const studySpeed = clamp(
      randomNormalWith(speedPosterior.mean, speedPosterior.sd),
      35,
      220,
    );

    const difficultyMultiplier = 1 + (inferredDifficulty - 3) * 0.12;
    const revisionMultiplier = clamp(
      1.1 + (inferredDifficulty - 3) * 0.08 + (1 - reductionRate) * 0.35,
      1.05,
      1.85,
    );
    const retentionPressure = clamp((0.8 - calibratedRetention) * 0.5, -0.08, 0.22);
    const bufferMultiplier = 1.08 + retentionPressure + (confidenceUncertaintyMultiplier - 1);

    const effectiveWords = estimatedPages * wordsPerPage * reductionRate;
    const rawTotalMinutes =
      (effectiveWords / studySpeed) *
      difficultyMultiplier *
      revisionMultiplier *
      bufferMultiplier;
    const projectedDailyMinutes = rawTotalMinutes / studyDays;
    const blockLoad = projectedDailyMinutes / RESEARCH_BASELINE.focusBlockMinutes;
    const fatigueMultiplier = 1 + Math.max(0, blockLoad - 4) * 0.025;
    const totalMinutesNeeded = rawTotalMinutes * fatigueMultiplier;

    const dailyMinutes = totalMinutesNeeded / studyDays;
    const pageEquivalentMultiplier = clamp(
      1.0 +
        (inferredDifficulty - 3) * 0.08 +
        (1 - reductionRate) * 0.45 +
        (0.78 - calibratedRetention) * 0.5,
      1.0,
      2.1,
    );
    const dailyPages = (estimatedPages * pageEquivalentMultiplier) / studyDays;

    neededMinutesRuns.push(totalMinutesNeeded);
    dailyMinutesRuns.push(dailyMinutes);
    dailyPagesRuns.push(dailyPages);
    pagesPerMinuteRuns.push(dailyPages / Math.max(dailyMinutes, 1));
  }

  const availableMinutes = (input.weeklyHours * 60 * dayCount) / 7;
  const completionProbability =
    neededMinutesRuns.filter((required) => required <= availableMinutes).length /
    neededMinutesRuns.length;

  let extraMinutesPerDayForTarget = 0;
  for (let extra = 0; extra <= 180; extra += 5) {
    const successRate =
      neededMinutesRuns.filter(
        (required) => required <= availableMinutes + extra * studyDays,
      ).length / neededMinutesRuns.length;

    if (successRate >= TARGET_PROBABILITY) {
      extraMinutesPerDayForTarget = extra;
      break;
    }
  }

  const requiredMinutesPerDayLikely = Math.max(
    10,
    Math.round(percentile(neededMinutesRuns, 0.5) / studyDays),
  );
  const requiredMinutesPerDaySafe = Math.max(
    10,
    Math.round(percentile(neededMinutesRuns, 0.8) / studyDays),
  );

  const dailyPagesLikely = Math.round(percentile(dailyPagesRuns, 0.5));
  const dailyPagesMin = Math.max(1, Math.round(percentile(dailyPagesRuns, 0.2)));
  const dailyPagesMax = Math.max(dailyPagesLikely, Math.round(percentile(dailyPagesRuns, 0.8)));

  const dailyMinutesLikely = Math.round(percentile(dailyMinutesRuns, 0.5));
  const dailyMinutesMin = Math.max(10, Math.round(percentile(dailyMinutesRuns, 0.2)));
  const dailyMinutesMax = Math.max(dailyMinutesLikely, Math.round(percentile(dailyMinutesRuns, 0.8)));
  const basePagesPerDay = Math.max(1, Math.ceil(estimatedPages / studyDays));
  const recommendedPagesPerDay = Math.max(1, Math.round(percentile(dailyPagesRuns, 0.5)));
  const safePagesPerDay = Math.max(1, Math.round(percentile(dailyPagesRuns, 0.8)));
  const stretchPagesPerDay = Math.max(safePagesPerDay, Math.round(percentile(dailyPagesRuns, 0.9)));

  const probabilityPct = Math.round(completionProbability * 100);
  const targetPct = Math.round(TARGET_PROBABILITY * 100);

  const rawStudyModes: StudyModePlan[] = STUDY_MODES.map((mode) => {
    const modeTotalMinutes = mode.minutesPerDay * studyDays;
    const modeProbability =
      neededMinutesRuns.filter((required) => required <= modeTotalMinutes).length /
      neededMinutesRuns.length;

    const modePagesLikely = Math.max(
      1,
      Math.round(percentile(pagesPerMinuteRuns, 0.5) * mode.minutesPerDay),
    );

    return {
      tier: mode.tier,
      id: mode.id,
      label: mode.label,
      windowLabel: mode.windowLabel,
      minutesPerDay: mode.minutesPerDay,
      hoursPerDay: Number((mode.minutesPerDay / 60).toFixed(1)),
      likelyPagesPerDay: modePagesLikely,
      projectedTotalPages: modePagesLikely * studyDays,
      pageGapToTarget: Math.max(0, estimatedPages - modePagesLikely * studyDays),
      completionProbability: modeProbability,
      riskLevel: inferRiskLevel(modeProbability),
      rewardPoints: mode.rewardPoints,
      guidance: mode.guidance,
    };
  });

  // Pass chance should not decrease when daily minutes increase.
  const studyModes = rawStudyModes.map((mode, index) => {
    if (index === 0) return mode;
    const previous = rawStudyModes[index - 1];
    return {
      ...mode,
      completionProbability: Math.max(mode.completionProbability, previous.completionProbability),
    };
  });

  const onTrackMode = studyModes.find(
    (mode) => mode.completionProbability >= MODE_SUCCESS_THRESHOLD,
  );
  const strongestMode = studyModes[studyModes.length - 1];

  let feasibility: EstimateOutput["feasibility"];
  if (onTrackMode) {
    feasibility = {
      status: "on_track",
      message: `${onTrackMode.label} is enough to stay on track with good reliability.`,
      recommendedActions: [
        "Keep one weekly revision block to protect retention.",
        "Use quick chapter summaries only for weak topics.",
        "Track 2-3 calibration sessions per week to refine pace.",
      ],
    };
  } else if (strongestMode.completionProbability >= 0.55) {
    feasibility = {
      status: "tight",
      message:
        "Timeline is tight. You need a high-intensity mode and strict chapter prioritization.",
      recommendedActions: [
        "Apply priority scoring: high-weight chapters first.",
        "Use condensed notes for low-priority chapters.",
        "Add at least one extra focus block on weak areas.",
      ],
    };
  } else {
    feasibility = {
      status: "rescue",
      message:
        "Current workload is not realistic for full coverage. Use rescue planning and selective scope.",
      recommendedActions: [
        "Switch to must-pass chapter strategy (20/80 approach).",
        "Upload or prepare concise summaries for secondary sections.",
        "Negotiate timeline if possible or reduce full-scope target.",
      ],
    };
  }

  const bestProjectedCoverage = Math.max(
    studyModes[0].projectedTotalPages,
    studyModes[studyModes.length - 1].projectedTotalPages,
  );
  const pagesToDeprioritize = Math.max(0, estimatedPages - bestProjectedCoverage);
  const suggestedSummaryShare = Number(
    clamp(pagesToDeprioritize / Math.max(estimatedPages, 1), 0, 0.85).toFixed(2),
  );

  const workloadPressure = clamp(
    Math.round((requiredMinutesPerDaySafe / Math.max(input.weeklyHours * (60 / 7), 1)) * 100),
    0,
    100,
  );

  const scenarioLabel: EstimateOutput["workloadScenario"]["label"] =
    workloadPressure < 70 ? "balanced" : workloadPressure < 100 ? "compressed" : "extreme";

  const suggestedCoverageMode: EstimateOutput["workloadScenario"]["suggestedCoverageMode"] =
    scenarioLabel === "balanced"
      ? "full_scope"
      : scenarioLabel === "compressed"
        ? "core_chapters"
        : "survival_outline";

  return {
    inferredSubject: subjectContext.subject,
    subjectInferenceSource: subjectContext.source,
    subjectInferenceConfidence: subjectContext.confidence,
    studyDays,
    estimatedPages,
    inferredDifficulty,
    dailyPages: {
      min: dailyPagesMin,
      likely: dailyPagesLikely,
      max: dailyPagesMax,
    },
    dailyMinutes: {
      min: dailyMinutesMin,
      likely: dailyMinutesLikely,
      max: dailyMinutesMax,
    },
    completionProbability,
    targetProbability: TARGET_PROBABILITY,
    extraMinutesPerDayForTarget,
    requiredMinutesPerDayLikely,
    requiredMinutesPerDaySafe,
    studyModes,
    passChanceRationale:
      "Finish chance is estimated from Monte Carlo simulations. Higher tiers allocate more minutes/day, so they usually raise completion probability on tight deadlines.",
    feasibility,
    workloadScenario: {
      label: scenarioLabel,
      intensityScore: workloadPressure,
      suggestedCoverageMode,
      pagesToDeprioritize,
      suggestedSummaryShare,
    },
    burnDownPreview: buildBurnDownPreview(estimatedPages, dailyPagesLikely, studyDays),
    summary: {
      pagesPerDayMessage: `Study ${recommendedPagesPerDay} pages/day baseline, ${safePagesPerDay} pages/day for a safety margin.`,
      completionMessage: `At current pace: ${probabilityPct}% chance to finish before exam.`,
      improvementMessage:
        extraMinutesPerDayForTarget > 0
          ? `If you do +${extraMinutesPerDayForTarget} min/day, chance rises to about ${targetPct}%.`
          : `Current workload is already near ${targetPct}% finish probability.`,
    },
    calibration: calibrationSummary,
    researchModel: {
      version: RESEARCH_MODEL_VERSION,
      baselineReadingWpm: RESEARCH_BASELINE.readingWpmMean,
      baselineReadingSd: RESEARCH_BASELINE.readingWpmSd,
      focusBlockMinutes: RESEARCH_BASELINE.focusBlockMinutes,
      breakMinutes: RESEARCH_BASELINE.breakMinutes,
      notes: buildResearchNotes(),
    },
    prescription: {
      targetConfidence: 0.8,
      basePagesPerDay,
      recommendedPagesPerDay,
      safePagesPerDay,
      stretchPagesPerDay,
      recommendedMinutesPerDay: requiredMinutesPerDayLikely,
      safeMinutesPerDay: requiredMinutesPerDaySafe,
    },
  };
}
