"use client";

import Link from "next/link";

import { DevBootstrapEntryButton } from "@/app/_components/dev-bootstrap-entry-button";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    badge: "Student Planning Workspace",
    headline1: "Plan exams with",
    headline2: "clean workload visibility.",
    description:
      "StudyApp helps students and teachers keep exam scope, study pace, and focused sessions in one compact workspace.",
    openStudyHub: "Open Study Hub",
    login: "Login",
    devNote: "Local development shortcut. Creates a browser session and opens the planner.",
    metric1: "Per-exam pace",
    metric1Body: "Study pace stays tied to the actual exam, not the subject.",
    metric2: "Material-aware exams",
    metric2Body: "Books, notes, mixed cases, and verified scope all stay visible.",
    metric3: "Clearer weekly board",
    metric3Body: "Daily priorities, focus support, and readiness stay calm and readable.",
  },
  it: {
    badge: "Workspace di Pianificazione",
    headline1: "Pianifica gli esami con",
    headline2: "un carico piu leggibile.",
    description:
      "StudyApp aiuta studenti e docenti a tenere insieme perimetro esame, ritmo di studio e sessioni focus in uno spazio compatto.",
    openStudyHub: "Apri Study Hub",
    login: "Accesso",
    devNote: "Scorciatoia locale. Crea una sessione nel browser e apre il planner.",
    metric1: "Ritmo per esame",
    metric1Body: "Il ritmo di studio resta collegato al singolo esame, non solo alla materia.",
    metric2: "Esami sensibili al materiale",
    metric2Body: "Libri, appunti, casi misti e perimetro verificato restano visibili.",
    metric3: "Board settimanale piu chiara",
    metric3Body: "Priorita giornaliere, supporto focus e prontezza restano calmi e leggibili.",
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
