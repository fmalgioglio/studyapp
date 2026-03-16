import {
  EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS,
  EXAM_WORKLOAD_MATERIAL_SHAPES,
  type ExamWorkloadApproximateScopeUnit,
  type ExamWorkloadMaterialShape,
} from "../../lib/exam-workload-contract";

export type ExamWorkloadPayloadInput = {
  totalPages?: number;
  bookTitle?: string;
  bookCoverageMode?: "page_range";
  bookPageStart?: number;
  bookPageEnd?: number;
  notesSummary?: string;
  materialDetails?: string;
  verifiedPageCount?: number;
  bookSource?: "google_books" | "open_library" | "local_catalog";
  matchConfidenceScore?: number;
  bookAuthors?: string[];
  inferredSubject?: string;
  materialShape?: ExamWorkloadMaterialShape;
  approximateScopeValue?: number;
  approximateScopeUnit?: ExamWorkloadApproximateScopeUnit;
  isApproximate?: boolean;
};

function normalizeOptionalChoice(
  value: string | null | undefined,
  allowed: readonly string[],
) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return allowed.includes(normalized) ? normalized : null;
}

function normalizeText(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeConfidence(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const clamped = Math.max(0, Math.min(1, value));
  return Number(clamped.toFixed(2));
}

function normalizePositiveInt(value: number | undefined, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded <= 0) return undefined;
  return Math.min(rounded, max);
}

export function normalizeExamWorkloadPayload(
  payload: ExamWorkloadPayloadInput | undefined,
) {
  if (!payload) return null;

  const normalized: ExamWorkloadPayloadInput = {};
  const totalPages = normalizePositiveInt(payload.totalPages, 20_000);
  if (totalPages) {
    normalized.totalPages = totalPages;
  }

  const bookTitle = normalizeText(payload.bookTitle);
  if (bookTitle) normalized.bookTitle = bookTitle;

  const bookCoverageMode = normalizeOptionalChoice(payload.bookCoverageMode, [
    "page_range",
  ] as const);
  const bookPageStart = normalizePositiveInt(payload.bookPageStart, 20_000);
  const bookPageEnd = normalizePositiveInt(payload.bookPageEnd, 20_000);
  if (
    bookCoverageMode === "page_range" &&
    bookPageStart &&
    bookPageEnd &&
    bookPageEnd >= bookPageStart
  ) {
    normalized.bookCoverageMode = "page_range";
    normalized.bookPageStart = bookPageStart;
    normalized.bookPageEnd = bookPageEnd;
  }

  const notesSummary = normalizeText(payload.notesSummary);
  if (notesSummary) normalized.notesSummary = notesSummary;
  const materialDetails = normalizeText(payload.materialDetails);
  if (materialDetails) normalized.materialDetails = materialDetails;

  const verifiedPageCount = normalizePositiveInt(payload.verifiedPageCount, 20_000);
  if (verifiedPageCount) {
    normalized.verifiedPageCount = verifiedPageCount;
  }

  const bookSource = normalizeOptionalChoice(payload.bookSource, [
    "google_books",
    "open_library",
    "local_catalog",
  ] as const);
  if (bookSource) {
    normalized.bookSource = bookSource as ExamWorkloadPayloadInput["bookSource"];
  }

  const matchConfidenceScore = normalizeConfidence(payload.matchConfidenceScore);
  if (matchConfidenceScore !== undefined) {
    normalized.matchConfidenceScore = matchConfidenceScore;
  }

  if (Array.isArray(payload.bookAuthors)) {
    const authors = payload.bookAuthors
      .map((author) => normalizeText(author))
      .filter((author): author is string => Boolean(author))
      .slice(0, 8);
    if (authors.length > 0) {
      normalized.bookAuthors = authors;
    }
  }

  const inferredSubject = normalizeText(payload.inferredSubject);
  if (inferredSubject) {
    normalized.inferredSubject = inferredSubject;
  }

  const materialShape = normalizeOptionalChoice(
    payload.materialShape,
    EXAM_WORKLOAD_MATERIAL_SHAPES,
  );
  if (materialShape) {
    normalized.materialShape = materialShape as ExamWorkloadMaterialShape;
  }

  const approximateScopeValue = normalizePositiveInt(
    payload.approximateScopeValue,
    20_000,
  );
  const approximateScopeUnit = normalizeOptionalChoice(
    payload.approximateScopeUnit,
    EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS,
  );
  if (approximateScopeValue && approximateScopeUnit) {
    normalized.approximateScopeValue = approximateScopeValue;
    normalized.approximateScopeUnit =
      approximateScopeUnit as ExamWorkloadApproximateScopeUnit;
    normalized.isApproximate = true;
  } else if (payload.isApproximate === true) {
    normalized.isApproximate = true;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function normalizeOptionalExamWorkloadPayload(
  payload: ExamWorkloadPayloadInput | null | undefined,
) {
  if (payload === undefined) return undefined;
  if (payload === null) return null;
  return normalizeExamWorkloadPayload(payload);
}
