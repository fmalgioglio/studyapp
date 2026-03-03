"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type UiLanguage = "en" | "it";

const STORAGE_KEY = "studyapp_ui_language";

let languageStore: UiLanguage = "en";
let languageInitialized = false;
const languageListeners = new Set<() => void>();

function normalizeLanguage(value: string | null, fallback: UiLanguage): UiLanguage {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "it" || normalized?.startsWith("it-")) return "it";
  if (normalized === "en" || normalized?.startsWith("en-")) return "en";
  return fallback;
}

function readLanguageFromStorage(fallback: UiLanguage): UiLanguage {
  if (typeof window === "undefined") return fallback;
  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY), fallback);
}

function getSnapshot(defaultLang: UiLanguage) {
  if (!languageInitialized) return defaultLang;
  return languageStore;
}

function subscribe(listener: () => void) {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
}

function emitChange() {
  languageListeners.forEach((listener) => listener());
}

export function useUiLanguage(defaultLang: UiLanguage = "en") {
  const language = useSyncExternalStore(
    subscribe,
    () => getSnapshot(defaultLang),
    () => defaultLang,
  );

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    languageInitialized = true;
    languageStore = nextLanguage;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
    }
    emitChange();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!languageInitialized) {
      languageStore = readLanguageFromStorage(defaultLang);
      languageInitialized = true;
      emitChange();
      return;
    }
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [defaultLang, language]);

  return { language, setLanguage };
}
