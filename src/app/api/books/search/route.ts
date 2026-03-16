import { apiSuccess, getErrorDetails } from "@/server/http/response";

type GoogleBooksApiResponse = {
  items?: Array<{
    id: string;
    volumeInfo?: {
      title?: string;
      authors?: string[];
      pageCount?: number;
      publishedDate?: string;
      categories?: string[];
      imageLinks?: {
        thumbnail?: string;
      };
    };
  }>;
};

type OpenLibraryApiResponse = {
  docs?: Array<{
    key?: string;
    title?: string;
    author_name?: string[];
    first_publish_year?: number;
    number_of_pages_median?: number;
    cover_i?: number;
    subject?: string[];
  }>;
};

type BookSearchSource = "google_books" | "open_library" | "local_catalog";

type BookSearchItem = {
  id: string;
  title: string;
  authors: string[];
  published_date: string | null;
  thumbnail_url: string | null;
  verified_page_count: number | null;
  confidence_score: number;
  source: BookSearchSource;
  categories: string[];
  inferred_subject: string | null;
};

type RankedBookSearchItem = BookSearchItem & {
  _rank: number;
};

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const TARGET_RESULTS = 20;
const PROVIDER_TIMEOUT_MS = 2200;
const searchCache = new Map<string, { at: number; items: BookSearchItem[]; degraded: boolean }>();

