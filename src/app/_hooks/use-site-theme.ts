"use client";

import { useEffect, useState } from "react";

export type SiteTheme = "parrot" | "dolphin";

const STORAGE_KEY = "studyapp_site_theme";

export function useSiteTheme(defaultTheme: SiteTheme = "parrot") {
  const [theme, setTheme] = useState<SiteTheme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "parrot" || saved === "dolphin") return saved;
    return defaultTheme;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { theme, setTheme };
}

