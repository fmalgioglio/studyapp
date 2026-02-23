import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

const createStudentSchema = z.object({
  email: z.email("Valid email is required").transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(2, "fullName must be at least 2 characters").optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const student = await prisma.student.upsert({
      where: { email: parsed.data.email },
      create: {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours ?? 10,
      },
      update: {
        fullName: parsed.data.fullName,
        weeklyHours: parsed.data.weeklyHours,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        weeklyHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: student }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "A student with this email already exists.",
        },
        { status: 409 },
      );
    }

    const details =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      {
        error: "Failed to create student",
        details,
      },
      { status: 500 },
    );
  }
}
