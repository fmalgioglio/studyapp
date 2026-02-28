"use client";

import { FormEvent, useState } from "react";

import { notifyDataRevision } from "@/app/planner/_lib/focus-progress";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

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
    setFullNameDraft(payload.data.fullName ?? "");
    setWeeklyHoursDraft(payload.data.weeklyHours);
    notifyDataRevision();
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure your personal study capacity and account details.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Loading profile...</p>
        ) : (
          <form className="grid gap-3 md:grid-cols-3" onSubmit={saveProfile}>
            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={student?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full name
              </span>
                <input
                  type="text"
                  value={fullNameDraft ?? student?.fullName ?? ""}
                  onChange={(event) => setFullNameDraft(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            <label className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Weekly hours
              </span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={weeklyHoursDraft ?? student?.weeklyHours ?? 10}
                  onChange={(event) => setWeeklyHoursDraft(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 md:col-span-3"
            >
              Save profile
            </button>
          </form>
        )}
      </section>

      {message ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </section>
      ) : null}
    </main>
  );
}
