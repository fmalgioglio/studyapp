export type ApiResult<T> = {
  data?: T;
  error?: string;
  details?: unknown;
  issues?: unknown;
};

function isTechnicalDetails(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("__turbopack__") ||
    normalized.includes("prisma") ||
    normalized.includes("validation error") ||
    normalized.includes(" at ") ||
    normalized.includes("\n")
  );
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: boolean; payload: ApiResult<T> }> {
  try {
    const response = await fetch(input, {
      cache: "no-store",
      ...init,
    });
    const raw = await response.text();

    if (!raw.trim()) {
      return response.ok
        ? { ok: true, payload: {} }
        : {
            ok: false,
            payload: { error: `Request failed (${response.status})` },
          };
    }

    try {
      const parsed = JSON.parse(raw) as ApiResult<T>;
      if (
        !response.ok &&
        parsed.error &&
        typeof parsed.details === "string" &&
        parsed.details.trim() &&
        !isTechnicalDetails(parsed.details)
      ) {
        parsed.error = `${parsed.error}: ${parsed.details}`;
      }
      return { ok: response.ok, payload: parsed };
    } catch {
      return {
        ok: response.ok,
        payload: response.ok
          ? {}
          : {
              error: `Request failed (${response.status})`,
              details: raw.slice(0, 300),
            },
      };
    }
  } catch (error) {
    return {
      ok: false,
      payload: {
        error: "Network error",
        details: error instanceof Error ? error.message : "Unknown fetch error",
      },
    };
  }
}
