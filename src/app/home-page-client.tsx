"use client";

import Link from "next/link";

import { DevBootstrapEntryButton } from "@/app/_components/dev-bootstrap-entry-button";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    badge: "Daily study planner",
    headline1: "Plan exams with",
    headline2: "clear daily direction.",
    description:
      "StudyApp keeps exam scope, weekly time, and real study sessions in one place so students can study better and still protect free time.",
    openStudyHub: "Open planner",
    login: "Log in",
    devNote: "Local shortcut for development. It opens a browser session directly in the planner.",
    metric1: "One plan per exam",
    metric1Body: "Each exam gets its own pace, scope, and next steps.",
    metric2: "Real material scope",
    metric2Body: "Books, notes, mixed material, and verified scope stay visible.",
    metric3: "Calm weekly view",
    metric3Body: "Daily priorities stay practical instead of overwhelming.",
  },
  it: {
    badge: "Planner studio quotidiano",
    headline1: "Pianifica gli esami con",
    headline2: "una direzione chiara ogni giorno.",
    description:
      "StudyApp tiene insieme perimetro dell'esame, tempo settimanale e sessioni di studio reali, cosi studi meglio e proteggi anche il tempo libero.",
    openStudyHub: "Apri planner",
    login: "Accesso",
    devNote: "Scorciatoia locale per sviluppo. Apre subito una sessione browser nel planner.",
    metric1: "Un piano per esame",
    metric1Body: "Ogni esame ha il suo ritmo, il suo perimetro e i suoi prossimi passi.",
    metric2: "Perimetro reale",
    metric2Body: "Libri, appunti, materiale misto e perimetro verificato restano visibili.",
    metric3: "Settimana piu chiara",
    metric3Body: "Le priorita giornaliere restano pratiche e non pesanti.",
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
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/90 p-4 shadow-[0_10px_30px_rgba(14,116,144,0.08)]">
              <p className="text-sm font-medium text-slate-900">{t.devNote}</p>
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
