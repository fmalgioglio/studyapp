"use client";

import Link from "next/link";

import { DevBootstrapEntryButton } from "@/app/_components/dev-bootstrap-entry-button";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    badge: "Adaptive study planner",
    headline1: "Study better with",
    headline2: "clear daily direction.",
    description:
      "StudyApp keeps exam scope, weekly time, and real study sessions in one place so students can study better and still protect free time.",
    openStudyHub: "Open Planner",
    login: "Log in",
    devNote: "Local development shortcut.",
    devHint: "Open a browser session directly in the planner without going through signup.",
    metric1: "Daily next step",
    metric1Body: "See what to study today without rethinking the whole week.",
    metric2: "Targets + materials",
    metric2Body: "Keep exams, tests, oral checks, notes, books, and useful links together.",
    metric3: "More calm, less chaos",
    metric3Body: "Protect free time with a realistic pace instead of vague study intentions.",
  },
  it: {
    badge: "Planner studio adattivo",
    headline1: "Studia meglio con",
    headline2: "una direzione chiara ogni giorno.",
    description:
      "StudyApp tiene insieme perimetro dell'esame, tempo settimanale e sessioni di studio reali, cosi studi meglio e proteggi anche il tempo libero.",
    openStudyHub: "Apri Planner",
    login: "Accesso",
    devNote: "Scorciatoia locale di sviluppo.",
    devHint: "Apre subito una sessione browser nel planner senza passare dal signup.",
    metric1: "Prossimo passo chiaro",
    metric1Body: "Vedi cosa studiare oggi senza ripensare ogni volta tutta la settimana.",
    metric2: "Target + materiali",
    metric2Body: "Tieni insieme esami, verifiche, interrogazioni, libri, appunti e link utili.",
    metric3: "Meno caos, piu calma",
    metric3Body: "Proteggi il tempo libero con un ritmo realistico invece di intenzioni vaghe.",
  },
} as const;

type HomePageClientProps = {
  devBootstrapEnabled: boolean;
};

export default function HomePageClient({
  devBootstrapEnabled,
}: HomePageClientProps) {
  const { language } = useUiLanguage("en");
  const t = COPY[language];

  return (
    <main className="home-shell">
      <section className="home-grid">
        <div className="space-y-6">
          <span className="home-badge">
            {t.badge}
          </span>
          <h1 className="home-h1">
            {t.headline1}
            <br />
            {t.headline2}
          </h1>
          <p className="home-body">{t.description}</p>
          <div className="home-actions">
            <Link
              href="/planner"
              className="home-btn home-btn-primary"
            >
              {t.openStudyHub}
            </Link>
            <Link
              href="/login"
              className="home-btn home-btn-secondary"
            >
              {t.login}
            </Link>
          </div>
          {devBootstrapEnabled ? (
            <div className="rounded-2xl border border-slate-200 bg-white/88 p-4">
              <p className="text-sm font-semibold text-slate-900">{t.devNote}</p>
              <p className="mt-1 text-sm text-slate-600">{t.devHint}</p>
              <div className="mt-3">
                <DevBootstrapEntryButton className="home-btn home-btn-primary" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <article className="home-card border border-slate-200 bg-white/90">
            <p className="planner-eyebrow">{t.metric1}</p>
            <p className="mt-2 text-sm text-slate-700">{t.metric1Body}</p>
          </article>
          <article className="home-card border border-slate-200 bg-white/90">
            <p className="planner-eyebrow">{t.metric2}</p>
            <p className="mt-2 text-sm text-slate-700">{t.metric2Body}</p>
          </article>
          <article className="home-card border border-slate-200 bg-white/90">
            <p className="planner-eyebrow">{t.metric3}</p>
            <p className="mt-2 text-sm text-slate-700">{t.metric3Body}</p>
          </article>
        </div>
      </section>
    </main>
  );
}
