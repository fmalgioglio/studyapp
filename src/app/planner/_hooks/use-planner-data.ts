"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { subscribeDataRevision } from "../_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import {
  type ExamWorkloadApproximateScopeUnit,
  type ExamWorkloadMaterialShape,
} from "@/lib/exam-workload-contract";
import type { ExamPaceRecommendation } from "@/lib/exam-plan";
import type {
  AssessmentType,
  ExamStatus,
  StudyMaterialRecord,
  StudyTargetImportance,
} from "@/lib/study-domain";

export type PlannerSubject = {
  id: string;
  name: string;
  color: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PlannerExam = {
  id: string;
  title: string;
  examDate: string;
  assessmentType?: AssessmentType | null;
  status?: ExamStatus | null;
  importance?: StudyTargetImportance | null;
  targetGrade?: string | null;
  workloadReadiness?: "known" | "unknown";
  materialType?: "book" | "notes" | "mixed" | null;
  workloadPayload?: {
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
  } | null;
  subject: {
    id: string;
    name: string;
  };
  completedAt?: string | null;
  rescheduledFromDate?: string | null;
  planState?: {
    intensityPreference?: string | null;
    summaryPreferencePct?: number | null;
    paceLocked?: boolean | null;
    lastRecommendationSnapshot?: ExamPaceRecommendation | null;
    lastGeneratedAt?: string | null;
  } | null;
  studyMaterials?: StudyMaterialRecord[];
};

export type PlannerDataErrors = {
  subjects?: string;
  exams?: string;
};

export type PlannerDataRefreshResult = {
  ok: boolean;
  errors: PlannerDataErrors;
  skipped: boolean;
};

type RefreshOptions = {
  force?: boolean;
};

type UsePlannerDataOptions = {
  enabled: boolean;
  studentId?: string | null;
  subscribeToRevision?: boolean;
};

type RemoveSubjectOptions = {
  removeLinkedExams?: boolean;
};

const MIN_REFRESH_INTERVAL_MS = 900;
const REVISION_DEBOUNCE_MS = 240;
const PLANNER_CACHE_TTL_MS = 45_000;
const PLANNER_STORAGE_PREFIX = "studyapp_planner_cache_v2";
const ANON_CACHE_KEY = "__anonymous__";

type PlannerCacheState = {
  studentId: string | null;
  subjects: PlannerSubject[];
  exams: PlannerExam[];
  errors: PlannerDataErrors;
  loaded: boolean;
  fetchedAt: number;
};

const emptyPlannerCache = (studentId: string | null): PlannerCacheState => ({
  studentId,
  subjects: [],
  exams: [],
  errors: {},
  loaded: false,
  fetchedAt: 0,
});

const plannerCacheByStudent = new Map<string, PlannerCacheState>();
const plannerInFlightByStudent = new Map<string, Promise<PlannerDataRefreshResult>>();

function resolveStudentCacheKey(studentId?: string | null) {
  return studentId?.trim() || ANON_CACHE_KEY;
}

function buildStorageKey(studentKey: string) {
  return `${PLANNER_STORAGE_PREFIX}:${studentKey}`;
}

function getPlannerCache(studentId?: string | null) {
  const studentKey = resolveStudentCacheKey(studentId);
  const existing = plannerCacheByStudent.get(studentKey);
  if (existing) {
    return existing;
  }
  const next = emptyPlannerCache(studentId ?? null);
  plannerCacheByStudent.set(studentKey, next);
  return next;
}

function hasFreshPlannerCache(cache: PlannerCacheState) {
  return cache.loaded && Date.now() - cache.fetchedAt < PLANNER_CACHE_TTL_MS;
}

function readStoredPlannerCache(studentId?: string | null) {
  if (typeof window === "undefined") return null;
  const storageKey = buildStorageKey(resolveStudentCacheKey(studentId));
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerCacheState;
    if (!parsed.loaded || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > PLANNER_CACHE_TTL_MS) return null;
    return {
      ...parsed,
      studentId: studentId ?? null,
    };
  } catch {
    return null;
  }
}

function writeStoredPlannerCache(cache: PlannerCacheState) {
  if (typeof window === "undefined") return;
  const storageKey = buildStorageKey(resolveStudentCacheKey(cache.studentId));
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // no-op
  }
}

function sortExamsByDate(exams: PlannerExam[]) {
  return [...exams].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
  );
}

