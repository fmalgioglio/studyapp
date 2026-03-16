"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import {
  BookSearchTypeahead,
  type BookSearchItem,
  type BookSearchSource,
} from "@/app/planner/_components/book-search-typeahead";
import {
  usePlannerData,
  type PlannerExam,
  type PlannerSubject,
} from "@/app/planner/_hooks/use-planner-data";
import {
  notifyDataRevision,
  readFocusProgress,
  subscribeDataRevision,
  type FocusProgressMap,
} from "@/app/planner/_lib/focus-progress";
import { readExamHints, type ExamHintsMap } from "@/app/planner/_lib/exam-hints";
import {
  buildExamProgressSnapshot,
  type ExamProgressState,
  type FocusContributionLevel,
} from "@/app/planner/_lib/season-engine";
import type {
  ExamWorkloadApproximateScopeUnit,
  ExamWorkloadMaterialShape,
} from "@/lib/exam-workload-contract";
import {
  focusContributionClasses,
  progressStateClasses,
} from "@/app/planner/_lib/status-ui";
import { requestJson } from "../_lib/client-api";
import { useAuthStudent } from "../_hooks/use-auth-student";

type CreatedExam = PlannerExam;
type CreatedSubject = PlannerSubject;

type WorkloadReadiness = "known" | "unknown";
type MaterialType = "book" | "notes" | "mixed";
type BookCoverageMode = "full_book" | "page_range";

const MS_PER_DAY = 86_400_000;

