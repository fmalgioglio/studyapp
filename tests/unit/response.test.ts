import { describe, expect, it } from "vitest";

import { getErrorDetails } from "../../src/server/http/response";

describe("getErrorDetails", () => {
  it("maps Prisma and Turbopack mismatch errors to a safe dev message", () => {
    const details = getErrorDetails(
      new Error("__TURBOPACK__ Unknown argument `educationLevel` for prisma.student.upsert"),
    );

    expect(details).toContain("Local development state is out of sync");
    expect(details).not.toContain("__TURBOPACK__");
    expect(details).not.toContain("educationLevel");
  });

  it("keeps the database bridge guidance for fetch failures", () => {
    const details = getErrorDetails(new Error("fetch failed"));

    expect(details).toContain("Database connection bridge is unreachable");
  });
});
