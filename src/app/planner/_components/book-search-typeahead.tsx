"use client";

import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { requestJson } from "@/app/planner/_lib/client-api";

export type BookSearchSource = "google_books" | "open_library" | "local_catalog";

export type BookSearchItem = {
  id: string;
  title: string;
  authors: string[];
  published_date: string | null;
  verified_page_count: number | null;
  confidence_score: number;
  source?: BookSearchSource;
  categories?: string[];
  inferred_subject?: string | null;
};

type BookSearchPayload = {
  query: string;
  subject?: string;
  items: BookSearchItem[];
  cached: boolean;
  degraded?: boolean;
  reason?: string;
};

type Props = {
  idPrefix: string;
  label: string;
  query: string;
  subjectHint?: string;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  onQueryChange: (value: string) => void;
  onSelect: (item: BookSearchItem) => void;
};

const TYPEAHEAD_DEBOUNCE_MS = 300;
const TYPEAHEAD_CACHE_TTL_MS = 5 * 60 * 1000;
const TYPEAHEAD_SELECT_SUPPRESS_MS = 450;

const COPY = {
  en: {
    searching: "Searching books...",
    noBooks: "No books found for this query.",
    searchFailed: "Book search failed. Please retry.",
    fallbackMode: "Live catalog unavailable. Showing fallback suggestions.",
    useArrowsHint: "Use up/down arrows and Enter to select.",
    noResultsHint: "Try title + author for better matches.",
    verifiedPages: "Verified pages",
    confidence: "Confidence",
    sourceLabel: "Source",
    sourceGoogle: "Google Books",
    sourceOpenLibrary: "Open Library",
    sourceLocal: "Local catalog",
    inferredSubject: "Inferred subject",
    unknownAuthor: "Unknown author",
  },
  it: {
    searching: "Ricerca libri...",
    noBooks: "Nessun libro trovato per questa ricerca.",
    searchFailed: "Ricerca libri non riuscita. Riprova.",
    fallbackMode: "Catalogo live non disponibile. Mostro suggerimenti fallback.",
    useArrowsHint: "Usa frecce su/giu e Invio per selezionare.",
    noResultsHint: "Prova titolo + autore per risultati migliori.",
    verifiedPages: "Pagine verificate",
    confidence: "Confidenza",
    sourceLabel: "Fonte",
    sourceGoogle: "Google Books",
    sourceOpenLibrary: "Open Library",
    sourceLocal: "Catalogo locale",
    inferredSubject: "Materia inferita",
    unknownAuthor: "Autore sconosciuto",
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function normalizeQueryValue(value: string) {
  return value.trim().toLowerCase();
}

function highlightMatch(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const start = lowerText.indexOf(lowerQuery);
  if (start === -1) return text;

  const end = start + normalizedQuery.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="study-typeahead-mark">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

export function BookSearchTypeahead({
  idPrefix,
  label,
  query,
  subjectHint = "",
  disabled = false,
  placeholder,
  helpText,
  onQueryChange,
  onSelect,
}: Props) {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const booksCacheRef = useRef<Map<string, { at: number; items: BookSearchItem[] }>>(
    new Map(),
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectionGuardRef = useRef<{ query: string; until: number } | null>(null);

  const [bookSuggestions, setBookSuggestions] = useState<BookSearchItem[]>([]);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  const [bookSearchError, setBookSearchError] = useState("");
  const [bookSearchDegraded, setBookSearchDegraded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  function sourceLabel(source?: BookSearchItem["source"]) {
    if (source === "google_books") return t.sourceGoogle;
    if (source === "open_library") return t.sourceOpenLibrary;
    if (source === "local_catalog") return t.sourceLocal;
    return t.sourceLocal;
  }

  useEffect(() => {
    if (disabled) {
      setBookSuggestions([]);
      setBookSearchLoading(false);
      setBookSearchError("");
      setBookSearchDegraded(false);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const normalizedQuery = query.trim();
    const normalizedQueryKey = normalizeQueryValue(query);
    if (normalizedQuery.length < 2) {
      setBookSuggestions([]);
      setBookSearchLoading(false);
      setBookSearchError("");
      setBookSearchDegraded(false);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const guard = selectionGuardRef.current;
    if (guard && guard.query === normalizedQueryKey && guard.until > Date.now()) {
      setBookSuggestions([]);
      setBookSearchLoading(false);
      setBookSearchError("");
      setBookSearchDegraded(false);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (guard && guard.until <= Date.now()) {
      selectionGuardRef.current = null;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      const key = `${normalizedQueryKey}|${normalizeQueryValue(subjectHint)}`;
      const cached = booksCacheRef.current.get(key);
      if (cached && Date.now() - cached.at < TYPEAHEAD_CACHE_TTL_MS) {
        setBookSuggestions(cached.items);
        setBookSearchError("");
        setBookSearchDegraded(false);
        setShowSuggestions(true);
        setActiveSuggestionIndex(cached.items.length > 0 ? 0 : -1);
        return;
      }

      setBookSearchLoading(true);
      setBookSearchError("");
      setBookSearchDegraded(false);
      const { ok, payload } = await requestJson<BookSearchPayload>(
        `/api/books/search?q=${encodeURIComponent(normalizedQuery)}&subject=${encodeURIComponent(subjectHint)}`,
      );
      if (!active) return;
      setBookSearchLoading(false);

      if (!ok || !payload.data) {
        setBookSuggestions([]);
        setBookSearchError(payload.error ?? t.searchFailed);
        setShowSuggestions(true);
        setActiveSuggestionIndex(-1);
        return;
      }

      booksCacheRef.current.set(key, {
        at: Date.now(),
        items: payload.data.items,
      });
      setBookSuggestions(payload.data.items);
      setBookSearchError("");
      setBookSearchDegraded(Boolean(payload.data.degraded));
      setShowSuggestions(true);
      setActiveSuggestionIndex(payload.data.items.length > 0 ? 0 : -1);
    }, TYPEAHEAD_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [disabled, query, subjectHint, t.searchFailed]);

  const dropdownVisible =
    !disabled && showSuggestions && query.trim().length >= 2;
  const listboxId = `${idPrefix}-typeahead`;
  const inputId = `${idPrefix}-input`;
  const helpTextId = helpText ? `${idPrefix}-help` : undefined;

  function moveActiveSuggestion(nextIndex: number) {
    if (bookSuggestions.length === 0) {
      setActiveSuggestionIndex(-1);
      return;
    }
    setActiveSuggestionIndex(
      clamp(nextIndex, 0, bookSuggestions.length - 1),
    );
  }

  function selectSuggestion(item: BookSearchItem) {
    const normalizedSelectedQuery = normalizeQueryValue(item.title);
    if (normalizedSelectedQuery) {
      selectionGuardRef.current = {
        query: normalizedSelectedQuery,
        until: Date.now() + TYPEAHEAD_SELECT_SUPPRESS_MS,
      };
    } else {
      selectionGuardRef.current = null;
    }

    onSelect(item);
    setBookSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setBookSearchError("");
    setBookSearchDegraded(false);
    searchInputRef.current?.focus();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!dropdownVisible) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveSuggestion(activeSuggestionIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveSuggestion(activeSuggestionIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      if (bookSuggestions.length === 0) {
        return;
      }

      const indexToSelect =
        activeSuggestionIndex >= 0 && activeSuggestionIndex < bookSuggestions.length
          ? activeSuggestionIndex
          : 0;
      if (indexToSelect >= 0) {
        event.preventDefault();
        selectSuggestion(bookSuggestions[indexToSelect]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="planner-field min-w-0 space-y-1">
        <label htmlFor={inputId} className="planner-eyebrow mb-1 block">
          {label}
        </label>
        <input
          id={inputId}
          ref={searchInputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const guard = selectionGuardRef.current;
            if (guard && normalizeQueryValue(nextQuery) !== guard.query) {
              selectionGuardRef.current = null;
            }
            onQueryChange(nextQuery);
            setShowSuggestions(true);
            setBookSearchError("");
          }}
          onFocus={() => {
            if (query.trim().length >= 2) {
              const guard = selectionGuardRef.current;
              const isSuppressed =
                guard &&
                guard.query === normalizeQueryValue(query) &&
                guard.until > Date.now();
              if (!isSuppressed) {
                setShowSuggestions(true);
              }
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setShowSuggestions(false);
              setActiveSuggestionIndex(-1);
            }, 120);
          }}
          onKeyDown={onInputKeyDown}
          className="planner-input min-w-0"
          placeholder={placeholder}
          role="combobox"
          aria-expanded={dropdownVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={helpTextId}
          aria-activedescendant={
            activeSuggestionIndex >= 0
              ? `${idPrefix}-option-${bookSuggestions[activeSuggestionIndex]?.id ?? ""}`
              : undefined
          }
        />
        {helpText ? (
          <p id={helpTextId} className="break-words text-xs leading-relaxed text-slate-500">
            {helpText}
          </p>
        ) : null}
      </div>

      {dropdownVisible ? (
        <div
          id={listboxId}
          className="study-typeahead-panel mt-0 w-full max-w-full overflow-hidden"
          role="listbox"
        >
          {bookSearchLoading ? (
            <div className="study-typeahead-status">{t.searching}</div>
          ) : null}

          {!bookSearchLoading && bookSearchError ? (
            <div className="study-typeahead-status study-typeahead-status-error">
              {bookSearchError}
            </div>
          ) : null}

          {!bookSearchLoading && !bookSearchError && bookSuggestions.length === 0 ? (
            <div className="study-typeahead-status">
              <p>{t.noBooks}</p>
              <p className="study-typeahead-subtle">{t.noResultsHint}</p>
            </div>
          ) : null}

          {!bookSearchLoading && !bookSearchError && bookSuggestions.length > 0 ? (
            <>
              <p className="study-typeahead-hint">{t.useArrowsHint}</p>
              {bookSearchDegraded ? (
                <p className="study-typeahead-status study-typeahead-status-warning">
                  {t.fallbackMode}
                </p>
              ) : null}
              <ul className="max-h-64 overflow-auto overscroll-contain">
                {bookSuggestions.map((item, index) => {
                  const active = index === activeSuggestionIndex;
                  return (
                    <li key={item.id}>
                      <button
                        id={`${idPrefix}-option-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          selectSuggestion(item);
                        }}
                        onClick={(event) => {
                          if (event.detail === 0) {
                            selectSuggestion(item);
                          }
                        }}
                        className={`study-typeahead-option ${
                          active ? "study-typeahead-option-active" : ""
                        }`}
                      >
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {highlightMatch(item.title, query)}
                        </p>
                        <p className="break-words text-xs text-slate-600">
                          {item.authors.join(", ") || t.unknownAuthor}
                        </p>
                        <p className="break-words text-xs text-slate-500">
                          {t.verifiedPages}: {item.verified_page_count ?? "-"} | {t.confidence}:{" "}
                          {pct(item.confidence_score)}
                        </p>
                        <p className="break-words text-xs text-slate-500">
                          {t.sourceLabel}: {sourceLabel(item.source)}
                        </p>
                        {item.inferred_subject ? (
                          <p className="break-words text-xs text-slate-500">
                            {t.inferredSubject}: {item.inferred_subject}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
