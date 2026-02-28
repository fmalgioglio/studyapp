"use client";

import Link from "next/link";

import { useSiteTheme } from "@/app/_hooks/use-site-theme";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    home: "Home",
    planner: "Planner",
    profile: "Profile",
    login: "Login",
    signup: "Sign up",
    theme: "Theme",
    parrot: "Parrot",
    dolphin: "Dolphin",
  },
  it: {
    home: "Home",
    planner: "Planner",
    profile: "Profilo",
    login: "Accesso",
    signup: "Registrati",
    theme: "Tema",
    parrot: "Pappagallo",
    dolphin: "Delfino",
  },
} as const;

export function SiteNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { language, setLanguage } = useUiLanguage("en");
  const { theme, setTheme } = useSiteTheme("parrot");
  const t = COPY[language] ?? COPY.en;

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium">
      <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
        {t.home}
      </Link>
      <Link href="/planner" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
        {t.planner}
      </Link>
      {isAuthenticated ? (
        <Link href="/planner/students" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">
          {t.profile}
        </Link>
      ) : null}
      {!isAuthenticated ? (
        <>
          <Link href="/login" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
            {t.login}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            {t.signup}
          </Link>
        </>
      ) : null}
      <div className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            language === "en" ? "bg-slate-900 text-white" : "text-slate-700"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("it")}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            language === "it" ? "bg-slate-900 text-white" : "text-slate-700"
          }`}
        >
          IT
        </button>
      </div>
      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <span className="text-xs text-slate-500">{t.theme}</span>
        <button
          type="button"
          onClick={() => setTheme("parrot")}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            theme === "parrot" ? "bg-emerald-600 text-white" : "text-slate-700"
          }`}
        >
          {t.parrot}
        </button>
        <button
          type="button"
          onClick={() => setTheme("dolphin")}
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            theme === "dolphin" ? "bg-cyan-600 text-white" : "text-slate-700"
          }`}
        >
          {t.dolphin}
        </button>
      </div>
    </nav>
  );
}
