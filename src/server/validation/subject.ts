import { z } from "zod";

export const subjectQuerySchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

export const createSubjectSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  name: z.string().trim().min(2, "name must be at least 2 characters"),
  color: z.string().trim().max(20).optional(),
});
