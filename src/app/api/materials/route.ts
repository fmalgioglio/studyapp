import { randomUUID } from "node:crypto";

import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  enrichMaterialFromLink,
  isSupportedMaterialLink,
} from "@/server/services/material-link-inspector";
import {
  createStudyMaterialSchema,
  updateStudyMaterialSchema,
} from "@/server/validation/material";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5_000_000;

type LinkedMaterialEnrichment =
  | {
      estimatedScopePages: number | null | undefined;
      availabilityHint: string | null | undefined;
      notes: string | null | undefined;
      verificationLevel:
        | "VERIFIED"
        | "OFFICIAL"
        | "USER_PROVIDED"
        | "DISCOVERED"
        | null
        | undefined;
    }
  | {
      error: string;
    };

function buildFileKey(materialId: string, fileName: string) {
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `material-${materialId}-${safeName || "upload"}`;
}

async function readOwnedExam(studentId: string, examId?: string | null) {
  if (!examId) return null;
  return prisma.exam.findFirst({
    where: {
      id: examId,
      studentId,
    },
    select: {
      id: true,
      subjectId: true,
    },
  });
}

async function enrichLinkedMaterial(input: {
  origin: string;
  url?: string | null;
  title: string;
  estimatedScopePages?: number | null;
  availabilityHint?: string | null;
  notes?: string | null;
  verificationLevel?:
    | "VERIFIED"
    | "OFFICIAL"
    | "USER_PROVIDED"
    | "DISCOVERED"
    | null;
}): Promise<LinkedMaterialEnrichment> {
  if (!input.url || input.origin === "USER_UPLOAD") {
    return {
      estimatedScopePages: input.estimatedScopePages ?? null,
      availabilityHint: input.availabilityHint ?? null,
      notes: input.notes ?? null,
      verificationLevel: input.verificationLevel ?? null,
    };
  }

  if (!isSupportedMaterialLink(input.url)) {
    return {
      error: "Only public http/https links are supported for linked materials.",
    } as const;
  }

  try {
    return await enrichMaterialFromLink({
      title: input.title,
      url: input.url,
      origin: input.origin as "OPEN_VERIFIED" | "OFFICIAL_SOURCE" | "USER_LINK",
      estimatedScopePages: input.estimatedScopePages ?? null,
      availabilityHint: input.availabilityHint ?? null,
      notes: input.notes ?? null,
      verificationLevel: input.verificationLevel ?? null,
    });
  } catch {
    return {
      estimatedScopePages: input.estimatedScopePages ?? null,
      availabilityHint: input.availabilityHint ?? null,
      notes: input.notes ?? null,
      verificationLevel: input.verificationLevel ?? null,
    };
  }
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId")?.trim() ?? undefined;
  const subjectId = searchParams.get("subjectId")?.trim() ?? undefined;

  try {
    const items = await prisma.studyMaterial.findMany({
      where: {
        studentId: session.uid,
        ...(examId ? { examId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        examId: true,
        type: true,
        origin: true,
        title: true,
        url: true,
        fileKey: true,
        fileName: true,
        fileMimeType: true,
        fileSizeBytes: true,
        licenseHint: true,
        availabilityHint: true,
        verificationLevel: true,
        estimatedScopePages: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return apiSuccess(items);
  } catch (error) {
    return apiError("Failed to load materials", 500, getErrorDetails(error));
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return apiError("Upload file is required", 400);
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return apiError("File is too large", 400);
      }

      const examId = formData.get("examId");
      const subjectId = formData.get("subjectId");
      const title =
        (formData.get("title")?.toString().trim() || file.name || "Personal file");
      const notes = formData.get("notes")?.toString().trim() || null;
      const estimatedScopePagesRaw = formData.get("estimatedScopePages")?.toString().trim();
      const estimatedScopePages = estimatedScopePagesRaw
        ? Number(estimatedScopePagesRaw)
        : null;
      const linkedExam = await readOwnedExam(
        session.uid,
        examId?.toString().trim() || null,
      );

      const materialId = randomUUID();
      const fileKey = buildFileKey(materialId, file.name);
      const bytes = Buffer.from(await file.arrayBuffer());

      const item = await prisma.studyMaterial.create({
        data: {
          id: materialId,
          studentId: session.uid,
          subjectId:
            subjectId?.toString().trim() ||
            linkedExam?.subjectId ||
            null,
          examId: linkedExam?.id ?? null,
          type: "PERSONAL_FILE",
          origin: "USER_UPLOAD",
          title,
          fileKey,
          fileName: file.name,
          fileMimeType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
          fileContent: bytes,
          verificationLevel: "USER_PROVIDED",
          estimatedScopePages:
            typeof estimatedScopePages === "number" && Number.isFinite(estimatedScopePages)
              ? Math.max(1, Math.round(estimatedScopePages))
              : null,
          notes,
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          examId: true,
          type: true,
          origin: true,
          title: true,
          url: true,
          fileKey: true,
          fileName: true,
          fileMimeType: true,
          fileSizeBytes: true,
          licenseHint: true,
          availabilityHint: true,
          verificationLevel: true,
          estimatedScopePages: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          exam: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return apiSuccess(item, 201);
    }

    const parsed = createStudyMaterialSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError(
        "Invalid payload",
        400,
        undefined,
        parsed.error.flatten().fieldErrors,
      );
    }

    const linkedExam = await readOwnedExam(session.uid, parsed.data.examId ?? null);
    const enriched = await enrichLinkedMaterial({
      origin: parsed.data.origin,
      url: parsed.data.url ?? null,
      title: parsed.data.title,
      estimatedScopePages: parsed.data.estimatedScopePages ?? null,
      availabilityHint: parsed.data.availabilityHint ?? null,
      notes: parsed.data.notes ?? null,
      verificationLevel: parsed.data.verificationLevel ?? null,
    });

    if ("error" in enriched) {
      return apiError(enriched.error, 400);
    }

    const item = await prisma.studyMaterial.create({
      data: {
        studentId: session.uid,
        subjectId: parsed.data.subjectId ?? linkedExam?.subjectId ?? null,
        examId: linkedExam?.id ?? null,
        type: parsed.data.type,
        origin: parsed.data.origin,
        title: parsed.data.title,
        url: parsed.data.url ?? null,
        fileName: parsed.data.fileName ?? null,
        fileMimeType: parsed.data.fileMimeType ?? null,
        fileSizeBytes: parsed.data.fileSizeBytes ?? null,
        licenseHint: parsed.data.licenseHint ?? null,
        availabilityHint: enriched.availabilityHint,
        verificationLevel:
          enriched.verificationLevel ??
          parsed.data.verificationLevel ??
          (parsed.data.origin === "OPEN_VERIFIED"
            ? "OFFICIAL"
            : parsed.data.origin === "OFFICIAL_SOURCE"
              ? "OFFICIAL"
              : "USER_PROVIDED"),
        estimatedScopePages: enriched.estimatedScopePages,
        notes: enriched.notes,
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        examId: true,
        type: true,
        origin: true,
        title: true,
        url: true,
        fileKey: true,
        fileName: true,
        fileMimeType: true,
        fileSizeBytes: true,
        licenseHint: true,
        availabilityHint: true,
        verificationLevel: true,
        estimatedScopePages: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return apiSuccess(item, 201);
  } catch (error) {
    return apiError("Failed to create material", 500, getErrorDetails(error));
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const materialId = url.searchParams.get("id")?.trim();
  if (!materialId) {
    return apiError("Material id is required", 400);
  }

  const parsed = updateStudyMaterialSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const existing = await prisma.studyMaterial.findFirst({
      where: {
        id: materialId,
        studentId: session.uid,
      },
      select: {
        id: true,
        origin: true,
        url: true,
        title: true,
        notes: true,
        availabilityHint: true,
        verificationLevel: true,
        estimatedScopePages: true,
      },
    });

    if (!existing) {
      return apiError("Material not found", 404);
    }

    const linkedExam = await readOwnedExam(session.uid, parsed.data.examId ?? null);
    const enriched = await enrichLinkedMaterial({
      origin: parsed.data.origin ?? existing.origin,
      url: parsed.data.url ?? existing.url ?? null,
      title: parsed.data.title ?? existing.title,
      estimatedScopePages:
        parsed.data.estimatedScopePages === undefined
          ? existing.estimatedScopePages
          : parsed.data.estimatedScopePages ?? null,
      availabilityHint:
        parsed.data.availabilityHint === undefined
          ? existing.availabilityHint
          : parsed.data.availabilityHint ?? null,
      notes: parsed.data.notes === undefined ? existing.notes : parsed.data.notes ?? null,
      verificationLevel:
        parsed.data.verificationLevel === undefined
          ? existing.verificationLevel
          : parsed.data.verificationLevel ?? null,
    });

    if ("error" in enriched) {
      return apiError(enriched.error, 400);
    }

    const item = await prisma.studyMaterial.update({
      where: { id: materialId },
      data: {
        subjectId:
          parsed.data.subjectId === undefined
            ? undefined
            : parsed.data.subjectId ?? linkedExam?.subjectId ?? null,
        examId:
          parsed.data.examId === undefined
            ? undefined
            : linkedExam?.id ?? null,
        type: parsed.data.type,
        origin: parsed.data.origin,
        title: parsed.data.title,
        url:
          parsed.data.url === undefined
            ? undefined
            : parsed.data.url ?? null,
        licenseHint:
          parsed.data.licenseHint === undefined
            ? undefined
            : parsed.data.licenseHint ?? null,
        availabilityHint: enriched.availabilityHint,
        verificationLevel: enriched.verificationLevel ?? existing.verificationLevel,
        estimatedScopePages: enriched.estimatedScopePages,
        notes: enriched.notes,
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        examId: true,
        type: true,
        origin: true,
        title: true,
        url: true,
        fileKey: true,
        fileName: true,
        fileMimeType: true,
        fileSizeBytes: true,
        licenseHint: true,
        availabilityHint: true,
        verificationLevel: true,
        estimatedScopePages: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return apiSuccess(item);
  } catch (error) {
    return apiError("Failed to update material", 500, getErrorDetails(error));
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const materialId = url.searchParams.get("id")?.trim();
  if (!materialId) {
    return apiError("Material id is required", 400);
  }

  try {
    const existing = await prisma.studyMaterial.findFirst({
      where: {
        id: materialId,
        studentId: session.uid,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiError("Material not found", 404);
    }

    await prisma.studyMaterial.delete({
      where: { id: materialId },
    });

    return apiSuccess({ id: materialId });
  } catch (error) {
    return apiError("Failed to delete material", 500, getErrorDetails(error));
  }
}
