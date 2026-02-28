import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Valid email is required").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2).optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.email("Valid email is required").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
