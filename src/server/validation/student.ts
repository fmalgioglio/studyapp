import { z } from "zod";

export const createStudentSchema = z.object({
  email: z.email("Valid email is required").transform((value) => value.toLowerCase()),
  fullName: z
    .string()
    .trim()
    .min(2, "fullName must be at least 2 characters")
    .optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
});