const COPY = {
  en: {
    title: "Exams",
    subtitle: "Manage full-session exams and open timeline details.",
    subjectSection: "1. Subject",
    subjectSectionHint: "Pick one subject and continue.",
    subjectModeExisting: "Use existing subject",
    subjectModeNew: "Create new subject",
    subject: "Subject",
    selectSubject: "Select subject",
    newSubjectName: "New subject name",
    newSubjectColor: "Subject color (optional)",
    createSubjectHint: "Create a subject inline and continue in one step.",
    basicsSection: "2. Exam basics",
    examTitle: "Exam title",
    examDate: "Exam date",
    targetGrade: "Target grade (optional)",
    workloadSection: "Study workload",
    workloadHelp: "Set workload now, or mark it unknown and refine later.",
    workloadStatus: "Workload status",
    workloadKnown: "Known now",
    workloadUnknown: "Unknown for now",
    materialType: "Material type",
    materialTypeHelp: "Choose where your study load comes from.",
    materialBook: "Book",
    materialNotes: "Notes",
    materialMixed: "Mixed",
    notebookTitle: "Material guide",
    notebookIntro: "Use this to classify your exam material before entering workload details.",
    notebookBookTitle: "Book case",
    notebookBookBody: "Choose this when most of your preparation is from one main textbook.",
    notebookNotesTitle: "Notes case",
    notebookNotesBody: "Choose this when your preparation is mainly from notes, slides, or handouts.",
    notebookMixedTitle: "Mixed case",
    notebookMixedBody: "Choose this when your exam load is split between textbook and notes.",
    notebookFocusTitle: "Interpretation",
    notebookFocusBody: "The app currently interprets this exam as",
    notebookScopeHint:
      "In Material scope, enter the exact chapters, units, or note sets included in this exam.",
    totalPages: "Total pages (optional)",
    bookLookupLabel: "Book lookup",
    bookLookupHint: "Search title + author for better matches",
    bookLookupHelp:
      "Select a suggestion to attach verified pages and source confidence.",
    selectedBook: "Selected book",
    verifiedPages: "Verified pages",
    confidence: "Confidence",
    sourceLabel: "Source",
    notesSummary: "Notes summary (optional)",
    materialDetails: "Material scope (optional)",
    scopePlanner: "Scope planner",
    scopePlannerHint: "Use these fields to describe what part of the material is actually in scope.",
    bookCoverageLabel: "Book coverage",
    coverageFull: "Full book / main text",
    coverageRange: "Specific page range",
    pageStart: "Page start",
    pageEnd: "Page end",
    materialShapeLabel: "Notes / support material",
    materialShapeHint: "Useful for notes-only and mixed exams.",
    shapeMiniHandout: "Mini handout",
    shapeHandoutSet: "Handout set",
    shapeSlides: "Slides",
    shapePersonalNotes: "Personal notes",
    shapeMixed: "Mixed pack",
    shapeOfflineApproximate: "Rough offline estimate",
    approximateScopeLabel: "Approximate support scope",
    approximateScopeValue: "Amount",
    approximateScopeUnit: "Unit",
    unitPages: "Pages",
    unitSlides: "Slides",
    unitHandouts: "Handouts",
    unitItems: "Items",
    mixedRecommendation:
      "For mixed exams, keep the main text range precise and add an approximate size for notes or slides.",
    notesRecommendation:
      "For notes-heavy exams, describe the material type and estimate the size of the pack you need to cover.",
    bookRecommendation:
      "If only part of the book matters, use a page range so the planner reflects the real exam scope.",
    addExam: "Add exam",
    editWorkload: "Edit workload",
    saveWorkload: "Save workload",
    cancelEdit: "Cancel",
    list: "Exam list",
    none: "No exams yet.",
    refresh: "Refresh",
    openTimeline: "Open timeline",
    delete: "Delete",
    readiness: "Readiness",
    focusContribution: "Focus contribution",
    focusSignals: "Focus signals",
    focusMinutes: "Focus minutes",
    focusSessions: "Focus sessions",
    loading: "Loading account...",
    noAccount: "No account context found.",
    subjectRequired: "Select a subject or create a new one.",
    subjectCreateError: "Failed to create subject",
    noDate: "Select an exam date.",
    created: "Exam created",
    deleted: "Exam deleted.",
    loadSubjectsError: "Failed to load subjects",
    loadExamsError: "Failed to load exams",
    createError: "Failed to create exam",
    deleteError: "Failed to delete exam",
    statusNotStarted: "Not started",
    statusWarmingUp: "Warming up",
    statusSteady: "Steady",
    statusAlmostReady: "Almost ready",
    statusReady: "Ready",
    contributionNone: "None",
    contributionLow: "Low",
    contributionMedium: "Medium",
    contributionHigh: "High",
    scopeWorkload: "Verified scope",
    scopeApproximate: "Approximate scope",
    scopeInferred: "Estimated scope",
    workloadKnownChip: "Workload known",
    workloadUnknownChip: "Workload unknown",
    provisional: "Provisional",
    sourceGoogle: "Google Books",
    sourceOpenLibrary: "Open Library",
    sourceLocal: "Local catalog",
    daysLeft: "days left",
    noPages: "—",
  },
  it: {
    title: "Esami",
    subtitle: "Gestisci gli esami della sessione e apri la timeline.",
    subjectSection: "1. Materia",
    subjectSectionHint: "Seleziona una materia e continua.",
    subjectModeExisting: "Usa materia esistente",
    subjectModeNew: "Crea nuova materia",
    subject: "Materia",
    selectSubject: "Seleziona materia",
    newSubjectName: "Nome nuova materia",
    newSubjectColor: "Colore materia (opzionale)",
    createSubjectHint: "Crea una materia inline e continua in un unico passaggio.",
    basicsSection: "2. Dettagli esame",
    examTitle: "Titolo esame",
    examDate: "Data esame",
    targetGrade: "Voto target (opzionale)",
    workloadSection: "Carico di studio",
    workloadHelp: "Imposta il carico ora oppure lascialo provvisorio e rifiniscilo dopo.",
    workloadStatus: "Stato del carico",
    workloadKnown: "Già noto",
    workloadUnknown: "Sconosciuto per ora",
    materialType: "Tipo di materiale",
    materialTypeHelp: "Scegli da dove arriva il carico di studio.",
    materialBook: "Libro",
    materialNotes: "Appunti",
    materialMixed: "Misto",
    notebookTitle: "Guida materiale",
    notebookIntro: "Usala per classificare il materiale prima di inserire i dettagli del carico.",
    notebookBookTitle: "Caso libro",
    notebookBookBody: "Sceglilo quando la preparazione dipende soprattutto da un testo principale.",
    notebookNotesTitle: "Caso appunti",
    notebookNotesBody: "Sceglilo quando la preparazione si basa soprattutto su appunti, slide o dispense.",
    notebookMixedTitle: "Caso misto",
    notebookMixedBody: "Sceglilo quando il carico è distribuito tra libro e appunti.",
    notebookFocusTitle: "Interpretazione",
    notebookFocusBody: "L'app interpreta questo esame come",
    notebookScopeHint:
      "In Perimetro materiale, indica i capitoli, le unità o i blocchi di appunti inclusi.",
    totalPages: "Pagine totali (opzionale)",
    bookLookupLabel: "Ricerca libro",
    bookLookupHint: "Cerca titolo + autore per risultati migliori",
    bookLookupHelp:
      "Seleziona un suggerimento per collegare pagine verificate e confidenza fonte.",
    selectedBook: "Libro selezionato",
    verifiedPages: "Pagine verificate",
    confidence: "Confidenza",
    sourceLabel: "Fonte",
    notesSummary: "Riassunto appunti (opzionale)",
    materialDetails: "Perimetro materiale (opzionale)",
    scopePlanner: "Planner del perimetro",
    scopePlannerHint: "Usa questi campi per descrivere quale parte del materiale entra davvero nell'esame.",
    bookCoverageLabel: "Copertura libro",
    coverageFull: "Libro intero / testo principale",
    coverageRange: "Intervallo di pagine",
    pageStart: "Pagina iniziale",
    pageEnd: "Pagina finale",
    materialShapeLabel: "Appunti / materiale di supporto",
    materialShapeHint: "Utile per esami con appunti o materiale misto.",
    shapeMiniHandout: "Dispensa breve",
    shapeHandoutSet: "Set dispense",
    shapeSlides: "Slide",
    shapePersonalNotes: "Appunti personali",
    shapeMixed: "Pacchetto misto",
    shapeOfflineApproximate: "Stima offline",
    approximateScopeLabel: "Perimetro supporto approssimato",
    approximateScopeValue: "Quantita",
    approximateScopeUnit: "Unita",
    unitPages: "Pagine",
    unitSlides: "Slide",
    unitHandouts: "Dispense",
    unitItems: "Elementi",
    mixedRecommendation:
      "Per gli esami misti, mantieni preciso il range del testo principale e aggiungi una stima di appunti o slide.",
    notesRecommendation:
      "Per gli esami basati su appunti, descrivi il tipo di materiale e stima la dimensione del pacchetto da coprire.",
    bookRecommendation:
      "Se conta solo una parte del libro, usa un intervallo di pagine per riflettere il perimetro reale.",
    addExam: "Aggiungi esame",
    editWorkload: "Modifica carico",
    saveWorkload: "Salva carico",
    cancelEdit: "Annulla",
    list: "Lista esami",
    none: "Nessun esame.",
    refresh: "Aggiorna",
    openTimeline: "Apri timeline",
    delete: "Elimina",
    readiness: "Prontezza",
    focusContribution: "Contributo focus",
    focusSignals: "Segnali focus",
    focusMinutes: "Minuti focus",
    focusSessions: "Sessioni focus",
    loading: "Caricamento account...",
    noAccount: "Contesto account non trovato.",
    subjectRequired: "Seleziona una materia o creane una nuova.",
    subjectCreateError: "Impossibile creare la materia",
    noDate: "Seleziona la data esame.",
    created: "Esame creato",
    deleted: "Esame eliminato.",
    loadSubjectsError: "Impossibile caricare le materie",
    loadExamsError: "Impossibile caricare gli esami",
    createError: "Impossibile creare l'esame",
    deleteError: "Impossibile eliminare l'esame",
    statusNotStarted: "Non iniziato",
    statusWarmingUp: "In avvio",
    statusSteady: "Costante",
    statusAlmostReady: "Quasi pronto",
    statusReady: "Pronto",
    contributionNone: "Nullo",
    contributionLow: "Basso",
    contributionMedium: "Medio",
    contributionHigh: "Alto",
    scopeWorkload: "Perimetro verificato",
    scopeApproximate: "Perimetro approssimato",
    scopeInferred: "Perimetro stimato",
    workloadKnownChip: "Carico noto",
    workloadUnknownChip: "Carico sconosciuto",
    provisional: "Provvisorio",
    sourceGoogle: "Google Books",
    sourceOpenLibrary: "Open Library",
    sourceLocal: "Catalogo locale",
    daysLeft: "giorni rimasti",
    noPages: "—",
  },
} as const;

type ExamsCopy = (typeof COPY)[keyof typeof COPY];

