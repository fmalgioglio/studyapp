"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeDataRevision } from "../_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import {
  type ExamWorkloadApproximateScopeUnit,
  type ExamWorkloadMaterialShape,
} from "@/lib/exam-workload-contract";

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
  subscribeToRevision?: boolean;
};

type RemoveSubjectOptions = {
  removeLinkedExams?: boolean;
};

const MIN_REFRESH_INTERVAL_MS = 900;
const REVISION_DEBOUNCE_MS = 240;
const PLANNER_CACHE_TTL_MS = 45_000;
const PLANNER_STORAGE_KEY = "studyapp_planner_cache_v1";

type PlannerCacheState = {
  subjects: PlannerSubject[];
  exams: PlannerExam[];
  errors: PlannerDataErrors;
  loaded: boolean;
  fetchedAt: number;
};

const plannerCache: PlannerCacheState = {
  subjects: [],
  exams: [],
  errors: {},
  loaded: false,
  fetchedAt: 0,
};

let plannerInFlight: Promise<PlannerDataRefreshResult> | null = null;

function hasFreshPlannerCache() {
  return (
    plannerCache.loaded && Date.now() - plannerCache.fetchedAt < PLANNER_CACHE_TTL_MS
  );
}

function readStoredPlannerCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerCacheState;
    if (!parsed.loaded || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > PLANNER_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredPlannerCache(value: PlannerCacheState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(value));
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
  const { enabled, subscribeToRevision = false } = options;
  const mountedRef = useRef(true);
  const refreshSequenceRef = useRef(0);
  const hasLoadedOnceRef = useRef(plannerCache.loaded);
  const lastRefreshAtRef = useRef(0);
  const revisionTimerRef = useRef<number | null>(null);

  const [subjects, setSubjects] = useState<PlannerSubject[]>(plannerCache.subjects);
  const [exams, setExams] = useState<PlannerExam[]>(plannerCache.exams);
  const [errors, setErrors] = useState<PlannerDataErrors>(plannerCache.errors);
  const [loading, setLoading] = useState(enabled && !plannerCache.loaded);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const stored = readStoredPlannerCache();
    if (stored) {
      plannerCache.subjects = stored.subjects;
      plannerCache.exams = stored.exams;
      plannerCache.errors = stored.errors;
      plannerCache.loaded = stored.loaded;
      plannerCache.fetchedAt = stored.fetchedAt;
      setSubjects(stored.subjects);
      setExams(stored.exams);
      setErrors(stored.errors);
      setLoading(false);
      hasLoadedOnceRef.current = true;
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commitLocalData = useCallback(
    (nextState: {
      subjects?: PlannerSubject[];
      exams?: PlannerExam[];
      errors?: PlannerDataErrors;
    }) => {
      refreshSequenceRef.current += 1;

      const nextSubjects = nextState.subjects ?? plannerCache.subjects;
      const nextExams = nextState.exams ?? plannerCache.exams;
      const nextErrors = nextState.errors ?? plannerCache.errors;

      plannerCache.subjects = nextSubjects;
      plannerCache.exams = nextExams;
      plannerCache.errors = nextErrors;
      plannerCache.loaded = true;
      plannerCache.fetchedAt = Date.now();
      writeStoredPlannerCache(plannerCache);
      hasLoadedOnceRef.current = true;

      if (!mountedRef.current) return;
      setSubjects(nextSubjects);
      setExams(nextExams);
      setErrors(nextErrors);
      setLoading(false);
    },
    [],
  );

  const upsertSubject = useCallback(
    (subject: PlannerSubject) => {
      const existingIndex = plannerCache.subjects.findIndex(
        (item) => item.id === subject.id,
      );
      const nextSubjects = [...plannerCache.subjects];
      if (existingIndex >= 0) {
        nextSubjects[existingIndex] = {
          ...nextSubjects[existingIndex],
          ...subject,
        };
      } else {
        nextSubjects.push(subject);
      }

      const nextErrors = { ...plannerCache.errors };
      delete nextErrors.subjects;
      commitLocalData({ subjects: nextSubjects, errors: nextErrors });
    },
    [commitLocalData],
  );

  const removeSubject = useCallback(
    (subjectId: string, options: RemoveSubjectOptions = {}) => {
      const { removeLinkedExams = true } = options;
      const nextSubjects = plannerCache.subjects.filter(
        (subject) => subject.id !== subjectId,
      );
      const nextExams = removeLinkedExams
        ? plannerCache.exams.filter((exam) => exam.subject.id !== subjectId)
        : plannerCache.exams;
      const nextErrors = { ...plannerCache.errors };
      delete nextErrors.subjects;
      delete nextErrors.exams;
      commitLocalData({
        subjects: nextSubjects,
        exams: nextExams,
        errors: nextErrors,
      });
    },
    [commitLocalData],
  );

  const upsertExam = useCallback(
    (exam: PlannerExam) => {
      const existingIndex = plannerCache.exams.findIndex(
        (item) => item.id === exam.id,
      );
      const nextExams = [...plannerCache.exams];
      if (existingIndex >= 0) {
        nextExams[existingIndex] = {
          ...nextExams[existingIndex],
          ...exam,
        };
      } else {
        nextExams.push(exam);
      }
      const nextErrors = { ...plannerCache.errors };
      delete nextErrors.exams;
      commitLocalData({
        exams: sortExamsByDate(nextExams),
        errors: nextErrors,
      });
    },
    [commitLocalData],
  );

  const removeExam = useCallback(
    (examId: string) => {
      const nextExams = plannerCache.exams.filter((exam) => exam.id !== examId);
      const nextErrors = { ...plannerCache.errors };
      delete nextErrors.exams;
      commitLocalData({ exams: nextExams, errors: nextErrors });
    },
    [commitLocalData],
  );

  const refresh = useCallback(
    async (refreshOptions: RefreshOptions = {}): Promise<PlannerDataRefreshResult> => {
      const { force = false } = refreshOptions;
      if (!enabled) {
        return { ok: false, errors: {}, skipped: true };
      }

      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) {
        return { ok: false, errors: {}, skipped: true };
      }

      if (!force && hasFreshPlannerCache()) {
        if (mountedRef.current) {
          setSubjects(plannerCache.subjects);
          setExams(plannerCache.exams);
          setErrors(plannerCache.errors);
          setLoading(false);
        }
        return {
          ok: !plannerCache.errors.subjects && !plannerCache.errors.exams,
          errors: plannerCache.errors,
          skipped: true,
        };
      }

      if (plannerInFlight && !force) {
        const pending = await plannerInFlight;
        if (mountedRef.current) {
          setSubjects(plannerCache.subjects);
          setExams(plannerCache.exams);
          setErrors(plannerCache.errors);
          setLoading(false);
        }
        return pending;
      }

      const runRefresh = (async (): Promise<PlannerDataRefreshResult> => {
        try {
          const sequence = refreshSequenceRef.current + 1;
          refreshSequenceRef.current = sequence;

          if (mountedRef.current) {
            setRefreshing(true);
            if (!hasLoadedOnceRef.current) {
              setLoading(true);
            }
          }

          const subjectsRequest = requestJson<PlannerSubject[]>("/api/subjects");
          const examsRequest = requestJson<PlannerExam[]>("/api/exams");
          const subjectsRes = await subjectsRequest;

          if (!mountedRef.current || sequence !== refreshSequenceRef.current) {
            return { ok: false, errors: {}, skipped: true };
          }

          const nextErrors: PlannerDataErrors = { ...plannerCache.errors };

          if (subjectsRes.ok && subjectsRes.payload.data) {
            plannerCache.subjects = subjectsRes.payload.data;
            delete nextErrors.subjects;
          } else {
            nextErrors.subjects = subjectsRes.payload.error ?? "Failed to load subjects";
          }

          plannerCache.errors = nextErrors;
          plannerCache.loaded = true;
          plannerCache.fetchedAt = Date.now();
          writeStoredPlannerCache(plannerCache);
          hasLoadedOnceRef.current = true;
          if (mountedRef.current) {
            setSubjects(plannerCache.subjects);
            setErrors(nextErrors);
            setLoading(false);
          }

          const examsRes = await examsRequest;
          if (!mountedRef.current || sequence !== refreshSequenceRef.current) {
            return { ok: false, errors: {}, skipped: true };
          }

          if (examsRes.ok && examsRes.payload.data) {
            plannerCache.exams = examsRes.payload.data;
            delete nextErrors.exams;
          } else {
            nextErrors.exams = examsRes.payload.error ?? "Failed to load exams";
          }

          plannerCache.errors = nextErrors;
          plannerCache.loaded = true;
          plannerCache.fetchedAt = Date.now();
          writeStoredPlannerCache(plannerCache);
          hasLoadedOnceRef.current = true;
          lastRefreshAtRef.current = Date.now();
          if (mountedRef.current) {
            setSubjects(plannerCache.subjects);
            setExams(plannerCache.exams);
            setErrors(nextErrors);
          }
          return {
            ok: !nextErrors.subjects && !nextErrors.exams,
            errors: nextErrors,
            skipped: false,
          };
        } finally {
          if (mountedRef.current) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();

      plannerInFlight = runRefresh;
      try {
        return await runRefresh;
      } finally {
        if (plannerInFlight === runRefresh) {
          plannerInFlight = null;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    if (hasFreshPlannerCache()) return;
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !subscribeToRevision) return;
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
  }, [enabled, refresh, subscribeToRevision]);

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
