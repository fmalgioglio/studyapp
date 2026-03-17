import { describe, expect, it } from "vitest";

import { buildPlannerOverview } from "../../src/server/services/exam-plan-engine";

describe("buildPlannerOverview", () => {
  it("prefers canonical workload signals before fallback inference", () => {
    const overview = buildPlannerOverview({
      weeklyHours: 12,
      subjectAffinity: null,
      now: new Date("2026-03-17T10:00:00.000Z"),
      exams: [
        {
          id: "exam-1",
          title: "Biochemistry",
          examDate: "2026-04-10T09:00:00.000Z",
          workloadReadiness: "known",
          materialType: "book",
          workloadPayload: {
            totalPages: 420,
          },
          subject: {
            id: "subject-1",
            name: "Biology",
          },
          planState: null,
          studyLogs: [],
        },
      ],
    });

    expect(overview.examRecommendations[0]?.scopeSource).toBe("verified_workload");
    expect(overview.examRecommendations[0]?.totalScopePages).toBe(420);
  });

  it("falls back conservatively when explicit workload is missing", () => {
    const overview = buildPlannerOverview({
      weeklyHours: 8,
      subjectAffinity: null,
      now: new Date("2026-03-17T10:00:00.000Z"),
      exams: [
        {
          id: "exam-2",
          title: "Modern History",
          examDate: "2026-04-10T09:00:00.000Z",
          workloadReadiness: "unknown",
          materialType: null,
          workloadPayload: null,
          subject: {
            id: "subject-2",
            name: "History",
          },
          planState: null,
          studyLogs: [],
        },
      ],
    });

    expect(overview.examRecommendations[0]?.scopeSource).toBe("fallback_inference");
    expect(overview.examRecommendations[0]?.confidence).toBe("low");
    expect(overview.examRecommendations[0]?.totalScopePages).toBeGreaterThan(100);
  });

  it("changes recommendation explanation and effort when affinity says the subject is harder", () => {
    const baseline = buildPlannerOverview({
      weeklyHours: 10,
      subjectAffinity: null,
      now: new Date("2026-03-17T10:00:00.000Z"),
      exams: [
        {
          id: "exam-3",
          title: "Algorithms",
          examDate: "2026-04-02T09:00:00.000Z",
          workloadReadiness: "known",
          materialType: "book",
          workloadPayload: {
            totalPages: 260,
          },
          subject: {
            id: "subject-3",
            name: "Computer Science",
          },
          planState: null,
          studyLogs: [],
        },
      ],
    });

    const effort = buildPlannerOverview({
      weeklyHours: 10,
      subjectAffinity: {
        easiestSubjects: [],
        effortSubjects: ["Computer Science"],
      },
      now: new Date("2026-03-17T10:00:00.000Z"),
      exams: [
        {
          id: "exam-3",
          title: "Algorithms",
          examDate: "2026-04-02T09:00:00.000Z",
          workloadReadiness: "known",
          materialType: "book",
          workloadPayload: {
            totalPages: 260,
          },
          subject: {
            id: "subject-3",
            name: "Computer Science",
          },
          planState: null,
          studyLogs: [],
        },
      ],
    });

    expect(effort.examRecommendations[0]?.affinityImpact.adjustment).toBe("effort");
    expect(effort.examRecommendations[0]?.dailyTargetMinutes).toBeGreaterThanOrEqual(
      baseline.examRecommendations[0]?.dailyTargetMinutes ?? 0,
    );
    expect(
      effort.examRecommendations[0]?.affinityImpact.explanation?.toLowerCase(),
    ).toContain("extra");
  });
});