function progressStateLabel(state: ExamProgressState, t: ExamsCopy) {
  if (state === "ready") return t.statusReady;
  if (state === "almost_ready") return t.statusAlmostReady;
  if (state === "steady") return t.statusSteady;
  if (state === "warming_up") return t.statusWarmingUp;
  return t.statusNotStarted;
}

function focusContributionLabel(level: FocusContributionLevel, t: ExamsCopy) {
  if (level === "high") return t.contributionHigh;
  if (level === "medium") return t.contributionMedium;
  if (level === "low") return t.contributionLow;
  return t.contributionNone;
}

function sourceLabel(source: BookSearchSource | undefined, t: ExamsCopy) {
  if (source === "google_books") return t.sourceGoogle;
  if (source === "open_library") return t.sourceOpenLibrary;
  return t.sourceLocal;
}

function activeNotebookCase(materialType: MaterialType, t: ExamsCopy) {
  if (materialType === "notes") {
    return { title: t.notebookNotesTitle, body: t.notebookNotesBody };
  }
  if (materialType === "mixed") {
    return { title: t.notebookMixedTitle, body: t.notebookMixedBody };
  }
  return { title: t.notebookBookTitle, body: t.notebookBookBody };
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function normalizePositivePageCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return value;
}

function defaultMaterialShape(materialType: MaterialType): ExamWorkloadMaterialShape {
  if (materialType === "mixed") return "mixed";
  return "personal_notes";
}

function materialShapeOptions(t: ExamsCopy) {
  return [
    { value: "mini_handout", label: t.shapeMiniHandout },
    { value: "handout_set", label: t.shapeHandoutSet },
    { value: "slides", label: t.shapeSlides },
    { value: "personal_notes", label: t.shapePersonalNotes },
    { value: "mixed", label: t.shapeMixed },
    { value: "offline_approximate", label: t.shapeOfflineApproximate },
  ] satisfies Array<{ value: ExamWorkloadMaterialShape; label: string }>;
}

function approximateScopeUnitOptions(t: ExamsCopy) {
  return [
    { value: "pages", label: t.unitPages },
    { value: "slides", label: t.unitSlides },
    { value: "handouts", label: t.unitHandouts },
    { value: "items", label: t.unitItems },
  ] satisfies Array<{ value: ExamWorkloadApproximateScopeUnit; label: string }>;
}

