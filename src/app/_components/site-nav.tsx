"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const t = COPY[language] ?? COPY.en;

  const isHome = pathname === "/";
  const isProfile = pathname?.startsWith("/planner/students") ?? false;
  const isPlanner =
    pathname === "/planner" ||
    ((pathname?.startsWith("/planner/") ?? false) && !isProfile);
  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup";
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
        {t.planner}
      </Link>
      {isAuthenticated ? (
        <Link
          href="/planner/students"
          aria-current={isProfile ? "page" : undefined}
          className={linkClass(isProfile)}
        >
          {t.profile}
        </Link>
      ) : null}
      {!isAuthenticated ? (
        <>
          <Link
            href="/login"
            aria-current={isLogin ? "page" : undefined}
            className={linkClass(isLogin, "site-nav-cta-primary")}
          >
            {t.login}
          </Link>
          <Link
            href="/signup"
            aria-current={isSignup ? "page" : undefined}
            className={linkClass(isSignup, "site-nav-cta-secondary")}
          >
            {t.signup}
          </Link>
        </>
      ) : null}
      <div className="site-toggle-group">
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
      <div className="site-toggle-group">
        <span className="site-toggle-label">{t.theme}</span>
        <button
          type="button"
          onClick={() => setTheme("parrot")}
          className={`site-toggle-btn ${
            theme === "parrot" ? "site-toggle-btn-active" : ""
          }`}
        >
          {t.parrot}
        </button>
        <button
          type="button"
          onClick={() => setTheme("dolphin")}
          className={`site-toggle-btn ${
            theme === "dolphin" ? "site-toggle-btn-active" : ""
          }`}
        >
          {t.dolphin}
        </button>
      </div>
    </nav>
  );
}
