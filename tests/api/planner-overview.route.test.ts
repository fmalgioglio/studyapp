import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/server/auth/require-session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    student: {
      findUnique: findUniqueMock,
    },
  },
}));

describe("GET /api/planner/overview", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an exam-first overview for the authenticated student", async () => {
    requireSessionMock.mockResolvedValue({
      uid: "student-1",
      email: "student@example.com",
      exp: 9999999999,
    });

    findUniqueMock.mockResolvedValue({
      id: "student-1",
      weeklyHours: 12,
      subjectAffinity: {
        easiestSubjects: ["Biology"],
        effortSubjects: [],
      },
      exams: [
        {
          id: "exam-1",
          title: "Biochemistry",
          examDate: new Date("2026-04-10T09:00:00.000Z"),
          workloadReadiness: "known",
          materialType: "book",
          workloadPayload: { totalPages: 240 },
          subject: {
            id: "subject-1",
            name: "Biology",
          },
          planState: null,
          studyLogs: [],
        },
      ],
    });

    const { GET } = await import("../../../src/app/api/planner/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
      }),
    );
    expect(body.data.examRecommendations).toHaveLength(1);
    expect(body.data.examRecommendations[0]).toEqual(
      expect.objectContaining({
        examId: "exam-1",
        examTitle: "Biochemistry",
        scopeSource: "verified_workload",
      }),
    );
    expect(body.data.todayFocus[0]).toEqual(
      expect.objectContaining({
        examId: "exam-1",
        examTitle: "Biochemistry",
      }),
    );
  });

  it("rejects unauthenticated requests", async () => {
    requireSessionMock.mockResolvedValue(null);

    const { GET } = await import("../../../src/app/api/planner/overview/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});