function workloadRecommendation(materialType: MaterialType, t: ExamsCopy) {
  if (materialType === "mixed") return t.mixedRecommendation;
  if (materialType === "notes") return t.notesRecommendation;
  return t.bookRecommendation;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}…`;
}

export default function PlannerExamsPage() {
  const { student, loading } = useAuthStudent();
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const { subjects, exams, errors, refresh, refreshing } = usePlannerData({
    enabled: Boolean(student?.id),
    subscribeToRevision: false,
  });

  const [focusProgress, setFocusProgress] = useState<FocusProgressMap>(() =>
    readFocusProgress(),
  );
  const [subjectMode, setSubjectMode] = useState<"existing" | "new">("existing");
  const [subjectId, setSubjectId] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [workloadReadiness, setWorkloadReadiness] = useState<WorkloadReadiness>("known");
  const [materialType, setMaterialType] = useState<MaterialType>("book");
  const [bookCoverageMode, setBookCoverageMode] = useState<BookCoverageMode>("full_book");
  const [bookPageStart, setBookPageStart] = useState("");
  const [bookPageEnd, setBookPageEnd] = useState("");
  const [materialShape, setMaterialShape] = useState<ExamWorkloadMaterialShape>(
    defaultMaterialShape("book"),
  );
  const [approximateScopeValue, setApproximateScopeValue] = useState("");
  const [approximateScopeUnit, setApproximateScopeUnit] =
    useState<ExamWorkloadApproximateScopeUnit>("pages");
  const [totalPages, setTotalPages] = useState("");
  const [bookLookupQuery, setBookLookupQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchItem | null>(null);
  const [notesSummary, setNotesSummary] = useState("");
  const [materialDetails, setMaterialDetails] = useState("");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editWorkloadReadiness, setEditWorkloadReadiness] = useState<WorkloadReadiness>("known");
  const [editMaterialType, setEditMaterialType] = useState<MaterialType>("book");
  const [editBookCoverageMode, setEditBookCoverageMode] =
    useState<BookCoverageMode>("full_book");
  const [editBookPageStart, setEditBookPageStart] = useState("");
  const [editBookPageEnd, setEditBookPageEnd] = useState("");
  const [editMaterialShape, setEditMaterialShape] = useState<ExamWorkloadMaterialShape>(
    defaultMaterialShape("book"),
  );
  const [editApproximateScopeValue, setEditApproximateScopeValue] = useState("");
  const [editApproximateScopeUnit, setEditApproximateScopeUnit] =
    useState<ExamWorkloadApproximateScopeUnit>("pages");
  const [editTotalPages, setEditTotalPages] = useState("");
  const [editBookLookupQuery, setEditBookLookupQuery] = useState("");
  const [editSelectedBook, setEditSelectedBook] = useState<BookSearchItem | null>(null);
  const [editNotesSummary, setEditNotesSummary] = useState("");
  const [editMaterialDetails, setEditMaterialDetails] = useState("");
  const [editPagesTouched, setEditPagesTouched] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pagesTouched, setPagesTouched] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [examHints] = useState<ExamHintsMap>(() => readExamHints());

  const dataErrorMessage = errors.subjects ?? errors.exams ?? "";
  const activeNotebook = activeNotebookCase(materialType, t);
  const selectedSubjectId = subjectMode === "existing" ? subjectId || subjects[0]?.id || "" : "";
  const examTracks = useMemo(
    () => buildExamProgressSnapshot(exams, focusProgress, examHints),
    [examHints, exams, focusProgress],
  );
  const examById = useMemo(() => new Map(exams.map((exam) => [exam.id, exam])), [exams]);

  useEffect(() => {
    return subscribeDataRevision((source) => {
      if (source !== "focus_progress") return;
      setFocusProgress(readFocusProgress());
    });
  }, []);

  async function createSubjectByValues(name: string, color?: string) {
    const { ok, payload } = await requestJson<CreatedSubject>("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        color: color?.trim() || undefined,
      }),
    });

    if (!ok || !payload.data) {
      throw new Error(payload.error ?? t.subjectCreateError);
    }

    return payload.data;
  }

  async function handleRefresh() {
    const result = await refresh();
    if (result.ok) {
      setCurrentTimeMs(Date.now());
    }
    if (!result.ok && !result.skipped) {
      setMessage(result.errors.exams ?? result.errors.subjects ?? t.loadExamsError);
    }
  }

  function openEditWorkload(examId: string) {
    const exam = examById.get(examId);
    if (!exam) return;
    const workloadPayload = exam.workloadPayload;
    setEditingExamId(examId);
    setEditWorkloadReadiness((exam.workloadReadiness as WorkloadReadiness) ?? "unknown");
    setEditMaterialType((exam.materialType as MaterialType) ?? "book");
    setEditBookCoverageMode(
      workloadPayload?.bookCoverageMode === "page_range" ? "page_range" : "full_book",
    );
    setEditBookPageStart(workloadPayload?.bookPageStart ? String(workloadPayload.bookPageStart) : "");
    setEditBookPageEnd(workloadPayload?.bookPageEnd ? String(workloadPayload.bookPageEnd) : "");
    setEditMaterialShape(
      workloadPayload?.materialShape ??
        defaultMaterialShape((exam.materialType as MaterialType) ?? "book"),
    );
    setEditApproximateScopeValue(
      workloadPayload?.approximateScopeValue
        ? String(workloadPayload.approximateScopeValue)
        : "",
    );
    setEditApproximateScopeUnit(workloadPayload?.approximateScopeUnit ?? "pages");
    setEditTotalPages(workloadPayload?.totalPages ? String(workloadPayload.totalPages) : "");
    setEditBookLookupQuery(workloadPayload?.bookTitle ?? "");
    setEditSelectedBook(null);
    setEditNotesSummary(workloadPayload?.notesSummary ?? "");
    setEditMaterialDetails(workloadPayload?.materialDetails ?? "");
    setEditPagesTouched(false);
  }

  function closeEditWorkload() {
    setEditingExamId(null);
    setEditBookCoverageMode("full_book");
    setEditBookPageStart("");
    setEditBookPageEnd("");
    setEditMaterialShape(defaultMaterialShape("book"));
    setEditApproximateScopeValue("");
    setEditApproximateScopeUnit("pages");
    setEditBookLookupQuery("");
    setEditSelectedBook(null);
    setEditNotesSummary("");
    setEditMaterialDetails("");
    setEditTotalPages("");
    setEditPagesTouched(false);
    setEditSubmitting(false);
  }

  async function saveEditWorkload(examId: string) {
    setEditSubmitting(true);
    const workloadPayload: Record<string, unknown> = {};
    const normalizedPages = editTotalPages ? Number(editTotalPages) : undefined;
    if (normalizedPages && normalizedPages > 0) {
      workloadPayload.totalPages = normalizedPages;
    }
    if (
      (editMaterialType === "book" || editMaterialType === "mixed") &&
      editBookCoverageMode === "page_range"
    ) {
      const pageStart = editBookPageStart ? Number(editBookPageStart) : undefined;
      const pageEnd = editBookPageEnd ? Number(editBookPageEnd) : undefined;
      if (pageStart && pageEnd && pageEnd >= pageStart) {
        workloadPayload.bookCoverageMode = "page_range";
        workloadPayload.bookPageStart = pageStart;
        workloadPayload.bookPageEnd = pageEnd;
      }
    }
    if (editMaterialType === "book" || editMaterialType === "mixed") {
      const bookTitle = editSelectedBook?.title || editBookLookupQuery.trim();
      if (bookTitle) {
        workloadPayload.bookTitle = bookTitle;
      }
      if (editSelectedBook?.verified_page_count) {
        workloadPayload.verifiedPageCount = editSelectedBook.verified_page_count;
      }
      if (editSelectedBook?.source) {
        workloadPayload.bookSource = editSelectedBook.source;
      }
      if (typeof editSelectedBook?.confidence_score === "number") {
        workloadPayload.matchConfidenceScore = editSelectedBook.confidence_score;
      }
      if (editSelectedBook?.authors?.length) {
        workloadPayload.bookAuthors = editSelectedBook.authors;
      }
    }
    if (editMaterialType === "notes" || editMaterialType === "mixed") {
      workloadPayload.materialShape = editMaterialShape;
      const approximateValue = editApproximateScopeValue
        ? Number(editApproximateScopeValue)
        : undefined;
      if (approximateValue && approximateValue > 0) {
        workloadPayload.approximateScopeValue = approximateValue;
        workloadPayload.approximateScopeUnit = editApproximateScopeUnit;
        workloadPayload.isApproximate = true;
      }
    }
    if (editNotesSummary.trim()) {
      workloadPayload.notesSummary = editNotesSummary.trim();
    }
    if (editMaterialDetails.trim()) {
      workloadPayload.materialDetails = editMaterialDetails.trim();
    }

    const { ok, payload } = await requestJson<PlannerExam>(`/api/exams?id=${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workloadReadiness: editWorkloadReadiness,
        materialType: editMaterialType,
        workloadPayload,
      }),
    });
    setEditSubmitting(false);

    if (!ok) {
      setMessage(payload.error ?? t.createError);
      return;
    }

    closeEditWorkload();
    setMessage(`${t.saveWorkload} ✓`);
    const refreshResult = await refresh({ force: true });
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.exams ?? t.loadExamsError);
      return;
    }
    setCurrentTimeMs(Date.now());
    notifyDataRevision();
  }

  async function createExam(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!student?.id) {
      setMessage(t.noAccount);
      return;
    }

    let nextSubjectId = selectedSubjectId;
    if (subjectMode === "new") {
      if (!newSubjectName.trim()) {
        setMessage(t.subjectRequired);
        return;
      }
      try {
        const createdSubject = await createSubjectByValues(newSubjectName, newSubjectColor);
        nextSubjectId = createdSubject.id;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t.subjectCreateError);
        return;
      }
    }

    if (!nextSubjectId) {
      setMessage(t.subjectRequired);
      return;
    }

    if (!examDate) {
      setMessage(t.noDate);
      return;
    }

    const workloadPayload: Record<string, unknown> = {};
    const normalizedTotalPages = totalPages ? Number(totalPages) : undefined;
    if (normalizedTotalPages) {
      workloadPayload.totalPages = normalizedTotalPages;
    }
    if ((materialType === "book" || materialType === "mixed") && bookCoverageMode === "page_range") {
      const pageStart = bookPageStart ? Number(bookPageStart) : undefined;
      const pageEnd = bookPageEnd ? Number(bookPageEnd) : undefined;
      if (pageStart && pageEnd && pageEnd >= pageStart) {
        workloadPayload.bookCoverageMode = "page_range";
        workloadPayload.bookPageStart = pageStart;
        workloadPayload.bookPageEnd = pageEnd;
      }
    }
    if (materialType === "book" || materialType === "mixed") {
      const bookTitle = selectedBook?.title || bookLookupQuery.trim();
      if (bookTitle) workloadPayload.bookTitle = bookTitle;
      if (selectedBook?.verified_page_count) {
        workloadPayload.verifiedPageCount = selectedBook.verified_page_count;
      }
      if (selectedBook?.source) {
        workloadPayload.bookSource = selectedBook.source;
      }
      if (typeof selectedBook?.confidence_score === "number") {
        workloadPayload.matchConfidenceScore = selectedBook.confidence_score;
      }
      if (selectedBook?.authors?.length) {
        workloadPayload.bookAuthors = selectedBook.authors;
      }
      if (selectedBook?.inferred_subject) {
        workloadPayload.inferredSubject = selectedBook.inferred_subject;
      }
    }
    if (materialType === "notes" || materialType === "mixed") {
      workloadPayload.materialShape = materialShape;
      const approximateValue = approximateScopeValue ? Number(approximateScopeValue) : undefined;
      if (approximateValue && approximateValue > 0) {
        workloadPayload.approximateScopeValue = approximateValue;
        workloadPayload.approximateScopeUnit = approximateScopeUnit;
        workloadPayload.isApproximate = true;
      }
    }
    if (notesSummary.trim()) {
      workloadPayload.notesSummary = notesSummary.trim();
    }
    if (materialDetails.trim()) {
      workloadPayload.materialDetails = materialDetails.trim();
    }

    setSubmitting(true);
    const { ok, payload } = await requestJson<CreatedExam>("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: nextSubjectId,
        title: examTitle.trim(),
        examDate,
        targetGrade: targetGrade.trim() || undefined,
        workloadReadiness,
        materialType,
        workloadPayload,
      }),
    });
    setSubmitting(false);

    if (!ok || !payload.data) {
      setMessage(payload.error ?? t.createError);
      return;
    }

    setSubjectMode("existing");
    setSubjectId(nextSubjectId);
    setNewSubjectName("");
    setNewSubjectColor("");
    setExamTitle("");
    setExamDate("");
    setTargetGrade("");
    setWorkloadReadiness("known");
    setMaterialType("book");
    setBookCoverageMode("full_book");
    setBookPageStart("");
    setBookPageEnd("");
    setMaterialShape(defaultMaterialShape("book"));
    setApproximateScopeValue("");
    setApproximateScopeUnit("pages");
    setTotalPages("");
    setBookLookupQuery("");
    setSelectedBook(null);
    setNotesSummary("");
    setMaterialDetails("");
    setPagesTouched(false);
    setMessage(`${t.created}: ${payload.data.title}`);
    const refreshResult = await refresh({ force: true });
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.exams ?? refreshResult.errors.subjects ?? t.loadExamsError);
      return;
    }
    setCurrentTimeMs(Date.now());
    notifyDataRevision();
  }

  async function deleteExam(id: string) {
    const { ok, payload } = await requestJson<{ id: string }>(`/api/exams?id=${id}`, {
      method: "DELETE",
    });

    if (!ok) {
      setMessage(payload.error ?? t.deleteError);
      return;
    }

    setMessage(t.deleted);
    const refreshResult = await refresh({ force: true });
    if (!refreshResult.ok && !refreshResult.skipped) {
      setMessage(refreshResult.errors.exams ?? refreshResult.errors.subjects ?? t.loadExamsError);
      return;
    }
    setCurrentTimeMs(Date.now());
    notifyDataRevision();
  }

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="planner-panel planner-hero">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
      </section>

      <section className="planner-panel">
        {loading ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{t.loading}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="planner-skeleton h-12" />
              <div className="planner-skeleton h-12" />
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={createExam}>
            <section className="planner-card-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="planner-eyebrow">{t.subjectSection}</p>
                </div>
                <p className="text-sm text-slate-500">{t.subjectSectionHint}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubjectMode("existing")}
                  className={`planner-btn ${
                    subjectMode === "existing" ? "planner-btn-primary" : "planner-btn-secondary"
                  }`}
                >
                  {t.subjectModeExisting}
                </button>
                <button
                  type="button"
                  onClick={() => setSubjectMode("new")}
                  className={`planner-btn ${
                    subjectMode === "new" ? "planner-btn-primary" : "planner-btn-secondary"
                  }`}
                >
                  {t.subjectModeNew}
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {subjectMode === "existing" ? (
                  <label className="planner-field">
                    <span className="planner-eyebrow mb-1 block">{t.subject}</span>
                    <select
                      value={selectedSubjectId}
                      onChange={(event) => setSubjectId(event.target.value)}
                      className="planner-input"
                    >
                      <option value="">{t.selectSubject}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="planner-field">
                      <span className="planner-eyebrow mb-1 block">{t.newSubjectName}</span>
                      <input
                        required
                        type="text"
                        value={newSubjectName}
                        onChange={(event) => setNewSubjectName(event.target.value)}
                        className="planner-input"
                      />
                    </label>
                    <label className="planner-field">
                      <span className="planner-eyebrow mb-1 block">{t.newSubjectColor}</span>
                      <input
                        type="text"
                        value={newSubjectColor}
                        onChange={(event) => setNewSubjectColor(event.target.value)}
                        className="planner-input"
                        placeholder="#0ea5e9"
                      />
                    </label>
                  </>
                )}
              </div>

              {subjectMode === "new" ? (
                <p className="mt-2 text-sm text-slate-500">{t.createSubjectHint}</p>
              ) : null}
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.examTitle}</span>
                <input
                  required
                  type="text"
                  value={examTitle}
                  onChange={(event) => setExamTitle(event.target.value)}
                  className="planner-input"
                />
              </label>

              <label className="planner-field">
                <span className="planner-eyebrow mb-1 block">{t.examDate}</span>
                <input
                  required
                  type="date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  className="planner-input"
                />
              </label>

              <label className="planner-field md:col-span-2">
                <span className="planner-eyebrow mb-1 block">{t.targetGrade}</span>
                <input
                  type="text"
                  value={targetGrade}
                  onChange={(event) => setTargetGrade(event.target.value)}
                  className="planner-input"
                />
              </label>
            </section>

            <section className="planner-card">
              <p className="planner-eyebrow">{t.workloadSection}</p>
              <p className="mt-1 text-sm text-slate-600">{t.workloadHelp}</p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="planner-field">
                  <span className="planner-eyebrow mb-1 block">{t.workloadStatus}</span>
                  <select
                    value={workloadReadiness}
                    onChange={(event) =>
                      setWorkloadReadiness(event.target.value as WorkloadReadiness)
                    }
                    className="planner-input"
                  >
                    <option value="known">{t.workloadKnown}</option>
                    <option value="unknown">{t.workloadUnknown}</option>
                  </select>
                </label>

                <label className="planner-field">
                  <span className="planner-eyebrow mb-1 block">{t.materialType}</span>
                  <select
                    value={materialType}
                    onChange={(event) => {
                      const nextType = event.target.value as MaterialType;
                      setMaterialType(nextType);
                      if (nextType !== "book") {
                        setMaterialShape(defaultMaterialShape(nextType));
                      }
                    }}
                    className="planner-input"
                  >
                    <option value="book">{t.materialBook}</option>
                    <option value="notes">{t.materialNotes}</option>
                    <option value="mixed">{t.materialMixed}</option>
                  </select>
                  <p className="mt-2 text-sm text-slate-500">{t.materialTypeHelp}</p>
                </label>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {t.notebookTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t.notebookIntro}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    { type: "book", title: t.notebookBookTitle, body: t.notebookBookBody },
                    { type: "notes", title: t.notebookNotesTitle, body: t.notebookNotesBody },
                    { type: "mixed", title: t.notebookMixedTitle, body: t.notebookMixedBody },
                  ].map((item) => {
                    const isActive = materialType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          const nextType = item.type as MaterialType;
                          setMaterialType(nextType);
                          if (nextType !== "book") {
                            setMaterialShape(defaultMaterialShape(nextType));
                          }
                        }}
                        className={`rounded-xl border px-3 py-2 ${
                          isActive
                            ? "border-slate-400 bg-white text-slate-900 shadow-sm"
                            : "border-slate-200 bg-white/80 text-slate-700"
                        }`}
                      >
                        <p className="text-xs font-semibold">{item.title}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">{activeNotebook.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{activeNotebook.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.notebookScopeHint}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">{t.notebookFocusTitle}: </span>
                    {t.notebookFocusBody} <span className="font-semibold">{activeNotebook.title}</span>.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">{workloadRecommendation(materialType, t)}</p>
                </div>
              </div>

              {(materialType === "book" || materialType === "mixed") ? (
                <div className="mt-3">
                  <BookSearchTypeahead
                    idPrefix="exam-book"
                    label={t.bookLookupLabel}
                    query={bookLookupQuery}
                    subjectHint={
                      subjectMode === "existing"
                        ? subjects.find((subject) => subject.id === selectedSubjectId)?.name ?? ""
                        : newSubjectName
                    }
                    placeholder={t.bookLookupHint}
                    helpText={t.bookLookupHelp}
                    onQueryChange={(value) => {
                      setBookLookupQuery(value);
                      setSelectedBook(null);
                    }}
                    onSelect={(item) => {
                      setSelectedBook(item);
                      setBookLookupQuery(item.title);
                      if (!pagesTouched && item.verified_page_count) {
                        setTotalPages(String(item.verified_page_count));
                      }
                    }}
                  />
                </div>
              ) : null}

              {selectedBook ? (
                <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{t.selectedBook}: {selectedBook.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {t.verifiedPages}: <strong>{selectedBook.verified_page_count ?? "-"}</strong>
                    {" | "}
                    {t.confidence}: <strong>{pct(selectedBook.confidence_score)}</strong>
                    {" | "}
                    {t.sourceLabel}: <strong>{sourceLabel(selectedBook.source, t)}</strong>
                  </p>
                </div>
              ) : null}

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {t.scopePlanner}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t.scopePlannerHint}</p>

                {(materialType === "book" || materialType === "mixed") ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="planner-field md:col-span-3">
                      <span className="planner-eyebrow mb-1 block">{t.bookCoverageLabel}</span>
                      <select
                        value={bookCoverageMode}
                        onChange={(event) =>
                          setBookCoverageMode(event.target.value as BookCoverageMode)
                        }
                        className="planner-input"
                      >
                        <option value="full_book">{t.coverageFull}</option>
                        <option value="page_range">{t.coverageRange}</option>
                      </select>
                    </label>
                    {bookCoverageMode === "page_range" ? (
                      <>
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.pageStart}</span>
                          <input
                            type="number"
                            min={1}
                            value={bookPageStart}
                            onChange={(event) => setBookPageStart(event.target.value)}
                            className="planner-input"
                          />
                        </label>
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.pageEnd}</span>
                          <input
                            type="number"
                            min={1}
                            value={bookPageEnd}
                            onChange={(event) => setBookPageEnd(event.target.value)}
                            className="planner-input"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {(materialType === "notes" || materialType === "mixed") ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <label className="planner-field md:col-span-2">
                      <span className="planner-eyebrow mb-1 block">{t.materialShapeLabel}</span>
                      <select
                        value={materialShape}
                        onChange={(event) =>
                          setMaterialShape(event.target.value as ExamWorkloadMaterialShape)
                        }
                        className="planner-input"
                      >
                        {materialShapeOptions(t).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-slate-500">{t.materialShapeHint}</p>
                    </label>
                    <label className="planner-field">
                      <span className="planner-eyebrow mb-1 block">{t.approximateScopeValue}</span>
                      <input
                        type="number"
                        min={1}
                        value={approximateScopeValue}
                        onChange={(event) => setApproximateScopeValue(event.target.value)}
                        className="planner-input"
                      />
                    </label>
                    <label className="planner-field">
                      <span className="planner-eyebrow mb-1 block">{t.approximateScopeUnit}</span>
                      <select
                        value={approximateScopeUnit}
                        onChange={(event) =>
                          setApproximateScopeUnit(
                            event.target.value as ExamWorkloadApproximateScopeUnit,
                          )
                        }
                        className="planner-input"
                      >
                        {approximateScopeUnitOptions(t).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="planner-field">
                  <span className="planner-eyebrow mb-1 block">{t.totalPages}</span>
                  <input
                    type="number"
                    min={1}
                    value={totalPages}
                    onChange={(event) => {
                      setPagesTouched(true);
                      setTotalPages(event.target.value);
                    }}
                    className="planner-input"
                  />
                </label>

                <label className="planner-field">
                  <span className="planner-eyebrow mb-1 block">{t.materialDetails}</span>
                  <input
                    type="text"
                    value={materialDetails}
                    onChange={(event) => setMaterialDetails(event.target.value)}
                    className="planner-input"
                  />
                </label>
              </div>

              <label className="planner-field mt-3 block">
                <span className="planner-eyebrow mb-1 block">{t.notesSummary}</span>
                <input
                  type="text"
                  value={notesSummary}
                  onChange={(event) => setNotesSummary(event.target.value)}
                  className="planner-input"
                />
              </label>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="planner-btn planner-btn-accent w-full"
            >
              {t.addExam}
            </button>
          </form>
        )}
      </section>

      <section className="planner-panel">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {t.list} ({examTracks.length})
          </h2>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="planner-btn planner-btn-secondary"
          >
            {t.refresh}
          </button>
        </div>

        {examTracks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{t.none}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {examTracks.map((track) => {
              const examMeta = examById.get(track.examId);
              const workloadPayload = examMeta?.workloadPayload ?? null;
              const hasRealPages =
                normalizePositivePageCount(workloadPayload?.totalPages) != null ||
                normalizePositivePageCount(workloadPayload?.verifiedPageCount) != null ||
                (workloadPayload?.bookCoverageMode === "page_range" &&
                  typeof workloadPayload.bookPageStart === "number" &&
                  typeof workloadPayload.bookPageEnd === "number");
              const pageRangeTotal =
                workloadPayload?.bookCoverageMode === "page_range" &&
                typeof workloadPayload.bookPageStart === "number" &&
                typeof workloadPayload.bookPageEnd === "number"
                  ? Math.max(0, workloadPayload.bookPageEnd - workloadPayload.bookPageStart + 1)
                  : undefined;
              const displayTotalPages = hasRealPages
                ? normalizePositivePageCount(workloadPayload?.totalPages) ??
                  normalizePositivePageCount(workloadPayload?.verifiedPageCount) ??
                  pageRangeTotal
                : track.estimatedPagesSource !== "inferred"
                  ? track.estimatedPages
                : undefined;
              const displayCompletedPages =
                displayTotalPages != null
                  ? Math.min(track.completedPages, displayTotalPages)
                  : track.completedPages;
              const displayPageLabel =
                displayTotalPages != null
                  ? `${displayCompletedPages}/${displayTotalPages}p`
                  : displayCompletedPages > 0
                    ? `${displayCompletedPages}p done`
                    : t.noPages;
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(track.examDate).getTime() - (currentTimeMs ?? 0)) / MS_PER_DAY,
                ),
              );
              const materialTypeLabel =
                examMeta?.materialType === "notes"
                  ? t.materialNotes
                  : examMeta?.materialType === "mixed"
                    ? t.materialMixed
                    : t.materialBook;
              const notesSummaryPreview = workloadPayload?.notesSummary
                ? truncateText(workloadPayload.notesSummary, 60)
                : null;
              return (
                <li key={track.examId} className="planner-card bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{track.examTitle}</p>
                        <span className="planner-chip bg-white text-slate-700">
                          {examMeta?.workloadReadiness === "known"
                            ? t.workloadKnownChip
                            : t.workloadUnknownChip}
                        </span>
                        <span className="planner-chip bg-white text-slate-700">
                          {materialTypeLabel}
                        </span>
                        {examMeta?.workloadReadiness === "unknown" ? (
                          <span className="planner-chip border-amber-200 bg-amber-50 text-amber-900">
                            {t.provisional}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        {track.subjectName} -{" "}
                        {new Date(track.examDate).toLocaleDateString(
                          language === "it" ? "it-IT" : "en-US",
                        )}
                        <span
                          className="ml-2 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
                          title={`${daysLeft} ${t.daysLeft}`}
                        >
                          {daysLeft}d
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${progressStateClasses(track.progressState)}`}>
                          {t.readiness}: {progressStateLabel(track.progressState, t)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 font-semibold ${focusContributionClasses(track.focusContributionLevel)}`}>
                          {t.focusContribution}: {focusContributionLabel(track.focusContributionLevel, t)} ({track.focusContributionPercent}%)
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                          {displayPageLabel}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                          {t.focusSignals}: {track.sessionsCompleted} / {t.focusMinutes}: {track.minutesSpent}m
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                          {track.estimatedPagesSource === "workload"
                            ? t.scopeWorkload
                            : track.estimatedPagesSource === "approximate"
                              ? t.scopeApproximate
                              : t.scopeInferred}
                        </span>
                      </div>
                      {workloadPayload ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                          {workloadPayload.bookTitle ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                              {workloadPayload.bookTitle}
                            </span>
                          ) : null}
                          {workloadPayload.bookCoverageMode === "page_range" &&
                          typeof workloadPayload.bookPageStart === "number" &&
                          typeof workloadPayload.bookPageEnd === "number" ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                              pp. {workloadPayload.bookPageStart}-{workloadPayload.bookPageEnd}
                            </span>
                          ) : null}
                          {typeof workloadPayload.totalPages === "number" ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                              {workloadPayload.totalPages}p
                            </span>
                          ) : null}
                          {typeof workloadPayload.approximateScopeValue === "number" &&
                          workloadPayload.approximateScopeUnit ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                              {workloadPayload.approximateScopeValue} {workloadPayload.approximateScopeUnit}
                            </span>
                          ) : null}
                          {workloadPayload.materialShape ? (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                              {workloadPayload.materialShape.replace(/_/g, " ")}
                            </span>
                          ) : null}
                          {notesSummaryPreview ? (
                            <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1">
                              {notesSummaryPreview}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditWorkload(track.examId)}
                        className="planner-btn planner-btn-secondary min-h-0 py-1.5"
                      >
                        {t.editWorkload}
                      </button>
                      <Link
                        href={`/planner?exam=${track.examId}`}
                        className="planner-btn planner-btn-secondary min-h-0 py-1.5"
                      >
                        {t.openTimeline}
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteExam(track.examId)}
                        className="planner-btn planner-btn-danger min-h-0 py-1.5"
                        aria-label={`${t.delete} ${track.examTitle}`}
                      >
                        {t.delete} x
                      </button>
                    </div>
                  </div>
                  {editingExamId === track.examId ? (
                    <div className="mt-3 w-full space-y-3 border-t border-slate-200 pt-3">
                      <p className="planner-eyebrow">{t.editWorkload}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.workloadStatus}</span>
                          <select
                            value={editWorkloadReadiness}
                            onChange={(event) =>
                              setEditWorkloadReadiness(event.target.value as WorkloadReadiness)
                            }
                            className="planner-input"
                          >
                            <option value="known">{t.workloadKnown}</option>
                            <option value="unknown">{t.workloadUnknown}</option>
                          </select>
                        </label>
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.materialType}</span>
                          <select
                            value={editMaterialType}
                            onChange={(event) => {
                              const nextType = event.target.value as MaterialType;
                              setEditMaterialType(nextType);
                              if (nextType !== "book") {
                                setEditMaterialShape(defaultMaterialShape(nextType));
                              }
                            }}
                            className="planner-input"
                          >
                            <option value="book">{t.materialBook}</option>
                            <option value="notes">{t.materialNotes}</option>
                            <option value="mixed">{t.materialMixed}</option>
                          </select>
                        </label>
                      </div>
                      {(editMaterialType === "book" || editMaterialType === "mixed") ? (
                        <BookSearchTypeahead
                          idPrefix={`edit-book-${track.examId}`}
                          label={t.bookLookupLabel}
                          query={editBookLookupQuery}
                          subjectHint={examMeta?.subject.name ?? ""}
                          placeholder={t.bookLookupHint}
                          helpText={t.bookLookupHelp}
                          onQueryChange={(value) => {
                            setEditBookLookupQuery(value);
                            setEditSelectedBook(null);
                          }}
                          onSelect={(item) => {
                            setEditSelectedBook(item);
                            setEditBookLookupQuery(item.title);
                            if (!editPagesTouched && item.verified_page_count) {
                              setEditTotalPages(String(item.verified_page_count));
                            }
                          }}
                        />
                      ) : null}
                      {editSelectedBook ? (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">
                            {t.selectedBook}: {editSelectedBook.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {t.verifiedPages}: <strong>{editSelectedBook.verified_page_count ?? "—"}</strong>
                            {" | "}
                            {t.confidence}: <strong>{pct(editSelectedBook.confidence_score)}</strong>
                            {" | "}
                            {t.sourceLabel}: <strong>{sourceLabel(editSelectedBook.source, t)}</strong>
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {t.scopePlanner}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{t.scopePlannerHint}</p>

                        {(editMaterialType === "book" || editMaterialType === "mixed") ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <label className="planner-field md:col-span-3">
                              <span className="planner-eyebrow mb-1 block">{t.bookCoverageLabel}</span>
                              <select
                                value={editBookCoverageMode}
                                onChange={(event) =>
                                  setEditBookCoverageMode(
                                    event.target.value as BookCoverageMode,
                                  )
                                }
                                className="planner-input"
                              >
                                <option value="full_book">{t.coverageFull}</option>
                                <option value="page_range">{t.coverageRange}</option>
                              </select>
                            </label>
                            {editBookCoverageMode === "page_range" ? (
                              <>
                                <label className="planner-field">
                                  <span className="planner-eyebrow mb-1 block">{t.pageStart}</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={editBookPageStart}
                                    onChange={(event) => setEditBookPageStart(event.target.value)}
                                    className="planner-input"
                                  />
                                </label>
                                <label className="planner-field">
                                  <span className="planner-eyebrow mb-1 block">{t.pageEnd}</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={editBookPageEnd}
                                    onChange={(event) => setEditBookPageEnd(event.target.value)}
                                    className="planner-input"
                                  />
                                </label>
                              </>
                            ) : null}
                          </div>
                        ) : null}

                        {(editMaterialType === "notes" || editMaterialType === "mixed") ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-4">
                            <label className="planner-field md:col-span-2">
                              <span className="planner-eyebrow mb-1 block">{t.materialShapeLabel}</span>
                              <select
                                value={editMaterialShape}
                                onChange={(event) =>
                                  setEditMaterialShape(
                                    event.target.value as ExamWorkloadMaterialShape,
                                  )
                                }
                                className="planner-input"
                              >
                                {materialShapeOptions(t).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-2 text-sm text-slate-500">{t.materialShapeHint}</p>
                            </label>
                            <label className="planner-field">
                              <span className="planner-eyebrow mb-1 block">{t.approximateScopeValue}</span>
                              <input
                                type="number"
                                min={1}
                                value={editApproximateScopeValue}
                                onChange={(event) =>
                                  setEditApproximateScopeValue(event.target.value)
                                }
                                className="planner-input"
                              />
                            </label>
                            <label className="planner-field">
                              <span className="planner-eyebrow mb-1 block">{t.approximateScopeUnit}</span>
                              <select
                                value={editApproximateScopeUnit}
                                onChange={(event) =>
                                  setEditApproximateScopeUnit(
                                    event.target.value as ExamWorkloadApproximateScopeUnit,
                                  )
                                }
                                className="planner-input"
                              >
                                {approximateScopeUnitOptions(t).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.totalPages}</span>
                          <input
                            type="number"
                            min={1}
                            value={editTotalPages}
                            onChange={(event) => {
                              setEditPagesTouched(true);
                              setEditTotalPages(event.target.value);
                            }}
                            className="planner-input"
                          />
                        </label>
                        <label className="planner-field">
                          <span className="planner-eyebrow mb-1 block">{t.materialDetails}</span>
                          <input
                            type="text"
                            value={editMaterialDetails}
                            onChange={(event) => setEditMaterialDetails(event.target.value)}
                            className="planner-input"
                          />
                        </label>
                      </div>
                      <label className="planner-field block">
                        <span className="planner-eyebrow mb-1 block">{t.notesSummary}</span>
                        <input
                          type="text"
                          value={editNotesSummary}
                          onChange={(event) => setEditNotesSummary(event.target.value)}
                          className="planner-input"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEditWorkload(track.examId)}
                          disabled={editSubmitting}
                          className="planner-btn planner-btn-accent"
                        >
                          {t.saveWorkload}
                        </button>
                        <button
                          type="button"
                          onClick={closeEditWorkload}
                          className="planner-btn planner-btn-secondary"
                        >
                          {t.cancelEdit}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {message || dataErrorMessage ? (
        <section className="planner-alert" role="status" aria-live="polite">
          {message || dataErrorMessage}
        </section>
      ) : null}
    </main>
  );
}
