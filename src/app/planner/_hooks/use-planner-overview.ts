"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson } from "../_lib/client-api";
import { subscribeDataRevision } from "../_lib/focus-progress";
import type { PlannerOverview } from "@/lib/exam-plan";

type UsePlannerOverviewOptions = {
  enabled: boolean;
  studentId?: string | null;
};

const CACHE_TTL_MS = 30_000;

type OverviewCacheState = {
  studentId: string | null;
  overview: PlannerOverview | null;
  fetchedAt: number;
};

const memoryCache = new Map<string, OverviewCacheState>();

function resolveKey(studentId?: string | null) {
  return studentId?.trim() || "__anonymous__";
}

function buildStorageKey(studentId?: string | null) {
  return `studyapp_planner_overview_v1:${resolveKey(studentId)}`;
}

function readStored(studentId?: string | null) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(buildStorageKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OverviewCacheState;
    if (typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(studentId: string | null | undefined, overview: PlannerOverview) {
  if (typeof window === "undefined") return;
  const payload: OverviewCacheState = {
    studentId: studentId ?? null,
    overview,
    fetchedAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(buildStorageKey(studentId), JSON.stringify(payload));
  } catch {
    // no-op
  }
}

export function usePlannerOverview(options: UsePlannerOverviewOptions) {
  const { enabled, studentId } = options;
  const cacheKey = resolveKey(studentId);
  const mountedRef = useRef(true);
  const [overview, setOverview] = useState<PlannerOverview | null>(() => {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) {
      return cached.overview;
    }
    const stored = readStored(studentId);
    if (stored?.overview) {
      memoryCache.set(cacheKey, stored);
      return stored.overview;
    }
    return null;
  });
  const [loading, setLoading] = useState(enabled && !overview);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(
    async (force = false) => {
      if (!enabled || !studentId) return;
      const cached = memoryCache.get(cacheKey);
      if (
        !force &&
        cached &&
        Date.now() - cached.fetchedAt <= CACHE_TTL_MS &&
        cached.overview
      ) {
        if (!mountedRef.current) return;
        setOverview(cached.overview);
        setLoading(false);
        setError("");
        return;
      }

      setRefreshing(true);
      if (!overview) {
        setLoading(true);
      }

      const { ok, payload } = await requestJson<PlannerOverview>("/api/planner/overview");
      if (!mountedRef.current) return;

      if (!ok || !payload.data) {
        setError(payload.error ?? "Failed to load planner overview");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const next: OverviewCacheState = {
        studentId,
        overview: payload.data,
        fetchedAt: Date.now(),
      };
      memoryCache.set(cacheKey, next);
      writeStored(studentId, payload.data);
      setOverview(payload.data);
      setError("");
      setLoading(false);
      setRefreshing(false);
    },
    [cacheKey, enabled, overview, studentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    const stored = readStored(studentId);
    if (stored?.overview) {
      const timer = window.setTimeout(() => {
        if (!mountedRef.current) return;
        memoryCache.set(cacheKey, stored);
        setOverview(stored.overview);
        setLoading(false);
      }, 0);
      return () => {
        mountedRef.current = false;
        window.clearTimeout(timer);
      };
    } else if (enabled && studentId) {
      const timer = window.setTimeout(() => {
        void refresh(false);
      }, 0);
      return () => {
        mountedRef.current = false;
        window.clearTimeout(timer);
      };
    } else {
      const timer = window.setTimeout(() => {
        if (!mountedRef.current) return;
        setOverview(null);
        setLoading(false);
        setError("");
      }, 0);
      return () => {
        mountedRef.current = false;
        window.clearTimeout(timer);
      };
    }
    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, enabled, refresh, studentId]);

  useEffect(() => {
    if (!enabled || !studentId) return;
    return subscribeDataRevision(() => {
      void refresh(true);
    });
  }, [enabled, refresh, studentId]);

  return {
    overview,
    loading,
    refreshing,
    error,
    refresh,
  };
}
