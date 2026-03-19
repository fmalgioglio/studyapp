import { describe, expect, it } from "vitest";

import {
  classifyMaterialLink,
  inspectPublicMaterialLink,
  isSupportedMaterialLink,
} from "@/server/services/material-link-inspector";

describe("material-link-inspector", () => {
  it("classifies PDF and HTML links", () => {
    expect(classifyMaterialLink("https://example.com/notes.pdf")).toBe("pdf");
    expect(classifyMaterialLink("https://example.com/lesson.html")).toBe("html");
    expect(classifyMaterialLink("https://example.com/lesson")).toBe("unknown");
  });

  it("rejects local or private links", () => {
    expect(isSupportedMaterialLink("http://localhost/internal.pdf")).toBe(false);
    expect(isSupportedMaterialLink("https://192.168.0.10/notes.pdf")).toBe(false);
  });

  it("blocks private links during extraction", async () => {
    const analysis = await inspectPublicMaterialLink({
      url: "http://localhost/internal.pdf",
      subjectHint: "physics",
    });

    expect(analysis.status).toBe("blocked");
    expect(analysis.notes[0]).toContain("public http/https");
  });

  it("extracts lightweight metadata from a public HTML page", async () => {
    const analysis = await inspectPublicMaterialLink(
      {
        url: "https://example.com/course/notes",
        subjectHint: "history",
        titleHint: "Manual notes",
      },
      async () =>
        new Response(
          "<html><head><title>History revision pack</title><meta name='description' content='Short official notes for revision'></head><body><h1>History revision pack</h1><p>One two three four five six seven eight nine ten.</p></body></html>",
          {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "content-length": "240",
            },
          },
        ),
    );

    expect(analysis.status).toBe("supported");
    expect(analysis.kind).toBe("html");
    expect(analysis.title).toBe("History revision pack");
    expect(analysis.estimatedScopePages).toBeGreaterThan(0);
  });
});
