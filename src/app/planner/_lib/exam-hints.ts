export type ExamHint = {
  workloadMode: "light" | "standard" | "deep";
  summaryCoverage: number;
};

export type ExamHintsMap = Record<string, ExamHint>;

export const EXAM_HINTS_STORAGE_KEY = "studyapp_exam_hints";
export const EMPTY_EXAM_HINTS: ExamHintsMap = {};

export function readExamHints(): ExamHintsMap {
  if (typeof window === "undefined") return EMPTY_EXAM_HINTS;

  const raw = localStorage.getItem(EXAM_HINTS_STORAGE_KEY);
  if (!raw) return EMPTY_EXAM_HINTS;

  try {
    return JSON.parse(raw) as ExamHintsMap;
  } catch {
    return EMPTY_EXAM_HINTS;
  }
}

export function writeExamHints(examHints: ExamHintsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXAM_HINTS_STORAGE_KEY, JSON.stringify(examHints));
}

export function normalizeExamHint(
  current: ExamHint | undefined,
  patch: Partial<ExamHint>,
): ExamHint {
  const nextSummaryCoverage =
    patch.summaryCoverage !== undefined
      ? Number(patch.summaryCoverage)
      : current?.summaryCoverage ?? 30;

  return {
    workloadMode: patch.workloadMode ?? current?.workloadMode ?? "standard",
    summaryCoverage: Number.isFinite(nextSummaryCoverage)
      ? Math.min(100, Math.max(0, nextSummaryCoverage))
      : 0,
  };
}