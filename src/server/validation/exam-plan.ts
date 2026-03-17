import { z } from "zod";

export const examPlanIntensityPreferenceSchema = z.enum([
  "lighter",
  "balanced",
  "stronger",
]);

export const updateExamPlanSchema = z
  .object({
    intensityPreference: examPlanIntensityPreferenceSchema.optional(),
    summaryPreferencePct: z.number().int().min(0).max(100).optional(),
    paceLocked: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one exam plan field is required",
  });

export const createExamStudyLogSchema = z.object({
  examId: z.string().trim().min(1, "examId is required"),
  minutesSpent: z.number().int().min(1).max(720),
  pagesCompleted: z.number().int().min(0).max(20_000).optional(),
  topic: z.string().trim().max(240).optional(),
  completedAt: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "completedAt must be a valid ISO date",
    })
    .optional(),
});
