"use client";

import { useEffect, useState } from "react";

import { requestJson } from "../_lib/client-api";

type AuthStudent = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
  subjectAffinity?: {
    easiestSubjects: string[];
    effortSubjects: string[];
  } | null;
};

const AUTH_CACHE_TTL_MS = 60_000;
const AUTH_STORAGE_KEY = "studyapp_auth_cache_v1";

let authCache: AuthStudent | null | undefined;
let authCacheAt = 0;
let authInFlight: Promise<AuthStudent | null> | null = null;

function readStoredAuthCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { student: AuthStudent | null; at: number };
    if (typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > AUTH_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAuthCache(student: AuthStudent | null) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ student, at: Date.now() }),
    );
  } catch {
    // no-op
  }
}

async function fetchAuthStudent(): Promise<AuthStudent | null> {
  const stored = readStoredAuthCache();
  if (stored) {
    authCache = stored.student;
    authCacheAt = stored.at;
  }

  const now = Date.now();
  const hasFreshCache =
    authCache !== undefined && now - authCacheAt < AUTH_CACHE_TTL_MS;
  if (hasFreshCache) {
    return authCache ?? null;
  }

  if (authInFlight) {
    return authInFlight;
  }

  authInFlight = (async () => {
    const { ok, payload } = await requestJson<AuthStudent>("/api/auth/me");
    const next = ok && payload.data ? payload.data : null;
    authCache = next;
    authCacheAt = Date.now();
    writeStoredAuthCache(next);
    return next;
  })();

  try {
    return await authInFlight;
  } finally {
    authInFlight = null;
  }
}

export function syncAuthStudentCache(student: AuthStudent | null) {
  authCache = student;
  authCacheAt = Date.now();
  writeStoredAuthCache(student);
}

export function useAuthStudent() {
  const [student, setStudent] = useState<AuthStudent | null>(() =>
    authCache === undefined ? null : authCache,
  );
  const [loading, setLoading] = useState(authCache === undefined);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      const nextStudent = await fetchAuthStudent();
      if (!active) return;
      setStudent(nextStudent);
      setLoading(false);
    }

    void loadMe();

    return () => {
      active = false;
    };
  }, []);

  return { student, loading };
}
