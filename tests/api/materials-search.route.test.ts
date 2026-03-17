import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const searchBooksMock = vi.fn();
const searchOpenMaterialsMock = vi.fn();
const mapBookSearchToMaterialsMock = vi.fn();

vi.mock("@/app/api/books/search/route", () => ({
  GET: searchBooksMock,
}));

vi.mock("@/server/services/material-discovery", () => ({
  searchOpenMaterials: searchOpenMaterialsMock,
  mapBookSearchToMaterials: mapBookSearchToMaterialsMock,
}));

describe("GET /api/materials/search", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns rights-safe book and open-resource results together", async () => {
    searchBooksMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                id: "book-1",
                title: "Open Physics",
                source: "google_books",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    mapBookSearchToMaterialsMock.mockReturnValue([
      {
        id: "mapped-book-1",
        title: "Open Physics",
        sourceLabel: "Google Books",
        origin: "OPEN_VERIFIED",
        verificationLevel: "DISCOVERED",
      },
    ]);

    searchOpenMaterialsMock.mockReturnValue([
      {
        id: "open-1",
        title: "OpenStax Physics",
        sourceLabel: "OpenStax",
        origin: "OPEN_VERIFIED",
        verificationLevel: "OFFICIAL",
      },
    ]);

    const { GET } = await import("../../../src/app/api/materials/search/route");
    const response = await GET(
      new Request("http://localhost/api/materials/search?q=physics&subject=physics"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(searchBooksMock).toHaveBeenCalled();
    expect(searchOpenMaterialsMock).toHaveBeenCalledWith("physics", "physics");
    expect(body.data.items).toEqual([
      expect.objectContaining({ id: "mapped-book-1" }),
      expect.objectContaining({ id: "open-1" }),
    ]);
  });
});
