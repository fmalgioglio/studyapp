"use client";

import { useEffect, useState } from "react";

import { requestJson } from "../_lib/client-api";

type AuthStudent = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
};

export function useAuthStudent() {
  const [student, setStudent] = useState<AuthStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      const { ok, payload } = await requestJson<AuthStudent>("/api/auth/me");
      if (!active) return;
      if (ok && payload.data) {
        setStudent(payload.data);
      } else {
        setStudent(null);
      }
      setLoading(false);
    }

    loadMe();

    return () => {
      active = false;
    };
  }, []);

  return { student, loading };
}
