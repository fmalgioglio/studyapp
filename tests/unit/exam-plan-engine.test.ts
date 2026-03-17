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

  it("uses linked materials for self-study targets when explicit workload is missing", () => {
    const overview = buildPlannerOverview({
      weeklyHours: 6,
      subjectAffinity: null,
      now: new Date("2026-03-17T10:00:00.000Z"),
      exams: [
        {
          id: "exam-4",
          title: "Spanish conversation",
          examDate: "2026-06-01T09:00:00.000Z",
          assessmentType: "SELF_STUDY",
          status: "ACTIVE",
          importance: "MEDIUM",
          workloadReadiness: "unknown",
          materialType: "notes",
          workloadPayload: null,
          subject: {
            id: "subject-4",
            name: "Spanish",
          },
          planState: null,
          studyLogs: [],
          studyMaterials: [
            {
              id: "material-1",
              studentId: "student-1",
              examId: "exam-4",
              subjectId: "subject-4",
              type: "OPEN_RESOURCE",
              origin: "OPEN_VERIFIED",
              title: "Open speaking drills",
              verificationLevel: "OFFICIAL",
              estimatedScopePages: 48,
            },
          ],
        },
      ],
    });

    expect(overview.examRecommendations[0]?.scopeSource).toBe("linked_materials");
    expect(overview.examRecommendations[0]?.planMode).toBe("retention");
    expect(overview.examRecommendations[0]?.linkedMaterialsCount).toBe(1);
    expect(overview.examRecommendations[0]?.confidence).toBe("medium");
  });
});
