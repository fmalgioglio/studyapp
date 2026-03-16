import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  SUBJECT_AFFINITY_OPTIONS,
  createStudentSchema,
  type SubjectAffinityInput,
} from "@/server/validation/student";

const AFFINITY_LIMIT = 3;
const SUBJECT_AFFINITY_SET = new Set<string>(SUBJECT_AFFINITY_OPTIONS);

function normalizeSubjectList(values: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const entry of values) {
    if (!SUBJECT_AFFINITY_SET.has(entry)) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    normalized.push(entry);
    if (normalized.length >= AFFINITY_LIMIT) break;
  }

  return normalized;
}

function normalizeSubjectAffinity(value: SubjectAffinityInput | undefined) {
  if (!value) return undefined;
  const easiestSubjects = normalizeSubjectList(value.easiestSubjects);
  const easiestSet = new Set(easiestSubjects);
  const effortSubjects = normalizeSubjectList(value.effortSubjects).filter(
    (subject) => !easiestSet.has(subject),
  );
  return {
    easiestSubjects,
    effortSubjects,
  };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createStudentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const normalizedAffinity = normalizeSubjectAffinity(parsed.data.subjectAffinity);

    const student = await prisma.student.upsert({
      where: { email: session.email },
      create: {
        email: session.email,
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours ?? 10,
        subjectAffinity: normalizedAffinity ?? Prisma.JsonNull,
      },
      update: {
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours,
        subjectAffinity:
          normalizedAffinity === undefined ? undefined : normalizedAffinity,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        subjectAffinity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(student);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A student with this email already exists.", 409);
    }

    return apiError("Failed to create student", 500, getErrorDetails(error));
  }
}
