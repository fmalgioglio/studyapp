import { z } from "zod";

import {
  STUDY_MATERIAL_ORIGINS,
  STUDY_MATERIAL_TYPES,
  STUDY_MATERIAL_VERIFICATION_LEVELS,
} from "@/lib/study-domain";

export const studyMaterialTypeSchema = z.enum(STUDY_MATERIAL_TYPES);
export const studyMaterialOriginSchema = z.enum(STUDY_MATERIAL_ORIGINS);
export const studyMaterialVerificationSchema = z.enum(
  STUDY_MATERIAL_VERIFICATION_LEVELS,
);

const baseMaterialSchema = z.object({
  subjectId: z.string().trim().min(1).optional().nullable(),
  examId: z.string().trim().min(1).optional().nullable(),
  type: studyMaterialTypeSchema,
  origin: studyMaterialOriginSchema,
  title: z.string().trim().min(2).max(180),
  url: z.string().trim().url().max(500).optional().nullable(),
  licenseHint: z.string().trim().max(180).optional().nullable(),
  availabilityHint: z.string().trim().max(180).optional().nullable(),
  verificationLevel: studyMaterialVerificationSchema.optional(),
  estimatedScopePages: z.number().int().min(1).max(20_000).optional().nullable(),
  notes: z.string().trim().max(2_000).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
  fileMimeType: z.string().trim().max(120).optional().nullable(),
  fileSizeBytes: z.number().int().min(1).max(5_000_000).optional().nullable(),
});

export const createStudyMaterialSchema = baseMaterialSchema.superRefine(
  (value, ctx) => {
    if (
      (value.origin === "OPEN_VERIFIED" ||
        value.origin === "OFFICIAL_SOURCE" ||
        value.origin === "USER_LINK") &&
      !value.url
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "url is required for linked materials",
      });
    }

    if (value.origin === "USER_UPLOAD" && !value.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fileName"],
        message: "fileName is required for uploaded materials",
      });
    }

    if (!value.subjectId && !value.examId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["examId"],
        message: "Attach the material to a subject or a target",
      });
    }
  },
);

export const updateStudyMaterialSchema = baseMaterialSchema.partial();
