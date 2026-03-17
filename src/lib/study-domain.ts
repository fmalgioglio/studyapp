export const ASSESSMENT_TYPES = [
  "EXAM",
  "TEST",
  "ORAL",
  "SELF_STUDY",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const EXAM_STATUSES = [
  "ACTIVE",
  "POSTPONED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const STUDY_TARGET_IMPORTANCE = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

export type StudyTargetImportance = (typeof STUDY_TARGET_IMPORTANCE)[number];

export const EDUCATION_LEVELS = [
  "HIGH_SCHOOL",
  "UNIVERSITY",
  "INDEPENDENT",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const SCHOOL_PROFILES = [
  "LICEO",
  "TECHNICAL",
  "PROFESSIONAL",
  "UNIVERSITY",
  "SELF_STUDY",
  "OTHER",
] as const;

export type SchoolProfile = (typeof SCHOOL_PROFILES)[number];

export const STUDY_MATERIAL_TYPES = [
  "TEXTBOOK",
  "NOTES",
  "HANDOUTS",
  "COURSE_LINK",
  "PERSONAL_FILE",
  "OPEN_RESOURCE",
] as const;

export type StudyMaterialType = (typeof STUDY_MATERIAL_TYPES)[number];

export const STUDY_MATERIAL_ORIGINS = [
  "OPEN_VERIFIED",
  "OFFICIAL_SOURCE",
  "USER_LINK",
  "USER_UPLOAD",
] as const;

export type StudyMaterialOrigin = (typeof STUDY_MATERIAL_ORIGINS)[number];

export const STUDY_MATERIAL_VERIFICATION_LEVELS = [
  "VERIFIED",
  "OFFICIAL",
  "USER_PROVIDED",
  "DISCOVERED",
] as const;

export type StudyMaterialVerificationLevel =
  (typeof STUDY_MATERIAL_VERIFICATION_LEVELS)[number];

export type StudyMaterialRecord = {
  id: string;
  studentId: string;
  subjectId?: string | null;
  examId?: string | null;
  type: StudyMaterialType;
  origin: StudyMaterialOrigin;
  title: string;
  url?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  licenseHint?: string | null;
  availabilityHint?: string | null;
  verificationLevel: StudyMaterialVerificationLevel;
  estimatedScopePages?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subject?: {
    id: string;
    name: string;
  } | null;
  exam?: {
    id: string;
    title: string;
  } | null;
};

export type MaterialSearchResult = {
  id: string;
  title: string;
  url?: string | null;
  sourceLabel: string;
  origin: StudyMaterialOrigin;
  verificationLevel: StudyMaterialVerificationLevel;
  licenseHint?: string | null;
  availabilityHint?: string | null;
  estimatedScopePages?: number | null;
  authors?: string[];
  thumbnailUrl?: string | null;
  categories?: string[];
  inferredSubject?: string | null;
  previewOnly?: boolean;
};
