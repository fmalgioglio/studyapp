import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

const studentQuerySchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
});

const createSubjectSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  name: z.string().trim().min(2, "name must be at least 2 characters"),
  color: z.string().trim().max(20).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = studentQuerySchema.safeParse({
    studentId: searchParams.get("studentId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const subjects = await prisma.subject.findMany({
    where: { studentId: parsed.data.studentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: subjects }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSubjectSchema.safeParse(body);

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
    const subject = await prisma.subject.create({
      data: {
        studentId: parsed.data.studentId,
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

    return NextResponse.json({ data: subject }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "A subject with this name already exists for the student.",
        },
        { status: 409 },
      );
    }

    const details =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      {
        error: "Failed to create subject",
        details,
      },
      { status: 500 },
    );
  }
}
