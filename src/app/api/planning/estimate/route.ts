import { requireSession } from "@/server/auth/require-session";
import { prisma } from "@/server/db/client";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import { estimateStudyPlan } from "@/server/services/planning-estimator";
import { estimatePlanningSchema } from "@/server/validation/planning";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const parsed = estimatePlanningSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(
      "Invalid payload",
      400,
      undefined,
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: session.uid },
      select: { weeklyHours: true },
    });

    if (!student) {
      return apiError("Unauthorized", 401);
    }

    const estimate = estimateStudyPlan({
      ...parsed.data,
      weeklyHours: parsed.data.weeklyHours ?? student.weeklyHours,
    });
    return apiSuccess(estimate);
  } catch (error) {
    return apiError("Failed to run estimate", 500, getErrorDetails(error));
  }
}
