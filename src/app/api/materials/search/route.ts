import { GET as searchBooks } from "@/app/api/books/search/route";
import { apiError, apiSuccess, getErrorDetails } from "@/server/http/response";
import {
  mapBookSearchToMaterials,
  searchOpenMaterials,
} from "@/server/services/material-discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const subject = (searchParams.get("subject") ?? "").trim();

  if (q.length < 2) {
    return apiSuccess({
      query: q,
      subject,
      items: [],
    });
  }

  try {
    const bookSearchUrl = new URL("/api/books/search", request.url);
    bookSearchUrl.searchParams.set("q", q);
    if (subject) {
      bookSearchUrl.searchParams.set("subject", subject);
    }

    const bookResponse = await searchBooks(
      new Request(bookSearchUrl.toString(), { method: "GET" }),
    );
    const bookPayload = (await bookResponse.json()) as {
      data?: {
        items?: Array<{
          id: string;
          title: string;
          authors?: string[];
          verified_page_count?: number | null;
          thumbnail_url?: string | null;
          categories?: string[];
          inferred_subject?: string | null;
          source: "google_books" | "open_library" | "local_catalog";
        }>;
      };
    };

    const items = [
      ...mapBookSearchToMaterials(bookPayload.data),
      ...searchOpenMaterials(q, subject),
    ];

    return apiSuccess({
      query: q,
      subject,
      items,
    });
  } catch (error) {
    return apiError("Failed to search materials", 500, getErrorDetails(error));
  }
}
