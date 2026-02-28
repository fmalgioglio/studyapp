import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, "name must be at least 2 characters"),
  color: z.string().trim().max(20).optional(),
});
