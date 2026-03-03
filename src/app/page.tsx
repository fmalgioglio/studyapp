"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

import { useSiteTheme } from "@/app/_hooks/use-site-theme";
import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const HomeBrandingCard = dynamic(
  () =>
    import("@/app/_components/home-branding-card").then((module) => ({
      default: module.HomeBrandingCard,
    })),
  {
    loading: () => <div className="home-card home-meta-card planner-skeleton h-28" />,
  },
);

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
              {t.openPlanner}
            </Link>
            <Link
              href="/login"
              className="home-btn home-btn-secondary"
            >
              {t.login}
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`home-card home-mascot-card overflow-hidden bg-gradient-to-br ${mascot.accent}`}
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

          <HomeBrandingCard title={t.branding} />
        </div>
      </section>
    </main>
  );
}
