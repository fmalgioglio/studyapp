import { z } from "zod";
import {
  EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS,
  EXAM_WORKLOAD_MATERIAL_SHAPES,
} from "../../lib/exam-workload-contract";
import {
  ASSESSMENT_TYPES,
  EXAM_STATUSES,
  STUDY_TARGET_IMPORTANCE,
} from "@/lib/study-domain";

export const examWorkloadReadinessSchema = z.enum(["known", "unknown"]);
export const examMaterialTypeSchema = z.enum(["book", "notes", "mixed"]);
export const assessmentTypeSchema = z.enum(ASSESSMENT_TYPES);
export const examStatusSchema = z.enum(EXAM_STATUSES);
export const studyTargetImportanceSchema = z.enum(STUDY_TARGET_IMPORTANCE);

export const examWorkloadPayloadSchema = z
  .object({
    totalPages: z.number().int().min(1).max(20_000).optional(),
    bookTitle: z.string().trim().min(1).max(180).optional(),
    bookCoverageMode: z.enum(["page_range"]).optional(),
    bookPageStart: z.number().int().min(1).max(20_000).optional(),
    bookPageEnd: z.number().int().min(1).max(20_000).optional(),
    notesSummary: z.string().trim().min(1).max(1_000).optional(),
    materialDetails: z.string().trim().min(1).max(2_000).optional(),
    verifiedPageCount: z.number().int().min(1).max(20_000).optional(),
    bookSource: z
      .enum(["google_books", "open_library", "local_catalog"])
      .optional(),
    matchConfidenceScore: z.number().min(0).max(1).optional(),
    bookAuthors: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
    inferredSubject: z.string().trim().min(1).max(80).optional(),
    materialShape: z.enum(EXAM_WORKLOAD_MATERIAL_SHAPES).optional(),
    approximateScopeValue: z.number().int().min(1).max(20_000).optional(),
    approximateScopeUnit: z
      .enum(EXAM_WORKLOAD_APPROXIMATE_SCOPE_UNITS)
      .optional(),
    isApproximate: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasStart = typeof value.bookPageStart === "number";
    const hasEnd = typeof value.bookPageEnd === "number";
    const hasPartialRange = hasStart || hasEnd;

    if (value.bookCoverageMode === "page_range") {
      if (!hasStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bookPageStart"],
          message: "bookPageStart is required when bookCoverageMode is page_range",
        });
      }
      if (!hasEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bookPageEnd"],
          message: "bookPageEnd is required when bookCoverageMode is page_range",
        });
      }
    }

    if (hasPartialRange && value.bookCoverageMode !== "page_range") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookCoverageMode"],
        message: "bookCoverageMode must be page_range when partial book pages are set",
      });
    }

    if (hasStart && hasEnd && value.bookPageEnd! < value.bookPageStart!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookPageEnd"],
        message: "bookPageEnd must be greater than or equal to bookPageStart",
      });
    }

    const hasApproximateScopeValue =
      typeof value.approximateScopeValue === "number";
    const hasApproximateScopeUnit = Boolean(value.approximateScopeUnit);
    if (hasApproximateScopeValue && !hasApproximateScopeUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approximateScopeUnit"],
        message:
          "approximateScopeUnit is required when approximateScopeValue is provided",
      });
    }

    if (hasApproximateScopeUnit && !hasApproximateScopeValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approximateScopeValue"],
        message:
          "approximateScopeValue is required when approximateScopeUnit is provided",
      });
    }
  })
  .optional();

export const createExamSchema = z.object({
  subjectId: z.string().min(1, "subjectId is required"),
  title: z.string().trim().min(2, "title must be at least 2 characters"),
  examDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
      message: "examDate must be a valid date string",
    }),
  assessmentType: assessmentTypeSchema.optional(),
  status: examStatusSchema.optional(),
  importance: studyTargetImportanceSchema.optional(),
  targetGrade: z.string().trim().max(20).optional(),
  workloadReadiness: examWorkloadReadinessSchema.optional(),
  materialType: examMaterialTypeSchema.optional(),
  workloadPayload: examWorkloadPayloadSchema,
}).superRefine((value, ctx) => {
  if (value.assessmentType !== "SELF_STUDY" && !value.examDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["examDate"],
      message: "examDate is required unless the target is self study",
    });
  }
});

export const updateExamSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  examDate: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "examDate must be a valid date string",
    })
    .nullable()
    .optional(),
  assessmentType: assessmentTypeSchema.optional(),
  status: examStatusSchema.optional(),
  importance: studyTargetImportanceSchema.optional(),
  targetGrade: z.string().trim().max(20).nullable().optional(),
  workloadReadiness: examWorkloadReadinessSchema.nullable().optional(),
  materialType: examMaterialTypeSchema.nullable().optional(),
  workloadPayload: examWorkloadPayloadSchema.nullable().optional(),
});
