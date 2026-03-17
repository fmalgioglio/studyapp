import type {
  MaterialSearchResult,
  StudyMaterialOrigin,
  StudyMaterialVerificationLevel,
} from "@/lib/study-domain";

type BookSearchPayload = {
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

type OpenResourceEntry = {
  id: string;
  title: string;
  url: string;
  sourceLabel: string;
  licenseHint: string;
  availabilityHint: string;
  categories: string[];
  estimatedScopePages?: number;
  inferredSubject?: string | null;
};

const OPEN_RESOURCE_CATALOG: OpenResourceEntry[] = [
  {
    id: "openstax-biology-2e",
    title: "OpenStax Biology 2e",
    url: "https://openstax.org/details/books/biology-2e",
    sourceLabel: "OpenStax",
    licenseHint: "Open license",
    availabilityHint: "Full textbook online",
    categories: ["biology", "high school", "university"],
    estimatedScopePages: 1500,
    inferredSubject: "biology",
  },
  {
    id: "openstax-college-physics",
    title: "OpenStax College Physics 2e",
    url: "https://openstax.org/details/books/college-physics-2e",
    sourceLabel: "OpenStax",
    licenseHint: "Open license",
    availabilityHint: "Full textbook online",
    categories: ["physics", "science"],
    estimatedScopePages: 1300,
    inferredSubject: "physics",
  },
  {
    id: "openstax-precalculus-2e",
    title: "OpenStax Precalculus 2e",
    url: "https://openstax.org/details/books/precalculus-2e",
    sourceLabel: "OpenStax",
    licenseHint: "Open license",
    availabilityHint: "Full textbook online",
    categories: ["math", "mathematics"],
    estimatedScopePages: 1200,
    inferredSubject: "mathematics",
  },
  {
    id: "mit-ocw-intro-psychology",
    title: "MIT OpenCourseWare Introduction to Psychology",
    url: "https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/",
    sourceLabel: "MIT OpenCourseWare",
    licenseHint: "Open courseware",
    availabilityHint: "Official course page",
    categories: ["psychology", "course"],
    inferredSubject: "psychology",
  },
  {
    id: "oercommons-us-history",
    title: "OER Commons United States History Collection",
    url: "https://oercommons.org/hubs/high-school",
    sourceLabel: "OER Commons",
    licenseHint: "Varies by resource",
    availabilityHint: "Open educational resources directory",
    categories: ["history", "high school"],
    inferredSubject: "history",
  },
  {
    id: "doab-economics",
    title: "Directory of Open Access Books Economics",
    url: "https://www.doabooks.org/en/doab?func=subject&uiLanguage=en&cpId=41",
    sourceLabel: "DOAB",
    licenseHint: "Open access books",
    availabilityHint: "Open academic catalog",
    categories: ["economics", "open access"],
    inferredSubject: "economics",
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function computeSourceMeta(
  sourceLabel: string,
): { origin: StudyMaterialOrigin; verificationLevel: StudyMaterialVerificationLevel } {
  if (sourceLabel === "Google Books" || sourceLabel === "Open Library") {
    return {
      origin: "OPEN_VERIFIED",
      verificationLevel: "VERIFIED",
    };
  }

  return {
    origin: "OPEN_VERIFIED",
    verificationLevel: "OFFICIAL",
  };
}

export function mapBookSearchToMaterials(
  payload: BookSearchPayload | undefined,
): MaterialSearchResult[] {
  return (payload?.items ?? []).map((item) => {
    const sourceLabel =
      item.source === "google_books"
        ? "Google Books"
        : item.source === "open_library"
          ? "Open Library"
          : "Local catalog";
    const sourceMeta = computeSourceMeta(sourceLabel);

    return {
      id: `book:${item.id}`,
      title: item.title,
      sourceLabel,
      origin: sourceMeta.origin,
      verificationLevel: sourceMeta.verificationLevel,
      estimatedScopePages: item.verified_page_count ?? null,
      authors: item.authors ?? [],
      thumbnailUrl: item.thumbnail_url ?? null,
      categories: item.categories ?? [],
      inferredSubject: item.inferred_subject ?? null,
      availabilityHint:
        item.source === "google_books"
          ? "Preview or metadata"
          : item.source === "open_library"
            ? "Catalog entry"
            : "Catalog suggestion",
      previewOnly: item.source !== "local_catalog",
    };
  });
}

export function searchOpenMaterials(
  query: string,
  subjectHint: string,
): MaterialSearchResult[] {
  const queryTerms = `${query} ${subjectHint}`
    .split(/[\s,.;:/()-]+/)
    .map((term) => normalize(term))
    .filter((term) => term.length > 1);

  return OPEN_RESOURCE_CATALOG.filter((entry) => {
    const corpus = normalize(
      `${entry.title} ${entry.categories.join(" ")} ${entry.inferredSubject ?? ""}`,
    );
    return queryTerms.every((term) => corpus.includes(term));
  }).map((entry) => ({
    id: `open:${entry.id}`,
    title: entry.title,
    url: entry.url,
    sourceLabel: entry.sourceLabel,
    origin: "OPEN_VERIFIED",
    verificationLevel: "OFFICIAL",
    licenseHint: entry.licenseHint,
    availabilityHint: entry.availabilityHint,
    estimatedScopePages: entry.estimatedScopePages ?? null,
    categories: entry.categories,
    inferredSubject: entry.inferredSubject ?? null,
    previewOnly: false,
  }));
}
