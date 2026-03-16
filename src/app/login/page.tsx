"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { syncAuthStudentCache } from "@/app/planner/_hooks/use-auth-student";
import { requestJson } from "../planner/_lib/client-api";

const COPY = {
  en: {
    title: "Login",
    subtitle: "Access your planner workspace.",
    signIn: "Sign in",
    signingIn: "Signing in...",
    email: "Email",
    password: "Password",
    createAccount: "Create an account",
    newHere: "New here?",
    checking: "Checking session...",
    localShortcut: "Local testing shortcut",
    instantDemo: "Instant local demo access",
  },
  it: {
    title: "Accesso",
    subtitle: "Accedi al planner.",
    signIn: "Entra",
    signingIn: "Accesso in corso...",
    email: "Email",
    password: "Password",
    createAccount: "Crea account",
    newHere: "Nuovo utente?",
    checking: "Controllo sessione...",
    localShortcut: "Scorciatoia test locale",
    instantDemo: "Accesso demo locale istantaneo",
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { ok } = await requestJson<{ id: string }>("/api/auth/me");
      if (!active) return;

      if (ok) {
        router.replace("/planner");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { ok, payload } = await requestJson<{
      id: string;
      email: string;
      fullName: string | null;
      weeklyHours: number;
    }>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );

    setLoading(false);

    if (!ok || !payload.data) {
      setError(payload.error ?? "Login failed.");
      return;
    }

    syncAuthStudentCache(payload.data);

    router.push("/planner");
    router.refresh();
  }

  async function onDemoAccess() {
    setError("");
    setLoading(true);

    const { ok, payload } = await requestJson<{
      id: string;
      email: string;
      fullName: string | null;
      weeklyHours: number;
    }>(
      "/api/auth/dev-bootstrap",
      {
        method: "POST",
      },
    );

    setLoading(false);

    if (!ok || !payload.data) {
      setError(payload.error ?? "Demo login failed.");
      return;
    }

    syncAuthStudentCache(payload.data);

    router.push("/planner");
    router.refresh();
  }

  const isDevMode = process.env.NODE_ENV !== "production";

  if (checkingSession) {
    return (
      <main className="min-h-[calc(100vh-73px)] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-slate-600">{t.checking}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-73px)] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t.subtitle}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t.password}</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="********"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {t.newHere}{" "}
          <Link href="/signup" className="font-semibold text-slate-900 underline">
            {t.createAccount}
          </Link>
        </p>

        {isDevMode ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              {t.localShortcut}
            </p>
            <button
              type="button"
              onClick={onDemoAccess}
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t.instantDemo}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