export function usePlannerData(options: UsePlannerDataOptions) {
  const { enabled, studentId, subscribeToRevision = false } = options;
  const studentKey = useMemo(() => resolveStudentCacheKey(studentId), [studentId]);
  const mountedRef = useRef(true);
  const refreshSequenceRef = useRef(0);
  const hasLoadedOnceRef = useRef(getPlannerCache(studentId).loaded);
  const lastRefreshAtRef = useRef(0);
  const revisionTimerRef = useRef<number | null>(null);
  const currentStudentKeyRef = useRef(studentKey);

  const [subjects, setSubjects] = useState<PlannerSubject[]>(() => getPlannerCache(studentId).subjects);
  const [exams, setExams] = useState<PlannerExam[]>(() => getPlannerCache(studentId).exams);
  const [errors, setErrors] = useState<PlannerDataErrors>(() => getPlannerCache(studentId).errors);
  const [loading, setLoading] = useState(
    enabled && !getPlannerCache(studentId).loaded,
  );
  const [refreshing, setRefreshing] = useState(false);

  const syncFromCache = useCallback(
    (cache: PlannerCacheState) => {
      if (!mountedRef.current) return;
      setSubjects(cache.subjects);
      setExams(cache.exams);
      setErrors(cache.errors);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    currentStudentKeyRef.current = studentKey;

    const cache = getPlannerCache(studentId);
    const stored = readStoredPlannerCache(studentId);
    if (stored) {
      cache.subjects = stored.subjects;
      cache.exams = stored.exams;
      cache.errors = stored.errors;
      cache.loaded = stored.loaded;
      cache.fetchedAt = stored.fetchedAt;
    }

    hasLoadedOnceRef.current = cache.loaded;
    syncFromCache(cache);

    return () => {
      mountedRef.current = false;
    };
  }, [studentId, studentKey, syncFromCache]);

  const commitLocalData = useCallback(
    (nextState: {
      subjects?: PlannerSubject[];
      exams?: PlannerExam[];
      errors?: PlannerDataErrors;
    }) => {
      refreshSequenceRef.current += 1;

      const cache = getPlannerCache(studentId);
      const nextSubjects = nextState.subjects ?? cache.subjects;
      const nextExams = nextState.exams ?? cache.exams;
      const nextErrors = nextState.errors ?? cache.errors;

      cache.subjects = nextSubjects;
      cache.exams = nextExams;
      cache.errors = nextErrors;
      cache.loaded = true;
      cache.fetchedAt = Date.now();
      writeStoredPlannerCache(cache);
      hasLoadedOnceRef.current = true;

      if (currentStudentKeyRef.current !== studentKey) return;
      if (!mountedRef.current) return;
      setSubjects(nextSubjects);
      setExams(nextExams);
      setErrors(nextErrors);
      setLoading(false);
    },
    [studentId, studentKey],
  );

  const upsertSubject = useCallback(
    (subject: PlannerSubject) => {
      const cache = getPlannerCache(studentId);
      const existingIndex = cache.subjects.findIndex((item) => item.id === subject.id);
      const nextSubjects = [...cache.subjects];
      if (existingIndex >= 0) {
        nextSubjects[existingIndex] = {
          ...nextSubjects[existingIndex],
          ...subject,
        };
      } else {
        nextSubjects.push(subject);
      }

      const nextErrors = { ...cache.errors };
      delete nextErrors.subjects;
      commitLocalData({ subjects: nextSubjects, errors: nextErrors });
    },
    [commitLocalData, studentId],
  );

  const removeSubject = useCallback(
    (subjectId: string, options: RemoveSubjectOptions = {}) => {
      const cache = getPlannerCache(studentId);
      const { removeLinkedExams = true } = options;
      const nextSubjects = cache.subjects.filter((subject) => subject.id !== subjectId);
      const nextExams = removeLinkedExams
        ? cache.exams.filter((exam) => exam.subject.id !== subjectId)
        : cache.exams;
      const nextErrors = { ...cache.errors };
      delete nextErrors.subjects;
      delete nextErrors.exams;
      commitLocalData({
        subjects: nextSubjects,
        exams: nextExams,
        errors: nextErrors,
      });
    },
    [commitLocalData, studentId],
  );

  const upsertExam = useCallback(
    (exam: PlannerExam) => {
      const cache = getPlannerCache(studentId);
      const existingIndex = cache.exams.findIndex((item) => item.id === exam.id);
      const nextExams = [...cache.exams];
      if (existingIndex >= 0) {
        nextExams[existingIndex] = {
          ...nextExams[existingIndex],
          ...exam,
        };
      } else {
        nextExams.push(exam);
      }
      const nextErrors = { ...cache.errors };
      delete nextErrors.exams;
      commitLocalData({
        exams: sortExamsByDate(nextExams),
        errors: nextErrors,
      });
    },
    [commitLocalData, studentId],
  );

  const removeExam = useCallback(
    (examId: string) => {
      const cache = getPlannerCache(studentId);
      const nextExams = cache.exams.filter((exam) => exam.id !== examId);
      const nextErrors = { ...cache.errors };
      delete nextErrors.exams;
      commitLocalData({ exams: nextExams, errors: nextErrors });
    },
    [commitLocalData, studentId],
  );

  const refresh = useCallback(
    async (refreshOptions: RefreshOptions = {}): Promise<PlannerDataRefreshResult> => {
      const { force = false } = refreshOptions;
      if (!enabled || !studentId) {
        return { ok: false, errors: {}, skipped: true };
      }

      const cache = getPlannerCache(studentId);
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) {
        return { ok: false, errors: {}, skipped: true };
      }

      if (!force && hasFreshPlannerCache(cache)) {
        syncFromCache(cache);
        return {
          ok: !cache.errors.subjects && !cache.errors.exams,
          errors: cache.errors,
          skipped: true,
        };
      }

      const inFlightRequest = plannerInFlightByStudent.get(studentKey);
      if (inFlightRequest && !force) {
        const pending = await inFlightRequest;
        const latestCache = getPlannerCache(studentId);
        syncFromCache(latestCache);
        return pending;
      }

      const runRefresh = (async (): Promise<PlannerDataRefreshResult> => {
        try {
          const sequence = refreshSequenceRef.current + 1;
          refreshSequenceRef.current = sequence;

          if (mountedRef.current && currentStudentKeyRef.current === studentKey) {
            setRefreshing(true);
            if (!hasLoadedOnceRef.current) {
              setLoading(true);
            }
          }

          const subjectsRequest = requestJson<PlannerSubject[]>("/api/subjects");
          const examsRequest = requestJson<PlannerExam[]>("/api/exams");
          const subjectsRes = await subjectsRequest;

          if (
            !mountedRef.current ||
            sequence !== refreshSequenceRef.current ||
            currentStudentKeyRef.current !== studentKey
          ) {
            return { ok: false, errors: {}, skipped: true };
          }

          const nextErrors: PlannerDataErrors = { ...cache.errors };

          if (subjectsRes.ok && subjectsRes.payload.data) {
            cache.subjects = subjectsRes.payload.data;
            delete nextErrors.subjects;
          } else {
            nextErrors.subjects = subjectsRes.payload.error ?? "Failed to load subjects";
          }

          cache.errors = nextErrors;
          cache.loaded = true;
          cache.fetchedAt = Date.now();
          writeStoredPlannerCache(cache);
          hasLoadedOnceRef.current = true;
          syncFromCache(cache);

          const examsRes = await examsRequest;
          if (
            !mountedRef.current ||
            sequence !== refreshSequenceRef.current ||
            currentStudentKeyRef.current !== studentKey
          ) {
            return { ok: false, errors: {}, skipped: true };
          }

          if (examsRes.ok && examsRes.payload.data) {
            cache.exams = sortExamsByDate(examsRes.payload.data);
            delete nextErrors.exams;
          } else {
            nextErrors.exams = examsRes.payload.error ?? "Failed to load exams";
          }

          cache.errors = nextErrors;
          cache.loaded = true;
          cache.fetchedAt = Date.now();
          writeStoredPlannerCache(cache);
          hasLoadedOnceRef.current = true;
          lastRefreshAtRef.current = Date.now();
          syncFromCache(cache);

          return {
            ok: !nextErrors.subjects && !nextErrors.exams,
            errors: nextErrors,
            skipped: false,
          };
        } finally {
          if (mountedRef.current && currentStudentKeyRef.current === studentKey) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();

      plannerInFlightByStudent.set(studentKey, runRefresh);
      try {
        return await runRefresh;
      } finally {
        if (plannerInFlightByStudent.get(studentKey) === runRefresh) {
          plannerInFlightByStudent.delete(studentKey);
        }
      }
    },
    [enabled, studentId, studentKey, syncFromCache],
  );

  useEffect(() => {
    if (!enabled || !studentId) return;
    const cache = getPlannerCache(studentId);
    if (hasFreshPlannerCache(cache)) return;
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, refresh, studentId]);

  useEffect(() => {
    if (!enabled || !studentId || !subscribeToRevision) return;
    const unsubscribe = subscribeDataRevision((source) => {
      if (source === "focus_progress") {
        return;
      }
      if (revisionTimerRef.current) {
        window.clearTimeout(revisionTimerRef.current);
      }
      revisionTimerRef.current = window.setTimeout(() => {
        void refresh({ force: true });
        revisionTimerRef.current = null;
      }, REVISION_DEBOUNCE_MS);
    });

    return () => {
      if (revisionTimerRef.current) {
        window.clearTimeout(revisionTimerRef.current);
        revisionTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [enabled, refresh, studentId, subscribeToRevision]);

  return {
    subjects,
    exams,
    loading,
    refreshing,
    errors,
    refresh,
    upsertSubject,
    removeSubject,
    upsertExam,
    removeExam,
  };
}
