import type {
  ExamWorkloadApproximateScopeUnit,
  ExamWorkloadMaterialShape,
} from "./exam-workload-contract";
import type {
  AssessmentType,
  ExamStatus,
  StudyMaterialRecord,
  StudyTargetImportance,
} from "./study-domain";

export type ExamPlanIntensityPreference =
  | "lighter"
  | "balanced"
  | "stronger";

export type ExamPlanningScopeSource =
  | "verified_workload"
  | "approximate_workload"
  | "linked_materials"
  | "fallback_inference";

export type ExamPlanningConfidence = "high" | "medium" | "low";

export type ExamPlanningRisk = "low" | "medium" | "high";

export type ExamPlanningUrgency = "low" | "medium" | "high";

export type ExamPlanAdjustment = "none" | "preferred" | "effort";

export type ExamPlanMode = "sprint" | "steady" | "revision" | "retention";

export type ExamPaceRecommendation = {
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  assessmentType: AssessmentType;
  status: ExamStatus;
  importance: StudyTargetImportance;
  daysLeft: number;
  planMode: ExamPlanMode;
  paceLabel: string;
  paceDescription: string;
  scopeSummary: string;
  scopeSource: ExamPlanningScopeSource;
  confidence: ExamPlanningConfidence;
  risk: ExamPlanningRisk;
  urgency: ExamPlanningUrgency;
  totalScopePages: number;
  completedPages: number;
  remainingPages: number;
  completionPercent: number;
  weeklyAllocationMinutes: number;
  weeklyAllocationHours: number;
  dailyTargetPages: number;
  dailyTargetMinutes: number;
  allocationReason: string;
  confidenceReason: string;
  riskDrivers: string[];
  summaryPreferencePct: number;
  intensityPreference: ExamPlanIntensityPreference;
  paceLocked: boolean;
  affinityImpact: {
    adjustment: ExamPlanAdjustment;
    label: string;
    explanation: string | null;
  };
  studyLogSummary: {
    minutesSpent: number;
    pagesCompleted: number;
    sessionsCompleted: number;
    lastTopic: string;
    lastCompletedAt: string;
  };
  linkedMaterialsCount: number;
  explanationBullets: string[];
  nextSteps: string[];
};

export type PlannerTodayFocusItem = {
  examId: string;
  examTitle: string;
  subjectName: string;
  minutes: number;
  pages: number;
  urgency: ExamPlanningUrgency;
  reason: string;
};

export type PlannerBoardDay = {
  dateIso: string;
  label: string;
  totalMinutes: number;
  totalPages: number;
  items: PlannerTodayFocusItem[];
};

export type PlannerOverview = {
  summary: {
    totalExams: number;
    activeTargets: number;
    completedTargets: number;
    weeklyMinutesBudget: number;
    plannedWeeklyMinutes: number;
    verifiedScopeCoveragePct: number;
    averageCompletionPct: number;
    averageConfidenceScore: number;
    risk: ExamPlanningRisk;
    riskMessage: string;
  };
  examRecommendations: ExamPaceRecommendation[];
  todayFocus: PlannerTodayFocusItem[];
  weeklyBoard: PlannerBoardDay[];
  lightGamification: {
    streakDays: number;
    sessionsCompleted: number;
    consistencyLabel: string;
    earnedFreeTimeHours: number;
  };
};

export type ExamPlanPreferenceState = {
  intensityPreference?: string | null;
  summaryPreferencePct?: number | null;
  paceLocked?: boolean | null;
  lastRecommendationSnapshot?: unknown;
  lastGeneratedAt?: string | Date | null;
};

export type ExamStudyLogEntry = {
  minutesSpent: number;
  pagesCompleted: number;
  topic?: string | null;
  completedAt: string | Date;
};

export type ExamPlanWorkloadPayload = {
  totalPages?: number;
  bookTitle?: string;
  bookCoverageMode?: "page_range";
  bookPageStart?: number;
  bookPageEnd?: number;
  notesSummary?: string;
  materialDetails?: string;
  verifiedPageCount?: number;
  bookSource?: "google_books" | "open_library" | "local_catalog";
  matchConfidenceScore?: number;
  bookAuthors?: string[];
  inferredSubject?: string;
  materialShape?: ExamWorkloadMaterialShape;
  approximateScopeValue?: number;
  approximateScopeUnit?: ExamWorkloadApproximateScopeUnit;
  isApproximate?: boolean;
};

export type EngineExamRecord = {
  id: string;
  title: string;
  examDate: string | Date;
  assessmentType?: AssessmentType | null;
  status?: ExamStatus | null;
  importance?: StudyTargetImportance | null;
  completedAt?: string | Date | null;
  rescheduledFromDate?: string | Date | null;
  subject: {
    id: string;
    name: string;
  };
  workloadReadiness?: string | null;
  materialType?: string | null;
  workloadPayload?: ExamPlanWorkloadPayload | null;
  planState?: ExamPlanPreferenceState | null;
  studyLogs?: ExamStudyLogEntry[];
  studyMaterials?: StudyMaterialRecord[];
};
