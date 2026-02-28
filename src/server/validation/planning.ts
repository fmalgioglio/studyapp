import { z } from "zod";

const calibrationSessionSchema = z.object({
  minutes: z.number().int().min(10).max(600),
  pagesCompleted: z.number().min(0.5).max(300),
  retentionScore: z.number().min(0).max(100).optional(),
});

export const estimatePlanningSchema = z.object({
  bookTitle: z.string().trim().min(2),
  subject: z.string().trim().min(2).optional(),
  examDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "examDate must be a valid date string",
  }),
  paceProfile: z.enum(["conservative", "balanced", "fast"]).optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  knownPages: z.number().int().min(1).max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  calibrationSessions: z.array(calibrationSessionSchema).max(30).optional(),
});
