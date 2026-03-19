import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const examFindFirstMock = vi.fn();
const materialCreateMock = vi.fn();
const materialFindFirstMock = vi.fn();
const materialUpdateMock = vi.fn();
const inspectPublicMaterialLinkMock = vi.fn();
const isSupportedMaterialLinkMock = vi.fn();

vi.mock("@/server/auth/require-session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    exam: {
      findFirst: examFindFirstMock,
    },
    studyMaterial: {
      create: materialCreateMock,
      findFirst: materialFindFirstMock,
      update: materialUpdateMock,
    },
  },
}));

vi.mock("@/server/services/material-link-inspector", () => ({
  inspectPublicMaterialLink: inspectPublicMaterialLinkMock,
  isSupportedMaterialLink: isSupportedMaterialLinkMock,
}));

describe("/api/materials", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-public linked materials", async () => {
    requireSessionMock.mockResolvedValue({
      uid: "student-1",
      email: "student@example.com",
      exp: 9999999999,
    });
    examFindFirstMock.mockResolvedValue({ id: "exam-1", subjectId: "subject-1" });
    isSupportedMaterialLinkMock.mockReturnValue(false);

    const { POST } = await import("../../../src/app/api/materials/route");
    const request = new Request("http://localhost/api/materials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examId: "exam-1",
        type: "COURSE_LINK",
        origin: "USER_LINK",
        title: "Private slides",
        url: "http://localhost/private.pdf",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Only public http/https links are supported for linked materials.");
    expect(materialCreateMock).not.toHaveBeenCalled();
  });

  it("enriches public links with inspector-derived scope when missing", async () => {
    requireSessionMock.mockResolvedValue({
      uid: "student-1",
      email: "student@example.com",
      exp: 9999999999,
    });
    examFindFirstMock.mockResolvedValue({ id: "exam-1", subjectId: "subject-1" });
    isSupportedMaterialLinkMock.mockReturnValue(true);
    inspectPublicMaterialLinkMock.mockResolvedValue({
      extractionSummary: "Estimated from linked material preview.",
      scopeHints: ["about 42 pages in scope"],
      estimatedScopePages: 42,
    });
    materialCreateMock.mockResolvedValue({
      id: "material-1",
      studentId: "student-1",
      subjectId: "subject-1",
      examId: "exam-1",
      type: "COURSE_LINK",
      origin: "USER_LINK",
      title: "Official handout",
      url: "https://example.edu/handout.html",
      fileKey: null,
      fileName: null,
      fileMimeType: null,
      fileSizeBytes: null,
      licenseHint: null,
      availabilityHint: "Estimated from linked material preview.",
      verificationLevel: "USER_PROVIDED",
      estimatedScopePages: 42,
      notes: "Estimated from linked material preview. | about 42 pages in scope",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: {
        id: "subject-1",
        name: "History",
      },
      exam: {
        id: "exam-1",
        title: "Official handout",
      },
    });

    const { POST } = await import("../../../src/app/api/materials/route");
    const request = new Request("http://localhost/api/materials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examId: "exam-1",
        type: "COURSE_LINK",
        origin: "USER_LINK",
        title: "Official handout",
        url: "https://example.edu/handout.html",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(inspectPublicMaterialLinkMock).toHaveBeenCalledWith({
      url: "https://example.edu/handout.html",
      titleHint: "Official handout",
    });
    expect(materialCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estimatedScopePages: 42,
          availabilityHint: "Estimated from linked material preview.",
          notes: "Estimated from linked material preview. | about 42 pages in scope",
        }),
      }),
    );
    expect(body.data).toEqual(
      expect.objectContaining({
        id: "material-1",
        estimatedScopePages: 42,
      }),
    );
  });
});
