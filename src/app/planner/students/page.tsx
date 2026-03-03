"use client";

import { FormEvent, useState } from "react";

import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import { syncAuthStudentCache, useAuthStudent } from "../_hooks/use-auth-student";

type Student = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
};

export default function PlannerStudentsPage() {
  const { student, loading } = useAuthStudent();
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [weeklyHoursDraft, setWeeklyHoursDraft] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!student) {
      setMessage("No account context found.");
      return;
    }

    const fullName = fullNameDraft ?? student.fullName ?? "";
    const weeklyHours = weeklyHoursDraft ?? student.weeklyHours;

    const { ok, payload } = await requestJson<Student>("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName || undefined,
        weeklyHours,
      }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to save profile");
      return;
    }

    setMessage("Profile updated.");
    syncAuthStudentCache(payload.data);
    setFullNameDraft(payload.data.fullName ?? "");
    setWeeklyHoursDraft(payload.data.weeklyHours);
    notifyDataRevision();
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure your personal study capacity and account details.
        </p>
      </section>

      <section className="planner-panel">
        {loading ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Loading profile...</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="planner-skeleton h-12" />
              <div className="planner-skeleton h-12" />
            </div>
          </div>
        ) : (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={saveProfile}>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                Email
              </span>
              <input
                type="email"
                value={student?.email ?? ""}
                disabled
                className="planner-input"
              />
            </label>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                Full name
              </span>
                <input
                  type="text"
                  value={fullNameDraft ?? student?.fullName ?? ""}
                  onChange={(event) => setFullNameDraft(event.target.value)}
                  className="planner-input"
                />
              </label>
            <label className="planner-field space-y-1">
              <span className="planner-eyebrow mb-1 block">
                Weekly hours
              </span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={weeklyHoursDraft ?? student?.weeklyHours ?? 10}
                  onChange={(event) => setWeeklyHoursDraft(Number(event.target.value))}
                  className="planner-input"
                />
              </label>
            <button
              type="submit"
              className="planner-btn planner-btn-accent w-full md:col-span-3"
            >
              Save profile
            </button>
          </form>
        )}
      </section>

      {message ? (
        <section className="planner-alert">
          {message}
        </section>
      ) : null}
    </main>
  );
}
