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
    devNote: "Local tools",
    devHint: "Jump straight into the planner during development without going through signup.",
    railTitle: "What the planner fixes",
    railIntro: "StudyApp turns scattered material and vague intentions into one daily loop you can actually follow.",
    metric1Tag: "Today-first",
    metric1: "Start from one clear move, not from the whole mess.",
    metric1Body: "Open Studia oggi and get one concrete block with the right objective, the right scope, and a pace you can keep.",
    metric1Meta: "Clear start",
    metric2Tag: "All in one place",
    metric2: "Keep goals, books, notes, slides, and links attached.",
    metric2Body: "Every exam, test, or oral check stays connected to the material you really need to cover, not lost across tabs and chats.",
    metric2Meta: "Less searching",
    metric3Tag: "Protected time",
    metric3: "Push when it matters, keep evenings more open.",
    metric3Body: "The weekly rhythm adapts to workload and real sessions so strong preparation does not consume all your free time.",
    metric3Meta: "Lower stress",
  },
  it: {
    badge: "Planner studio adattivo",
    headline1: "Studia meglio con",
    headline2: "una direzione chiara ogni giorno.",
    description:
      "StudyApp tiene insieme perimetro dell'esame, tempo settimanale e sessioni di studio reali, cosi studi meglio e proteggi anche il tempo libero.",
    openStudyHub: "Apri Planner",
    login: "Accedi",
    devNote: "Strumenti locali",
    devHint: "Entra subito nel planner durante lo sviluppo senza passare dal signup.",
    railTitle: "Cosa sistema davvero il planner",
    railIntro: "StudyApp trasforma materiale sparso e intenzioni vaghe in un loop quotidiano chiaro da seguire davvero.",
    metric1Tag: "Parti da oggi",
    metric1: "Parti da un passo chiaro, non da tutto il caos insieme.",
    metric1Body: "Apri Studia oggi e trovi un blocco concreto con l'obiettivo giusto, il materiale giusto e un ritmo che riesci a seguire.",
    metric1Meta: "Partenza chiara",
    metric2Tag: "Tutto collegato",
    metric2: "Tieni insieme obiettivi, libri, appunti, slide e link.",
    metric2Body: "Ogni esame, verifica o interrogazione resta collegato al materiale che devi davvero coprire, non disperso tra schede e chat.",
    metric2Meta: "Meno ricerca",
    metric3Tag: "Tempo protetto",
    metric3: "Spingi quando conta, tieni piu libere le serate.",
    metric3Body: "Il ritmo settimanale si adatta al carico e alle sessioni reali cosi una buona preparazione non si mangia tutto il tempo libero.",
    metric3Meta: "Meno stress",
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
  const storyCards = [
    {
      id: "01",
      tag: t.metric1Tag,
      title: t.metric1,
      body: t.metric1Body,
      meta: t.metric1Meta,
    },
    {
      id: "02",
      tag: t.metric2Tag,
      title: t.metric2,
      body: t.metric2Body,
      meta: t.metric2Meta,
    },
    {
      id: "03",
      tag: t.metric3Tag,
      title: t.metric3,
      body: t.metric3Body,
      meta: t.metric3Meta,
    },
  ];

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
            <div className="home-dev-card">
              <p className="text-sm font-semibold text-slate-900">{t.devNote}</p>
              <p className="mt-1 text-sm text-slate-600">{t.devHint}</p>
              <div className="mt-3">
                <DevBootstrapEntryButton className="home-btn home-btn-primary" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="home-story-panel">
          <div className="home-story-header">
            <p className="home-story-kicker">{t.railTitle}</p>
            <p className="home-story-intro">{t.railIntro}</p>
          </div>
          <div className="home-story-grid">
            {storyCards.map((card) => (
              <article key={card.id} className="home-story-card">
                <div className="home-story-topline">
                  <span className="home-story-orbit">{card.id}</span>
                  <span className="home-story-tag">{card.tag}</span>
                </div>
                <h2 className="home-story-title">{card.title}</h2>
                <p className="home-story-body">{card.body}</p>
                <p className="home-story-meta">{card.meta}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
