"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type SiteTheme = "parrot" | "dolphin";

const STORAGE_KEY = "studyapp_site_theme";

let themeStore: SiteTheme = "parrot";
let themeInitialized = false;
const themeListeners = new Set<() => void>();

function normalizeTheme(value: string | null, fallback: SiteTheme): SiteTheme {
  if (value === "parrot" || value === "dolphin") return value;
  return fallback;
}

function readThemeFromStorage(fallback: SiteTheme): SiteTheme {
  if (typeof window === "undefined") return fallback;
  return normalizeTheme(window.localStorage.getItem(STORAGE_KEY), fallback);
}

function getSnapshot(defaultTheme: SiteTheme) {
  if (!themeInitialized) return defaultTheme;
  return themeStore;
}

function subscribe(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function emitChange() {
  themeListeners.forEach((listener) => listener());
}

export function useSiteTheme(defaultTheme: SiteTheme = "parrot") {
  const theme = useSyncExternalStore(
    subscribe,
    () => getSnapshot(defaultTheme),
    () => defaultTheme,
  );

  const setTheme = useCallback((nextTheme: SiteTheme) => {
    themeInitialized = true;
    themeStore = nextTheme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    }
    emitChange();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!themeInitialized) {
      themeStore = readThemeFromStorage(defaultTheme);
      themeInitialized = true;
      emitChange();
      return;
    }
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [defaultTheme, theme]);

  return { theme, setTheme };
}
