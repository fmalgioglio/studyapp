import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const findFirstMock = vi.fn();
const upsertMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/server/auth/require-session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    exam: {
      findFirst: findFirstMock,
    },
    examPlanState: {
      upsert: upsertMock,
      update: updateMock,
    },
    student: {
      findUnique: findUniqueMock,
    },
  },
}));

describe("PATCH /api/exam-plans", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists exam preferences and returns the refreshed recommendation", async () => {
    requireSessionMock.mockResolvedValue({
      uid: "student-1",
      email: "student@example.com",
      exp: 9999999999,
    });

    findFirstMock.mockResolvedValue({ id: "exam-1" });
    upsertMock.mockResolvedValue({ id: "plan-1" });
    updateMock.mockResolvedValue({ id: "plan-1" });
    findUniqueMock.mockResolvedValue({
      weeklyHours: 14,
      subjectAffinity: {
        easiestSubjects: [],
        effortSubjects: ["Physics"],
      },
      exams: [
        {
          id: "exam-1",
          title: "Physics I",
          examDate: new Date("2026-04-02T09:00:00.000Z"),
          workloadReadiness: "known",
          materialType: "slides",
          workloadPayload: { totalPages: 280 },
          subject: {
            id: "subject-1",
            name: "Physics",
          },
          planState: {
            intensityPreference: "stronger",
            summaryPreferencePct: 40,
            paceLocked: true,
            lastRecommendationSnapshot: null,
            lastGeneratedAt: null,
          },
          studyLogs: [],
        },
      ],
    });

    const { PATCH } = await import("../../../src/app/api/exam-plans/route");
    const request = new Request("http://localhost/api/exam-plans?examId=exam-1", {
      method: "PATCH",
      body: JSON.stringify({
        intensityPreference: "stronger",
        summaryPreferencePct: 40,
        paceLocked: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { examId: "exam-1" },
      }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { examId: "exam-1" },
        data: expect.objectContaining({
          lastRecommendationSnapshot: expect.any(Object),
        }),
      }),
    );
    expect(body.data).toEqual(
      expect.objectContaining({
        examId: "exam-1",
        examTitle: "Physics I",
        intensityPreference: "stronger",
        summaryPreferencePct: 40,
        paceLocked: true,
      }),
    );
  });

  it("returns 400 when examId is missing", async () => {
    requireSessionMock.mockResolvedValue({
      uid: "student-1",
      email: "student@example.com",
      exp: 9999999999,
    });

    const { PATCH } = await import("../../../src/app/api/exam-plans/route");
    const request = new Request("http://localhost/api/exam-plans", {
      method: "PATCH",
      body: JSON.stringify({
        intensityPreference: "balanced",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("examId is required");
  });
});
