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
export type DataRevisionSource = "dataset" | "focus_progress";

type DataRevisionPayload = {
  revision: string;
  source: DataRevisionSource;
};

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

function parseRevisionPayload(raw: string | null): DataRevisionPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DataRevisionPayload>;
    if (parsed?.source === "dataset" || parsed?.source === "focus_progress") {
      return {
        revision: String(parsed.revision ?? new Date().toISOString()),
        source: parsed.source,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function notifyDataRevision(source: DataRevisionSource = "dataset") {
  if (typeof window === "undefined") return;
  const payload: DataRevisionPayload = {
    revision: new Date().toISOString(),
    source,
  };
  localStorage.setItem(DATA_REVISION_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(DATA_REVISION_EVENT, { detail: payload }));
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
  notifyDataRevision("focus_progress");
}

export function subscribeDataRevision(listener: (source: DataRevisionSource) => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === FOCUS_PROGRESS_KEY) {
      listener("focus_progress");
      return;
    }
    if (event.key === DATA_REVISION_KEY) {
      const payload = parseRevisionPayload(event.newValue);
      listener(payload?.source ?? "dataset");
    }
  };

  const onCustom = (event: Event) => {
    const customEvent = event as CustomEvent<DataRevisionPayload>;
    const source =
      customEvent.detail?.source === "focus_progress" ? "focus_progress" : "dataset";
    listener(source);
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(DATA_REVISION_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DATA_REVISION_EVENT, onCustom);
  };
}
