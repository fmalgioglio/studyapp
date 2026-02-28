import { z } from "zod";

export const createExamSchema = z.object({
  subjectId: z.string().min(1, "subjectId is required"),
  title: z.string().trim().min(2, "title must be at least 2 characters"),
  examDate: z
    .string()
    .trim()
    .min(1, "examDate is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "examDate must be a valid date string",
    }),
  targetGrade: z.string().trim().max(20).optional(),
});
