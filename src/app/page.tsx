"use client";

import Image from "next/image";
import Link from "next/link";

import { useSiteTheme } from "@/app/_hooks/use-site-theme";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    badge: "Season Planning + Gamification",
    headline1: "Build your exam season with",
    headline2: "missions, focus, and momentum.",
    description:
      "StudyApp turns complex exam calendars into weekly quests, safe daily targets, and rewarding focus runs.",
    openPlanner: "Open Planner",
    login: "Login",
    branding: "Branding and assets",
  },
  it: {
    badge: "Pianificazione Sessione + Gamification",
    headline1: "Costruisci la sessione esami con",
    headline2: "missioni, focus e continuita.",
    description:
      "StudyApp trasforma calendari complessi in quest settimanali, target giornalieri e sessioni focus gratificanti.",
    openPlanner: "Apri Planner",
    login: "Accesso",
    branding: "Branding e assets",
  },
} as const;

export default function HomePage() {
  const { language } = useUiLanguage("en");
  const { theme } = useSiteTheme("parrot");
  const t = COPY[language];

  const mascot =
    theme === "parrot"
      ? {
          name: "Aero the Parrot",
          image: "/mascots/parrot.svg",
          accent: "from-emerald-100 to-amber-100",
        }
      : {
          name: "Nami the Dolphin",
          image: "/mascots/dolphin.svg",
          accent: "from-cyan-100 to-blue-100",
        };

  return (
    <main className="min-h-[calc(100vh-73px)]">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {t.badge}
          </span>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
            {t.headline1}
            <br />
            {t.headline2}
          </h1>
          <p className="max-w-xl text-base text-slate-700 sm:text-lg">{t.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/planner"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t.openPlanner}
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.login}
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${mascot.accent} p-5 shadow-[0_10px_40px_rgba(15,23,42,0.09)]`}
          >
            <div className="flex items-center gap-4">
              <Image
                src={mascot.image}
                alt={mascot.name}
                width={88}
                height={88}
                className="animate-[floaty_3.4s_ease-in-out_infinite]"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Active mascot
                </p>
                <p className="text-2xl font-black text-slate-900">{mascot.name}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Change mascot with the theme toggle in the top navigation.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">{t.branding}</p>
            <p className="mt-2">Theme and copy: <code>src/app/page.tsx</code></p>
            <p>Global theme variables: <code>src/app/globals.css</code></p>
            <p>Planner shell: <code>src/app/planner/page.tsx</code></p>
            <p>Subject Hub: <code>src/app/planner/subjects/page.tsx</code></p>
          </div>
        </div>
      </section>
    </main>
  );
}
