import { randomUUID } from "node:crypto";

import type {
  EngineExamRecord,
  ExamPaceRecommendation,
  PlannerOverview,
} from "@/lib/exam-plan";
import type {
  AssessmentType,
  ExamStatus,
  StudyMaterialRecord,
  StudyTargetImportance,
} from "@/lib/study-domain";
import { buildPlannerOverview } from "@/server/services/exam-plan-engine";

type LocalDevSubject = {
  id: string;
  studentId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

type LocalDevExam = {
  id: string;
  studentId: string;
  subjectId: string;
  title: string;
  examDate: string;
  assessmentType: AssessmentType;
  status: ExamStatus;
  importance: StudyTargetImportance;
  targetGrade: string | null;
  workloadReadiness: "known" | "unknown" | null;
  materialType: "book" | "notes" | "mixed" | null;
  workloadPayload: Record<string, unknown> | null;
  completedAt: string | null;
  rescheduledFromDate: string | null;
  createdAt: string;
  updatedAt: string;
  studyMaterials: StudyMaterialRecord[];
};

type LocalDevState = {
  subjects: LocalDevSubject[];
  exams: LocalDevExam[];
};

const LOCAL_DEV_STUDENT_ID = "local-dev-student";
const LOCAL_DEV_WEEKLY_HOURS = 12;

const globalForLocalDev = globalThis as unknown as {
  studyAppLocalDevStore?: Map<string, LocalDevState>;
};

function getStore() {
  if (!globalForLocalDev.studyAppLocalDevStore) {
    globalForLocalDev.studyAppLocalDevStore = new Map<string, LocalDevState>();
  }

  return globalForLocalDev.studyAppLocalDevStore;
}

function getState(email: string) {
  const store = getStore();
  let state = store.get(email);
  if (!state) {
    state = { subjects: [], exams: [] };
    store.set(email, state);
  }
  return state;
}

function toEngineExamRecord(
  exam: LocalDevExam,
  subject: LocalDevSubject | undefined,
): EngineExamRecord {
  return {
    id: exam.id,
    title: exam.title,
    examDate: exam.examDate,
    assessmentType: exam.assessmentType,
    status: exam.status,
    importance: exam.importance,
    completedAt: exam.completedAt,
    rescheduledFromDate: exam.rescheduledFromDate,
    subject: {
      id: subject?.id ?? exam.subjectId,
      name: subject?.name ?? "Subject",
    },
    workloadReadiness: exam.workloadReadiness,
    materialType: exam.materialType,
    workloadPayload: exam.workloadPayload as EngineExamRecord["workloadPayload"],
    studyLogs: [],
    studyMaterials: exam.studyMaterials,
  };
}

function buildRecommendationMap(state: LocalDevState) {
  const engineExams = state.exams.map((exam) =>
    toEngineExamRecord(
      exam,
      state.subjects.find((subject) => subject.id === exam.subjectId),
    ),
  );
  const overview = buildPlannerOverview({
    exams: engineExams,
    weeklyHours: LOCAL_DEV_WEEKLY_HOURS,
    subjectAffinity: null,
  });

  return new Map(
    overview.examRecommendations.map((recommendation) => [
      recommendation.examId,
      recommendation,
    ]),
  );
}

function toExamResponse(
  exam: LocalDevExam,
  subject: LocalDevSubject | undefined,
  recommendation?: ExamPaceRecommendation,
) {
  return {
    id: exam.id,
    studentId: exam.studentId,
    subjectId: exam.subjectId,
    title: exam.title,
    examDate: exam.examDate,
    assessmentType: exam.assessmentType,
    status: exam.status,
    importance: exam.importance,
    targetGrade: exam.targetGrade,
    workloadReadiness: exam.workloadReadiness,
    materialType: exam.materialType,
    workloadPayload: exam.workloadPayload,
    completedAt: exam.completedAt,
    rescheduledFromDate: exam.rescheduledFromDate,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    subject: {
      id: subject?.id ?? exam.subjectId,
      name: subject?.name ?? "Subject",
    },
    planState: recommendation
      ? {
          intensityPreference: recommendation.intensityPreference,
          summaryPreferencePct: recommendation.summaryPreferencePct,
          paceLocked: recommendation.paceLocked,
          lastRecommendationSnapshot: recommendation,
          lastGeneratedAt: new Date().toISOString(),
        }
      : null,
    studyMaterials: exam.studyMaterials,
  };
}

export function listLocalDevSubjects(email: string) {
  return [...getState(email).subjects];
}

export function createLocalDevSubject(email: string, input: { name: string; color?: string | null }) {
  const state = getState(email);
  const normalizedName = input.name.trim();
  const duplicate = state.subjects.find(
    (subject) => subject.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  if (duplicate) {
    return { duplicate: true as const, subject: duplicate };
  }

  const now = new Date().toISOString();
  const subject: LocalDevSubject = {
    id: randomUUID(),
    studentId: LOCAL_DEV_STUDENT_ID,
    name: normalizedName,
    color: input.color?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  state.subjects.push(subject);
  return { duplicate: false as const, subject };
}

export function getLocalDevSubjectDeletePreview(email: string, subjectId: string) {
  const state = getState(email);
  const subject = state.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return null;
  }

  return {
    id: subjectId,
    relationCounts: {
      exams: state.exams.filter((exam) => exam.subjectId === subjectId).length,
      sources: 0,
      studySessions: 0,
    },
  };
}

export function deleteLocalDevSubject(email: string, subjectId: string) {
  const state = getState(email);
  const preview = getLocalDevSubjectDeletePreview(email, subjectId);
  if (!preview) {
    return null;
  }

  state.subjects = state.subjects.filter((item) => item.id !== subjectId);
  state.exams = state.exams.filter((exam) => exam.subjectId !== subjectId);
  return preview;
}

export function listLocalDevExams(email: string) {
  const state = getState(email);
  const recommendationMap = buildRecommendationMap(state);

  return state.exams
    .map((exam) =>
      toExamResponse(
        exam,
        state.subjects.find((subject) => subject.id === exam.subjectId),
        recommendationMap.get(exam.id),
      ),
    )
    .sort(
      (left, right) =>
        new Date(left.examDate).getTime() - new Date(right.examDate).getTime(),
    );
}

export function createLocalDevExam(
  email: string,
  input: {
    subjectId: string;
    title: string;
    examDate: string;
    assessmentType: AssessmentType;
    status: ExamStatus;
    importance: StudyTargetImportance;
    targetGrade?: string | null;
    workloadReadiness?: "known" | "unknown" | null;
    materialType?: "book" | "notes" | "mixed" | null;
    workloadPayload?: Record<string, unknown> | null;
  },
) {
  const state = getState(email);
  const subject = state.subjects.find((item) => item.id === input.subjectId);
  if (!subject) {
    return null;
  }

  const now = new Date().toISOString();
  const exam: LocalDevExam = {
    id: randomUUID(),
    studentId: LOCAL_DEV_STUDENT_ID,
    subjectId: input.subjectId,
    title: input.title.trim(),
    examDate: input.examDate,
    assessmentType: input.assessmentType,
    status: input.status,
    importance: input.importance,
    targetGrade: input.targetGrade ?? null,
    workloadReadiness: input.workloadReadiness ?? null,
    materialType: input.materialType ?? null,
    workloadPayload: input.workloadPayload ?? null,
    completedAt: null,
    rescheduledFromDate: null,
    createdAt: now,
    updatedAt: now,
    studyMaterials: [],
  };

  state.exams.push(exam);
  const recommendationMap = buildRecommendationMap(state);
  return toExamResponse(exam, subject, recommendationMap.get(exam.id));
}

export function updateLocalDevExam(
  email: string,
  examId: string,
  input: Partial<{
    subjectId: string;
    title: string;
    examDate: string;
    assessmentType: AssessmentType;
    status: ExamStatus;
    importance: StudyTargetImportance;
    targetGrade: string | null;
    workloadReadiness: "known" | "unknown" | null;
    materialType: "book" | "notes" | "mixed" | null;
    workloadPayload: Record<string, unknown> | null;
    completedAt: string | null;
    rescheduledFromDate: string | null;
  }>,
) {
  const state = getState(email);
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) {
    return null;
  }

  if (input.subjectId) {
    const subjectExists = state.subjects.some((subject) => subject.id === input.subjectId);
    if (!subjectExists) {
      return null;
    }
    exam.subjectId = input.subjectId;
  }

  if (input.title !== undefined) exam.title = input.title.trim();
  if (input.examDate !== undefined) exam.examDate = input.examDate;
  if (input.assessmentType !== undefined) exam.assessmentType = input.assessmentType;
  if (input.status !== undefined) exam.status = input.status;
  if (input.importance !== undefined) exam.importance = input.importance;
  if (input.targetGrade !== undefined) exam.targetGrade = input.targetGrade;
  if (input.workloadReadiness !== undefined) exam.workloadReadiness = input.workloadReadiness;
  if (input.materialType !== undefined) exam.materialType = input.materialType;
  if (input.workloadPayload !== undefined) exam.workloadPayload = input.workloadPayload;
  if (input.completedAt !== undefined) exam.completedAt = input.completedAt;
  if (input.rescheduledFromDate !== undefined) exam.rescheduledFromDate = input.rescheduledFromDate;
  exam.updatedAt = new Date().toISOString();

  const recommendationMap = buildRecommendationMap(state);
  return toExamResponse(
    exam,
    state.subjects.find((subject) => subject.id === exam.subjectId),
    recommendationMap.get(exam.id),
  );
}

export function deleteLocalDevExam(email: string, examId: string) {
  const state = getState(email);
  const existing = state.exams.some((exam) => exam.id === examId);
  if (!existing) {
    return false;
  }

  state.exams = state.exams.filter((exam) => exam.id !== examId);
  return true;
}

export function buildLocalDevOverview(email: string): PlannerOverview {
  const state = getState(email);
  if (state.exams.length === 0) {
    return {
      summary: {
        totalExams: 0,
        activeTargets: 0,
        completedTargets: 0,
        weeklyMinutesBudget: LOCAL_DEV_WEEKLY_HOURS * 60,
        plannedWeeklyMinutes: 0,
        verifiedScopeCoveragePct: 0,
        averageCompletionPct: 0,
        averageConfidenceScore: 0,
        risk: "low",
        riskMessage: "Create the first objective to see the planner react live.",
      },
      examRecommendations: [],
      todayFocus: [],
      weeklyBoard: [],
      lightGamification: {
        streakDays: 0,
        sessionsCompleted: 0,
        consistencyLabel: "Start with one clear objective",
        earnedFreeTimeHours: 0,
      },
    };
  }

  return buildPlannerOverview({
    exams: state.exams.map((exam) =>
      toEngineExamRecord(
        exam,
        state.subjects.find((subject) => subject.id === exam.subjectId),
      ),
    ),
    weeklyHours: LOCAL_DEV_WEEKLY_HOURS,
    subjectAffinity: null,
  });
}
