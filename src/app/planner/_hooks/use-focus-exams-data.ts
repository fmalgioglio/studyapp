"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson } from "../_lib/client-api";

type FocusExam = {
  id: string;
  title: string;
  examDate: string;
  subject: {
    id: string;
    name: string;
  };
};

type FocusExamsState = {
  exams: FocusExam[];
  loading: boolean;
  syncing: boolean;
  error: string;
};

type FocusExamsCache = {
  exams: FocusExam[];
  fetchedAt: number;
};

const FOCUS_EXAMS_TTL_MS = 45_000;
const FOCUS_EXAMS_STORAGE_KEY = "studyapp_focus_exams_cache_v1";

const memoryCache: FocusExamsCache = {
  exams: [],
  fetchedAt: 0,
};

let inFlightRequest: Promise<{ ok: boolean; exams: FocusExam[]; error: string }> | null = null;

function isFresh(cache: FocusExamsCache) {
  return cache.fetchedAt > 0 && Date.now() - cache.fetchedAt < FOCUS_EXAMS_TTL_MS;
}

function readStorageCache(): FocusExamsCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FOCUS_EXAMS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FocusExamsCache;
    if (!Array.isArray(parsed.exams) || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorageCache(cache: FocusExamsCache) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FOCUS_EXAMS_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

async function fetchFocusExams() {
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    const { ok, payload } = await requestJson<FocusExam[]>("/api/exams");
    if (ok && payload.data) {
      return { ok: true, exams: payload.data, error: "" };
    }
    return {
      ok: false,
      exams: [],
      error: payload.error ?? "Failed to load exams",
    };
  })();

  try {
    return await inFlightRequest;
  } finally {
    inFlightRequest = null;
  }
}

export function useFocusExamsData() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<FocusExamsState>(() => {
    const storageCache = readStorageCache();
    const bestCache = isFresh(memoryCache)
      ? memoryCache
      : storageCache && isFresh(storageCache)
        ? storageCache
        : null;

    if (!bestCache) {
      return {
        exams: [],
        loading: true,
        syncing: false,
        error: "",
      };
    }

    memoryCache.exams = bestCache.exams;
    memoryCache.fetchedAt = bestCache.fetchedAt;
    return {
      exams: bestCache.exams,
      loading: false,
      syncing: false,
      error: "",
    };
  });

  const refresh = useCallback(
    async (force = false) => {
      if (!force && isFresh(memoryCache)) {
        setState((current) => ({
          ...current,
          exams: memoryCache.exams,
          loading: false,
          syncing: false,
          error: "",
        }));
        return;
      }

      setState((current) => ({
        ...current,
        loading: current.exams.length === 0,
        syncing: current.exams.length > 0,
      }));

      const result = await fetchFocusExams();
      if (!mountedRef.current) return;

      if (result.ok) {
        const nextCache: FocusExamsCache = {
          exams: result.exams,
          fetchedAt: Date.now(),
        };
        memoryCache.exams = nextCache.exams;
        memoryCache.fetchedAt = nextCache.fetchedAt;
        writeStorageCache(nextCache);

        setState({
          exams: result.exams,
          loading: false,
          syncing: false,
          error: "",
        });
        return;
      }

      setState((current) => ({
        ...current,
        loading: false,
        syncing: false,
        error: result.error,
      }));
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (isFresh(memoryCache)) {
      return () => {
        mountedRef.current = false;
      };
    }
    const timer = window.setTimeout(() => {
      void refresh(false);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [refresh]);

  return {
    exams: state.exams,
    loading: state.loading,
    syncing: state.syncing,
    error: state.error,
    refresh,
  };
}
