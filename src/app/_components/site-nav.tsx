"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";

const COPY = {
  en: {
    home: "Home",
    studyHub: "Planner",
    profile: "Profile",
  },
  it: {
    home: "Home",
    studyHub: "Planner",
    profile: "Profilo",
  },
} as const;

export function SiteNav() {
  const { language, setLanguage } = useUiLanguage("en");
  const pathname = usePathname();
  const t = COPY[language] ?? COPY.en;

  const isHome = pathname === "/";
  const isProfile = pathname?.startsWith("/planner/students") ?? false;
  const isPlanner =
    pathname === "/planner" ||
    pathname === "/study" ||
    ((pathname?.startsWith("/planner/") ?? false) && !isProfile) ||
    ((pathname?.startsWith("/study/") ?? false) && !isProfile);
  const linkClass = (isActive: boolean, extra = "") =>
    `site-nav-link ${extra} ${isActive ? "site-nav-link-active" : ""}`.trim();

  return (
    <nav
      aria-label={language === "it" ? "Navigazione principale" : "Primary navigation"}
      className="site-nav-shell text-sm font-medium"
    >
      <Link
        href="/"
        aria-current={isHome ? "page" : undefined}
        className={linkClass(isHome)}
      >
        {t.home}
      </Link>
      <Link
        href="/planner"
        aria-current={isPlanner ? "page" : undefined}
        className={linkClass(isPlanner)}
      >
        {t.studyHub}
      </Link>
      <Link
        href="/planner/students"
        aria-current={isProfile ? "page" : undefined}
        className={linkClass(isProfile)}
      >
        {t.profile}
      </Link>
      <div className="site-language-group">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`site-toggle-btn ${
            language === "en" ? "site-toggle-btn-active" : ""
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("it")}
          className={`site-toggle-btn ${
            language === "it" ? "site-toggle-btn-active" : ""
          }`}
        >
          IT
        </button>
      </div>
    </nav>
  );
}
