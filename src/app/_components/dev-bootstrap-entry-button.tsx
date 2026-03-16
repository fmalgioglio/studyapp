"use client";

import { useState } from "react";

import { syncAuthStudentCache } from "@/app/planner/_hooks/use-auth-student";
import { requestJson } from "@/app/planner/_lib/client-api";

type DevBootstrapStudent = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
  subjectAffinity?: {
    easiestSubjects: string[];
    effortSubjects: string[];
  } | null;
};

type DevBootstrapEntryButtonProps = {
  className?: string;
};

export function DevBootstrapEntryButton({
  className,
}: DevBootstrapEntryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    const bootstrapResult = await requestJson<DevBootstrapStudent>(
      "/api/auth/dev-bootstrap",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!bootstrapResult.ok) {
      setLoading(false);
      setError(bootstrapResult.payload.error ?? "Dev access failed.");
      return;
    }

    const meResult = await requestJson<DevBootstrapStudent>("/api/auth/me");

    if (!meResult.ok || !meResult.payload.data) {
      setLoading(false);
      setError(meResult.payload.error ?? "Dev session was not created.");
      return;
    }

    syncAuthStudentCache(meResult.payload.data);
    window.location.assign("/planner");
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Entering dev app..." : "Enter dev app"}
      </button>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
