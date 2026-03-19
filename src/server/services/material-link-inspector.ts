type FetchLike = typeof fetch;

export type MaterialLinkKind = "pdf" | "html" | "unknown";

export type MaterialExtractionStatus =
  | "supported"
  | "partial"
  | "unsupported"
  | "blocked";

export type MaterialLinkAnalysis = {
  url: string;
  title: string | null;
  subjectHint: string | null;
  kind: MaterialLinkKind;
  status: MaterialExtractionStatus;
  sourcePolicy: "official_public" | "user_provided";
  contentType: string | null;
  contentLengthBytes: number | null;
  estimatedScopePages: number | null;
  extractionSummary: string;
  scopeHints: string[];
  notes: string[];
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^::1$/i,
  /^\[::1\]$/i,
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parsePositiveInt(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function isPrivateHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isPublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  if (!url.hostname) {
    return false;
  }

  return !isPrivateHost(url.hostname);
}

export function classifyMaterialLink(url: string): MaterialLinkKind {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    if (pathname.endsWith(".pdf")) {
      return "pdf";
    }

    if (/\.(html?|xhtml)$/.test(pathname)) {
      return "html";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

export function isSupportedMaterialLink(url: string) {
  try {
    const parsed = new URL(url);
    return isPublicHttpUrl(parsed);
  } catch {
    return false;
  }
}

function extractTitleFromHtml(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return normalizeWhitespace(titleMatch[1]);
  }
  return null;
}

function extractMetaDescriptionFromHtml(html: string) {
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  if (descriptionMatch?.[1]) {
    return normalizeWhitespace(descriptionMatch[1]);
  }
  return null;
}

function extractHeadingFromHtml(html: string) {
  const headingMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (headingMatch?.[1]) {
    return normalizeWhitespace(headingMatch[1]);
  }
  return null;
}

function stripHtmlTags(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function estimateHtmlScopePages(text: string, contentLengthBytes: number | null) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const byWords = Math.max(1, Math.round(words / 320));

  if (!contentLengthBytes) {
    return byWords;
  }

  const byBytes = Math.max(1, Math.round(contentLengthBytes / 18_000));
  return clamp(Math.max(byWords, byBytes), 1, 250);
}

function estimatePdfScopePages(contentLengthBytes: number | null) {
  if (!contentLengthBytes) {
    return null;
  }

  return clamp(Math.max(1, Math.round(contentLengthBytes / 18_000)), 1, 500);
}

function buildBlockedAnalysis(url: string, reason: string): MaterialLinkAnalysis {
  return {
    url,
    title: null,
    subjectHint: null,
    kind: "unknown",
    status: "blocked",
    sourcePolicy: "user_provided",
    contentType: null,
    contentLengthBytes: null,
    estimatedScopePages: null,
    extractionSummary: reason,
    scopeHints: [],
    notes: [reason],
  };
}

export async function inspectPublicMaterialLink(
  input: {
    url: string;
    subjectHint?: string | null;
    titleHint?: string | null;
  },
  fetchImpl: FetchLike = fetch,
): Promise<MaterialLinkAnalysis> {
  const subjectHint = input.subjectHint?.trim() || null;
  const titleHint = input.titleHint?.trim() || null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.url);
  } catch {
    return buildBlockedAnalysis(input.url, "The link is not a valid URL.");
  }

  if (!isPublicHttpUrl(parsedUrl)) {
    return buildBlockedAnalysis(
      input.url,
      "Only public http/https links are supported for material inspection.",
    );
  }

  const kind = classifyMaterialLink(input.url);
  const response = await fetchImpl(parsedUrl.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "StudyApp Material Inspector/1.0",
      accept: kind === "pdf" ? "application/pdf,*/*;q=0.8" : "text/html,*/*;q=0.8",
    },
  });

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? null;
  const contentLengthBytes = parsePositiveInt(response.headers.get("content-length"));

  if (!response.ok) {
    return {
      url: input.url,
      title: titleHint,
      subjectHint,
      kind,
      status: "blocked",
      sourcePolicy: "official_public",
      contentType,
      contentLengthBytes,
      estimatedScopePages: null,
      extractionSummary: `The public link returned HTTP ${response.status}.`,
      scopeHints: [],
      notes: [
        "The link is reachable but not readable from the current server session.",
      ],
    };
  }

  const looksLikePdf = kind === "pdf" || Boolean(contentType?.includes("pdf"));
  const looksLikeHtml =
    kind === "html" ||
    Boolean(contentType?.includes("text/html")) ||
    Boolean(contentType?.includes("application/xhtml+xml"));

  if (looksLikePdf) {
    const estimatedScopePages = estimatePdfScopePages(contentLengthBytes);
    const scopeHints = [
      "Public PDF link",
      contentLengthBytes ? `${Math.round(contentLengthBytes / 1024)} KB` : "No size hint",
    ];

    return {
      url: input.url,
      title: titleHint,
      subjectHint,
      kind: "pdf",
      status: estimatedScopePages ? "supported" : "partial",
      sourcePolicy: "official_public",
      contentType,
      contentLengthBytes,
      estimatedScopePages,
      extractionSummary:
        estimatedScopePages !== null
          ? `Public PDF detected with an approximate scope of ${estimatedScopePages} pages.`
          : "Public PDF detected, but the page scope could not be estimated from headers alone.",
      scopeHints,
      notes: [
        "No aggressive scraping is performed.",
        "This inspector only uses the explicit public link and response headers.",
      ],
    };
  }

  if (looksLikeHtml) {
    if (contentLengthBytes !== null && contentLengthBytes > 1_500_000) {
      return {
        url: input.url,
        title: titleHint,
        subjectHint,
        kind: "html",
        status: "partial",
        sourcePolicy: "official_public",
        contentType,
        contentLengthBytes,
        estimatedScopePages: null,
        extractionSummary:
          "The page is public, but it is too large for a safe lightweight inspection pass.",
        scopeHints: ["Large public HTML page", "Use the explicit link plus manual scope input"],
        notes: [
          "The inspector avoids deep crawling and large-body extraction.",
          "Use the linked material title and manual notes for now.",
        ],
      };
    }

    const html = await response.text();
    const extractedTitle =
      extractTitleFromHtml(html) ?? extractHeadingFromHtml(html) ?? titleHint;
    const description = extractMetaDescriptionFromHtml(html);
    const text = stripHtmlTags(html);
    const estimatedScopePages = estimateHtmlScopePages(text, contentLengthBytes);

    const scopeHints = [
      extractedTitle ? `Title: ${truncate(extractedTitle, 120)}` : "Title unavailable",
      description ? `Description: ${truncate(description, 180)}` : "Description unavailable",
      text ? `Body length: ${text.split(/\s+/).filter(Boolean).length} words` : "Body unavailable",
    ];

    return {
      url: input.url,
      title: extractedTitle,
      subjectHint,
      kind: "html",
      status: "supported",
      sourcePolicy: "official_public",
      contentType,
      contentLengthBytes,
      estimatedScopePages,
      extractionSummary:
        description || extractedTitle
          ? `Public HTML inspected successfully for a lightweight planning summary.`
          : "Public HTML inspected successfully, but only limited metadata was available.",
      scopeHints,
      notes: [
        "Only the explicit public page was inspected.",
        "The inspector does not crawl related pages or follow hidden links.",
      ],
    };
  }

  return {
    url: input.url,
    title: titleHint,
    subjectHint,
    kind,
    status: "unsupported",
    sourcePolicy: "official_public",
    contentType,
    contentLengthBytes,
    estimatedScopePages: null,
    extractionSummary:
      "Only public PDF or HTML links are supported by the current extraction foundation.",
    scopeHints: [],
    notes: [
      "Use a public PDF or HTML page link.",
      "Binary or unsupported formats stay metadata-only for now.",
    ],
  };
}
