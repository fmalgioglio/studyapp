"use client";

import { useEffect, useState } from "react";

export type UiLanguage = "en" | "it";

const STORAGE_KEY = "studyapp_ui_language";

export function useUiLanguage(defaultLang: UiLanguage = "en") {
  function normalizeLanguage(value: string | null): UiLanguage {
    const normalized = value?.toLowerCase().trim();
    if (normalized === "it" || normalized?.startsWith("it-")) return "it";
    if (normalized === "en" || normalized?.startsWith("en-")) return "en";
    return defaultLang;
  }

  const [language, setLanguage] = useState<UiLanguage>(() => {
    if (typeof window === "undefined") return defaultLang;
    return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  return { language, setLanguage };
}
