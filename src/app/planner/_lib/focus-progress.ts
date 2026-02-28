"use client";

export type FocusProgressEntry = {
  pagesCompleted: number;
  minutesSpent: number;
  sessionsCompleted: number;
  lastTopic: string;
  updatedAt: string;
};

export type FocusProgressMap = Record<string, FocusProgressEntry>;

const FOCUS_PROGRESS_KEY = "studyapp_focus_exam_progress_v1";
const DATA_REVISION_KEY = "studyapp_data_revision_v1";
const DATA_REVISION_EVENT = "studyapp:data-revision";

function safeParse(raw: string | null): FocusProgressMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as FocusProgressMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function readFocusProgress(): FocusProgressMap {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(FOCUS_PROGRESS_KEY));
}

export function writeFocusProgress(progress: FocusProgressMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOCUS_PROGRESS_KEY, JSON.stringify(progress));
}

export function notifyDataRevision() {
  if (typeof window === "undefined") return;
  const revision = new Date().toISOString();
  localStorage.setItem(DATA_REVISION_KEY, revision);
  window.dispatchEvent(new CustomEvent(DATA_REVISION_EVENT, { detail: revision }));
}

export function recordFocusProgress(
  examId: string,
  pagesCompleted: number,
  minutesSpent: number,
  topic: string,
) {
  const current = readFocusProgress();
  const existing = current[examId];
  const nextPages = Math.max(0, Math.round(pagesCompleted));
  const nextMinutes = Math.max(0, Math.round(minutesSpent));

  current[examId] = {
    pagesCompleted: (existing?.pagesCompleted ?? 0) + nextPages,
    minutesSpent: (existing?.minutesSpent ?? 0) + nextMinutes,
    sessionsCompleted: (existing?.sessionsCompleted ?? 0) + 1,
    lastTopic: topic.trim() || existing?.lastTopic || "",
    updatedAt: new Date().toISOString(),
  };

  writeFocusProgress(current);
  notifyDataRevision();
}

export function subscribeDataRevision(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === DATA_REVISION_KEY || event.key === FOCUS_PROGRESS_KEY) {
      listener();
    }
  };

  const onCustom = () => {
    listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(DATA_REVISION_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DATA_REVISION_EVENT, onCustom);
  };
}

