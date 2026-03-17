import { z } from "zod";
import {
  EDUCATION_LEVELS,
  SCHOOL_PROFILES,
} from "@/lib/study-domain";

export const SUBJECT_AFFINITY_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Literature",
  "English",
  "Law",
  "Economics",
  "Computer Science",
  "Philosophy",
  "Art / Design",
] as const;

const affinitySubjectSchema = z.enum(SUBJECT_AFFINITY_OPTIONS);

export const subjectAffinitySchema = z.object({
  easiestSubjects: z.array(affinitySubjectSchema).max(3).default([]),
  effortSubjects: z.array(affinitySubjectSchema).max(3).default([]),
});

export const createStudentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "fullName must be at least 2 characters")
    .optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  educationLevel: z.enum(EDUCATION_LEVELS).optional(),
  schoolProfile: z.enum(SCHOOL_PROFILES).optional(),
  subjectAffinity: subjectAffinitySchema.optional(),
});

export type SubjectAffinityInput = z.infer<typeof subjectAffinitySchema>;