const LOCAL_BOOK_CATALOG: Array<{
  id: string;
  title: string;
  authors: string[];
  verified_page_count: number | null;
  tags?: string[];
}> = [
  { id: "local-campbell-biology", title: "Campbell Biology", authors: ["Urry", "Cain", "Wasserman"], verified_page_count: 1456, tags: ["biology", "medicine", "life sciences"] },
  { id: "local-atkins-chemistry", title: "Atkins Physical Chemistry", authors: ["Atkins", "de Paula"], verified_page_count: 1080, tags: ["chemistry", "physical chemistry"] },
  { id: "local-halliday-physics", title: "Fundamentals of Physics", authors: ["Halliday", "Resnick", "Walker"], verified_page_count: 1232, tags: ["physics", "engineering"] },
  { id: "local-private-law", title: "Manuale di Diritto Privato", authors: ["Autori Vari"], verified_page_count: 1355, tags: ["law", "diritto", "private law"] },
  { id: "local-calculus-stewart", title: "Calculus", authors: ["James Stewart"], verified_page_count: 1368, tags: ["mathematics", "math", "engineering"] },
  { id: "local-organic-chemistry", title: "Organic Chemistry", authors: ["Clayden"], verified_page_count: 1264, tags: ["chemistry", "organic chemistry"] },
  { id: "local-gray-anatomy", title: "Gray's Anatomy for Students", authors: ["Drake", "Vogl", "Mitchell"], verified_page_count: 1192, tags: ["medicine", "anatomy", "biology"] },
  { id: "local-economics-mankiw", title: "Principles of Economics", authors: ["N. Gregory Mankiw"], verified_page_count: 896, tags: ["economics", "business"] },
  { id: "local-history-modern", title: "Modern European History", authors: ["Autori Vari"], verified_page_count: 780, tags: ["history", "humanities"] },
  { id: "local-english-literature", title: "The Norton Anthology of English Literature", authors: ["Greenblatt"], verified_page_count: 3040, tags: ["literature", "humanities", "english"] },
  { id: "local-artificial-intelligence", title: "Artificial Intelligence: A Modern Approach", authors: ["Russell", "Norvig"], verified_page_count: 1152, tags: ["computer science", "ai", "machine learning"] },
  { id: "local-intro-algorithms", title: "Introduction to Algorithms", authors: ["Cormen", "Leiserson", "Rivest", "Stein"], verified_page_count: 1312, tags: ["computer science", "algorithms"] },
  { id: "local-discrete-math", title: "Discrete Mathematics and Its Applications", authors: ["Kenneth Rosen"], verified_page_count: 1070, tags: ["mathematics", "computer science"] },
  { id: "local-statistical-learning", title: "An Introduction to Statistical Learning", authors: ["James", "Witten", "Hastie", "Tibshirani"], verified_page_count: 440, tags: ["statistics", "machine learning"] },
  { id: "local-probability", title: "A First Course in Probability", authors: ["Sheldon Ross"], verified_page_count: 624, tags: ["statistics", "mathematics"] },
  { id: "local-microeconomics", title: "Microeconomics", authors: ["Pindyck", "Rubinfeld"], verified_page_count: 768, tags: ["economics"] },
  { id: "local-macroeconomics", title: "Macroeconomics", authors: ["Olivier Blanchard"], verified_page_count: 640, tags: ["economics"] },
  { id: "local-corporate-finance", title: "Corporate Finance", authors: ["Brealey", "Myers", "Allen"], verified_page_count: 960, tags: ["finance", "business"] },
  { id: "local-company-law", title: "Company Law", authors: ["Paul Davies"], verified_page_count: 912, tags: ["law", "company law"] },
  { id: "local-constitutional-law", title: "Constitutional Law", authors: ["Autori Vari"], verified_page_count: 780, tags: ["law", "constitutional law"] },
  { id: "local-roman-law", title: "Istituzioni di Diritto Romano", authors: ["Autori Vari"], verified_page_count: 620, tags: ["law", "diritto"] },
  { id: "local-biochemistry", title: "Lehninger Principles of Biochemistry", authors: ["Nelson", "Cox"], verified_page_count: 1328, tags: ["biology", "medicine", "biochemistry"] },
  { id: "local-pathology", title: "Robbins and Cotran Pathologic Basis of Disease", authors: ["Kumar", "Abbas", "Aster"], verified_page_count: 1392, tags: ["medicine", "pathology"] },
  { id: "local-physiology", title: "Guyton and Hall Textbook of Medical Physiology", authors: ["Hall"], verified_page_count: 1150, tags: ["medicine", "physiology"] },
  { id: "local-internal-medicine", title: "Harrison's Principles of Internal Medicine", authors: ["Jameson", "Fauci"], verified_page_count: 4048, tags: ["medicine", "internal medicine"] },
  { id: "local-general-chemistry", title: "Chemistry: The Central Science", authors: ["Brown", "LeMay", "Bursten"], verified_page_count: 1266, tags: ["chemistry"] },
  { id: "local-molecular-biology", title: "Molecular Biology of the Cell", authors: ["Alberts"], verified_page_count: 1728, tags: ["biology", "medicine"] },
  { id: "local-world-history", title: "A History of the Modern World", authors: ["R. R. Palmer"], verified_page_count: 1216, tags: ["history"] },
  { id: "local-philosophy", title: "A New History of Western Philosophy", authors: ["Anthony Kenny"], verified_page_count: 1070, tags: ["philosophy", "humanities"] },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeQueryTerms(query: string) {
  return normalize(query)
    .split(/[\s,.;:/()-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function inferSubjectFromText(text: string): string | null {
  const normalized = normalize(text);
  const rules: Array<{ subject: string; tokens: string[] }> = [
    { subject: "law", tokens: ["law", "diritto", "jurisprudence", "civil law", "private law"] },
    { subject: "medicine", tokens: ["medicine", "anatomy", "physiology", "pathology", "clinical"] },
    { subject: "biology", tokens: ["biology", "genetics", "biochemistry", "molecular"] },
    { subject: "chemistry", tokens: ["chemistry", "organic", "inorganic", "stoichiometry"] },
    { subject: "physics", tokens: ["physics", "mechanics", "thermodynamics", "quantum"] },
    { subject: "mathematics", tokens: ["math", "mathematics", "calculus", "algebra", "statistics"] },
    { subject: "computer science", tokens: ["algorithm", "computer science", "programming", "machine learning", "ai"] },
    { subject: "economics", tokens: ["economics", "microeconomics", "macroeconomics", "finance"] },
    { subject: "history", tokens: ["history", "modern world", "medieval", "historical"] },
    { subject: "literature", tokens: ["literature", "poetry", "novel", "anthology"] },
  ];
  for (const rule of rules) {
    if (rule.tokens.some((token) => normalized.includes(token))) {
      return rule.subject;
    }
  }
  return null;
}

function getConfidenceScore(
  pageCount: number | null,
  authors: string[],
  publishedDate: string | null,
) {
  if (!pageCount) return 0.35;

  let score = 0.72;
  if (pageCount >= 80 && pageCount <= 2200) score += 0.15;
  if (authors.length > 0) score += 0.06;
  if (publishedDate) score += 0.04;

  return Number(clamp(score, 0.35, 0.97).toFixed(2));
}

function mapGoogleItem(
  item: NonNullable<GoogleBooksApiResponse["items"]>[number],
): BookSearchItem | null {
  const info = item.volumeInfo ?? {};
  const title = info?.title?.trim();
  if (!title) return null;

  const authors = Array.isArray(info.authors) ? info.authors : [];
  const pageCount =
    typeof info.pageCount === "number" && Number.isFinite(info.pageCount)
      ? Math.max(1, Math.round(info.pageCount))
      : null;
  const publishedDate = info.publishedDate?.trim() || null;
  const thumbnail = info.imageLinks?.thumbnail?.trim() ?? "";
  const categories = Array.isArray(info.categories)
    ? info.categories.map((entry) => entry.trim()).filter(Boolean)
    : [];
  const inferredSubject = inferSubjectFromText(
    `${title} ${categories.join(" ")}`,
  );

  return {
    id: `g:${item.id}`,
    title,
    authors,
    published_date: publishedDate,
    thumbnail_url: thumbnail ? thumbnail.replace(/^http:\/\//i, "https://") : null,
    verified_page_count: pageCount,
    confidence_score: getConfidenceScore(pageCount, authors, publishedDate),
    source: "google_books",
    categories,
    inferred_subject: inferredSubject,
  };
}

function mapOpenLibraryItem(
  item: NonNullable<OpenLibraryApiResponse["docs"]>[number],
): BookSearchItem | null {
  const title = item.title?.trim();
  if (!title) return null;
  const authors = Array.isArray(item.author_name) ? item.author_name : [];
  const pageCount =
    typeof item.number_of_pages_median === "number" &&
    Number.isFinite(item.number_of_pages_median)
      ? Math.max(1, Math.round(item.number_of_pages_median))
      : null;
  const year =
    typeof item.first_publish_year === "number" && Number.isFinite(item.first_publish_year)
      ? String(item.first_publish_year)
      : null;
  const cover = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-S.jpg` : null;
  const key = item.key?.trim() || `open:${normalize(title)}:${authors[0] ?? "na"}`;
  const categories = Array.isArray(item.subject)
    ? item.subject.map((entry) => entry.trim()).filter(Boolean).slice(0, 8)
    : [];
  const inferredSubject = inferSubjectFromText(
    `${title} ${categories.join(" ")}`,
  );

  return {
    id: `o:${key}`,
    title,
    authors,
    published_date: year,
    thumbnail_url: cover,
    verified_page_count: pageCount,
    confidence_score: Number(clamp(pageCount ? 0.62 : 0.44, 0.35, 0.92).toFixed(2)),
    source: "open_library",
    categories,
    inferred_subject: inferredSubject,
  };
}

function makeDedupeKey(item: BookSearchItem) {
  return `${normalize(item.title)}|${normalize(item.authors.join(" "))}`;
}

function computeRank(item: BookSearchItem, query: string, subjectHint: string) {
  const queryNorm = normalize(query);
  const subjectNorm = normalize(subjectHint);
  const terms = normalizeQueryTerms(`${query} ${subjectHint}`);
  const titleNorm = normalize(item.title);
  const authorsNorm = normalize(item.authors.join(" "));
  const corpus = `${titleNorm} ${authorsNorm}`;

  let score = 0;
  if (titleNorm === queryNorm) score += 120;
  if (titleNorm.startsWith(queryNorm)) score += 105;
  if (titleNorm.includes(queryNorm)) score += 90;
  if (corpus.startsWith(queryNorm)) score += 40;
  if (corpus.includes(queryNorm)) score += 30;
  for (const term of terms) {
    if (titleNorm.includes(term)) score += 14;
    else if (authorsNorm.includes(term)) score += 8;
    else if (corpus.includes(term)) score += 4;
  }
  if (subjectNorm && titleNorm.includes(subjectNorm)) score += 18;
  if (subjectNorm && corpus.includes(subjectNorm)) score += 8;
  if (item.verified_page_count) score += 6;
  score += Math.round(item.confidence_score * 10);
  if (item.source === "google_books") score += 6;
  if (item.source === "open_library") score += 3;

  return score;
}

function dedupeRankAndSlice(
  items: BookSearchItem[],
  query: string,
  subjectHint: string,
  maxItems = TARGET_RESULTS,
) {
  const bestByKey = new Map<string, RankedBookSearchItem>();

  for (const item of items) {
    const key = makeDedupeKey(item);
    const ranked: RankedBookSearchItem = {
      ...item,
      _rank: computeRank(item, query, subjectHint),
    };
    const existing = bestByKey.get(key);
    if (!existing || ranked._rank > existing._rank) {
      bestByKey.set(key, ranked);
    }
  }

  return Array.from(bestByKey.values())
    .sort(
      (a, b) =>
        b._rank - a._rank ||
        b.confidence_score - a.confidence_score ||
        (b.verified_page_count ?? 0) - (a.verified_page_count ?? 0),
    )
    .slice(0, maxItems)
    .map((item) => ({
      id: item.id,
      title: item.title,
      authors: item.authors,
      published_date: item.published_date,
      thumbnail_url: item.thumbnail_url,
      verified_page_count: item.verified_page_count,
      confidence_score: item.confidence_score,
      source: item.source,
      categories: item.categories,
      inferred_subject: item.inferred_subject,
    }));
}

function searchLocalCatalog(query: string, subjectHint: string): BookSearchItem[] {
  const queryNorm = normalize(query);
  const subjectNorm = normalize(subjectHint);
  const queryTerms = normalizeQueryTerms(query);
  const results: BookSearchItem[] = [];

  for (const item of LOCAL_BOOK_CATALOG) {
    const text = normalize(`${item.title} ${item.authors.join(" ")}`);
    const tagsText = normalize(item.tags?.join(" ") ?? "");
    const termsMatch =
      queryTerms.length > 0 &&
      queryTerms.every((term) => text.includes(term) || tagsText.includes(term));
    const match =
      text.includes(queryNorm) ||
      termsMatch ||
      (subjectNorm.length > 0 && tagsText.includes(subjectNorm));

    if (!match) continue;
    results.push({
      id: item.id,
      title: item.title,
      authors: item.authors,
      published_date: null,
      thumbnail_url: null,
      verified_page_count: item.verified_page_count,
      confidence_score: 0.58,
      source: "local_catalog",
      categories: item.tags ?? [],
      inferred_subject: inferSubjectFromText(
        `${item.title} ${(item.tags ?? []).join(" ")}`,
      ),
    });
  }

  return results;
}

type FetchProviderResult = {
  ok: boolean;
  status: number;
  items: BookSearchItem[];
};

async function fetchJsonWithTimeout(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleBooks(query: string, apiKey?: string): Promise<FetchProviderResult> {
  const endpoint = new URL("https://www.googleapis.com/books/v1/volumes");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("maxResults", "20");
  endpoint.searchParams.set("printType", "books");
  endpoint.searchParams.set(
    "fields",
    "items(id,volumeInfo(title,authors,pageCount,publishedDate,categories,imageLinks(thumbnail)))",
  );
  if (apiKey) endpoint.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetchJsonWithTimeout(endpoint.toString());
  } catch {
    return { ok: false, status: 0, items: [] };
  }
  if (!response.ok) {
    return { ok: false, status: response.status, items: [] };
  }

  const payload = (await response.json()) as GoogleBooksApiResponse;
  const items = (payload.items ?? [])
    .map(mapGoogleItem)
    .filter((entry): entry is BookSearchItem => Boolean(entry));
  return { ok: true, status: response.status, items };
}

async function fetchOpenLibrary(
  query: string,
  mode: "q" | "title" = "q",
): Promise<FetchProviderResult> {
  const endpoint = new URL("https://openlibrary.org/search.json");
  endpoint.searchParams.set(mode, query);
  endpoint.searchParams.set("limit", "20");
  endpoint.searchParams.set("fields", "key,title,author_name,first_publish_year,number_of_pages_median,cover_i,subject");

  let response: Response;
  try {
    response = await fetchJsonWithTimeout(endpoint.toString());
  } catch {
    return { ok: false, status: 0, items: [] };
  }
  if (!response.ok) {
    return { ok: false, status: response.status, items: [] };
  }

  const payload = (await response.json()) as OpenLibraryApiResponse;
  const items = (payload.docs ?? [])
    .map(mapOpenLibraryItem)
    .filter((entry): entry is BookSearchItem => Boolean(entry));
  return { ok: true, status: response.status, items };
}

function buildQueryVariants(query: string, subjectHint: string) {
  const variants = [query];
  variants.push(`"${query}"`);
  variants.push(`intitle:${query}`);
  if (subjectHint) {
    variants.push(`${query} ${subjectHint}`);
    variants.push(`"${query}" subject:${subjectHint}`);
    variants.push(`intitle:${query} ${subjectHint}`);
  }
  const terms = normalizeQueryTerms(query);
  if (terms.length > 1) {
    variants.push(`intitle:${terms.join(" ")}`);
  }
  return Array.from(new Set(variants.map((entry) => entry.trim()).filter(Boolean)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const subjectHint = (searchParams.get("subject") ?? "").trim();

  if (q.length < 2) {
    return apiSuccess({
      query: q,
      subject: subjectHint,
      items: [] as BookSearchItem[],
      cached: false,
      degraded: false,
    });
  }

  const cacheKey = `${normalize(subjectHint)}|${normalize(q)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL_MS) {
    return apiSuccess({
      query: q,
      subject: subjectHint,
      items: cached.items,
      cached: true,
      degraded: cached.degraded,
    });
  }

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
    const googleQueries = buildQueryVariants(q, subjectHint);
    const collected: BookSearchItem[] = [];
    let googleUnavailable = false;

    const batchSize = 3;
    for (let i = 0; i < googleQueries.length; i += batchSize) {
      const batch = googleQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (queryVariant) => {
          let google = await fetchGoogleBooks(queryVariant, apiKey);
          if (!google.ok && apiKey) {
            google = await fetchGoogleBooks(queryVariant);
          }
          return google;
        }),
      );
      for (const google of batchResults) {
        if (!google.ok) {
          googleUnavailable = true;
          continue;
        }
        collected.push(...google.items);
      }
      if (collected.length >= TARGET_RESULTS) {
        break;
      }
    }

    if (collected.length < TARGET_RESULTS) {
      const openLibrary = await fetchOpenLibrary(
        subjectHint ? `${q} ${subjectHint}` : q,
      );
      if (openLibrary.ok) {
        collected.push(...openLibrary.items);
      }
      if (collected.length < Math.ceil(TARGET_RESULTS * 0.65)) {
        const openLibraryTitle = await fetchOpenLibrary(q, "title");
        if (openLibraryTitle.ok) {
          collected.push(...openLibraryTitle.items);
        }
      }
    }

    if (collected.length < TARGET_RESULTS) {
      collected.push(...searchLocalCatalog(q, subjectHint));
    }

    const items = dedupeRankAndSlice(collected, q, subjectHint, TARGET_RESULTS);
    const degraded = googleUnavailable || items.every((item) => item.source !== "google_books");
    const reason =
      items.length === 0
        ? "no_results_all_providers"
        : degraded
          ? "google_unavailable_or_empty"
          : undefined;

    searchCache.set(cacheKey, {
      at: Date.now(),
      items,
      degraded,
    });

    return apiSuccess({
      query: q,
      subject: subjectHint,
      items,
      cached: false,
      degraded,
      reason,
    });
  } catch (error) {
    const localItems = dedupeRankAndSlice(
      searchLocalCatalog(q, subjectHint),
      q,
      subjectHint,
      TARGET_RESULTS,
    );

    searchCache.set(cacheKey, {
      at: Date.now(),
      items: localItems,
      degraded: true,
    });

    return apiSuccess({
      query: q,
      subject: subjectHint,
      items: localItems,
      cached: false,
      degraded: true,
      reason: "network_exception_local_fallback",
      details: getErrorDetails(error),
    });
  }
}
