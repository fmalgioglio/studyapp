"use client";

import { FormEvent, useMemo, useState } from "react";

type Student = {
  id: string;
  email: string;
  fullName: string | null;
  weeklyHours: number;
};

type Subject = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
};

type ApiResult<T> = {
  data?: T;
  error?: string;
};

export default function Home() {
  const [healthStatus, setHealthStatus] = useState("not checked");
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#2563eb");
  const [message, setMessage] = useState("");

  const studentId = useMemo(() => student?.id ?? "", [student]);

  async function requestJson<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<{ ok: boolean; payload: ApiResult<T> }> {
    const response = await fetch(input, init);
    const payload = (await response.json()) as ApiResult<T>;
    return { ok: response.ok, payload };
  }

  async function checkHealth() {
    const response = await fetch("/api/health");
    const json = (await response.json()) as { status: string; db: string };
    setHealthStatus(`${json.status} | db: ${json.db}`);
  }

  async function createOrUpdateStudent(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    const { ok, payload } = await requestJson<Student>("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fullName: fullName || undefined,
        weeklyHours,
      }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to create student");
      return;
    }

    setStudent(payload.data);
    setMessage(`Student ready: ${payload.data.email}`);
  }

  async function loadSubjects() {
    if (!studentId) {
      setMessage("Create a student first.");
      return;
    }

    const { ok, payload } = await requestJson<Subject[]>(
      `/api/subjects?studentId=${studentId}`,
    );

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to load subjects");
      return;
    }

    setSubjects(payload.data);
  }

  async function createSubject(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!studentId) {
      setMessage("Create a student first.");
      return;
    }

    const { ok, payload } = await requestJson<Subject>("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        name: subjectName,
        color: subjectColor,
      }),
    });

    if (!ok || !payload.data) {
      setMessage(payload.error ?? "Failed to create subject");
      return;
    }

    setSubjectName("");
    setMessage(`Subject created: ${payload.data.name}`);
    await loadSubjects();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">StudyApp MVP Console</h1>

        <section className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={checkHealth}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Check API health
            </button>
            <span className="text-sm">Status: {healthStatus}</span>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">1) Create Student</h2>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={createOrUpdateStudent}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                required
                type="email"
                placeholder="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                type="text"
                placeholder="full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Weekly study hours (hours/week)</span>
              <input
                type="number"
                min={1}
                max={80}
                value={weeklyHours}
                onChange={(event) => setWeeklyHours(Number(event.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white sm:col-span-3"
            >
              Save student
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Weekly study hours = realistic hours you can study in one week.
          </p>
          {student ? (
            <p className="mt-3 text-sm">
              Active student: <strong>{student.email}</strong> ({student.id})
            </p>
          ) : null}
        </section>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-xl font-semibold">2) Create Subject</h2>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={createSubject}>
            <input
              required
              type="text"
              placeholder="subject name"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              placeholder="#2563eb"
              value={subjectColor}
              onChange={(event) => setSubjectColor(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Add subject
            </button>
          </form>
          <div className="mt-3">
            <button
              type="button"
              onClick={loadSubjects}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              Refresh subjects
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {subjects.map((subject) => (
              <li key={subject.id} className="rounded border border-slate-200 p-2 text-sm">
                <strong>{subject.name}</strong>{" "}
                <span className="text-slate-500">({subject.color ?? "no color"})</span>
              </li>
            ))}
          </ul>
        </section>

        {message ? (
          <section className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</section>
        ) : null}
      </div>
    </main>
  );
}
