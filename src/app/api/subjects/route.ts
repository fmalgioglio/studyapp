import { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/server/auth/require-session";
import { isLocalDevSession } from "@/server/auth/local-dev";
import {
  createLocalDevSubject,
  deleteLocalDevSubject,
  getLocalDevSubjectDeletePreview,
  listLocalDevSubjects,
} from "@/server/auth/local-dev-store";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { createSubjectSchema } from "@/server/validation/subject";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  if (isLocalDevSession(session)) {
    return apiSuccess(listLocalDevSubjects(session.email));
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { studentId: session.uid },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(subjects);
  } catch (error) {
    if (isLocalDevSession(session)) {
      return apiSuccess([]);
    }
    return apiError("Failed to load subjects", 500, getErrorDetails(error));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = createSubjectSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  if (isLocalDevSession(session)) {
    const result = createLocalDevSubject(session.email, {
      name: parsed.data.name,
      color: parsed.data.color,
    });
    if (result.duplicate) {
      return apiError("A subject with this name already exists for the student.", 409);
    }
    return apiSuccess(result.subject, 201);
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        studentId: session.uid,
        name: parsed.data.name,
        color: parsed.data.color,
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(subject, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A subject with this name already exists for the student.", 409);
    }

    return apiError("Failed to create subject", 500, getErrorDetails(error));
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const confirmCascadeValue = searchParams.get("confirmCascade");

  if (!id) {
    return apiError("Missing required query parameter: id", 400);
  }

  if (
    confirmCascadeValue !== null &&
    confirmCascadeValue !== "true" &&
    confirmCascadeValue !== "false"
  ) {
    return apiError("Invalid query parameter: confirmCascade", 400);
  }

  const confirmCascade = confirmCascadeValue === "true";

  if (isLocalDevSession(session)) {
    const localPreview = getLocalDevSubjectDeletePreview(session.email, id);
    if (!localPreview) {
      return apiError("Subject not found", 404);
    }

    if (localPreview.relationCounts.exams > 0 && !confirmCascade) {
      return apiError("Subject has linked data", 409, {
        id: localPreview.id,
        relationCounts: localPreview.relationCounts,
        requiresConfirmCascade: true,
      });
    }

    return apiSuccess(deleteLocalDevSubject(session.email, id));
  }

  try {
    const subject = await prisma.subject.findFirst({
      where: {
        id,
        studentId: session.uid,
      },
      select: {
        id: true,
        _count: {
          select: {
            exams: true,
            sources: true,
            studySessions: true,
          },
        },
      },
    });

    if (!subject) {
      return apiError("Subject not found", 404);
    }

    const relationCounts = {
      exams: subject._count.exams,
      sources: subject._count.sources,
      studySessions: subject._count.studySessions,
    };
    const linkedRecordsTotal =
      relationCounts.exams + relationCounts.sources + relationCounts.studySessions;

    if (linkedRecordsTotal > 0 && !confirmCascade) {
      return apiError("Subject has linked data", 409, {
        id: subject.id,
        relationCounts,
        requiresConfirmCascade: true,
      });
    }

    await prisma.subject.delete({ where: { id: subject.id } });

    return apiSuccess({
      id: subject.id,
      relationCounts,
    });
  } catch (error) {
    return apiError("Failed to delete subject", 500, getErrorDetails(error));
  }
}
