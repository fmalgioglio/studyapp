import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError } from "@/server/http/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get("key")?.trim();
  if (!fileKey) {
    return apiError("File key is required", 400);
  }

  const material = await prisma.studyMaterial.findFirst({
    where: {
      studentId: session.uid,
      fileKey,
    },
    select: {
      fileContent: true,
      fileMimeType: true,
      fileName: true,
    },
  });

  if (!material?.fileContent) {
    return apiError("File not found", 404);
  }

  return new Response(material.fileContent, {
    status: 200,
    headers: {
      "Content-Type": material.fileMimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${material.fileName ?? "material"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
