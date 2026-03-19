"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useUiLanguage } from "@/app/_hooks/use-ui-language";
import { requestJson } from "@/app/planner/_lib/client-api";
import type {
  MaterialSearchResult,
  StudyMaterialOrigin,
  StudyMaterialRecord,
  StudyMaterialVerificationLevel,
} from "@/lib/study-domain";

type TargetMaterialManagerProps = {
  examId: string;
  subjectId: string;
  subjectName: string;
  examTitle: string;
  initialMaterials?: StudyMaterialRecord[];
  onChange?: () => void;
};

type SearchResponse = {
  query: string;
  subject: string;
  items: MaterialSearchResult[];
};

const COPY = {
  en: {
    materials: "Materials",
    intro: "Use only rights-safe sources, plus your own links and uploads.",
    refresh: "Refresh materials",
    loading: "Loading linked materials...",
    openLink: "Open link",
    download: "Download",
    remove: "Remove",
    noMaterials: "No materials linked yet. Search open sources or add your own.",
    searchPlaceholder: "Search books, OER, or official resources",
    searching: "Searching...",
    search: "Search",
    searchHint: "Results only include open, official, or otherwise rights-safe sources.",
    previewOnly: "Preview only",
    linkToGoal: "Link to goal",
    ownLink: "Add your own link",
    ownLinkTitlePlaceholder: "Course page, teacher folder, official notes",
    ownLinkUrlPlaceholder: "https://",
    estimatedPagesPlaceholder: "Estimated pages",
    notePlaceholder: "Short note",
    saveLink: "Save link",
    uploadTitle: "Upload your file",
    uploadTitlePlaceholder: "Lecture notes, worksheet, or chapter summary",
    fileLabelPlaceholder: "File label",
    uploadNotePlaceholder: "What is inside?",
    uploadFile: "Upload file",
    uploading: "Uploading...",
    couldNotLoad: "Could not load materials.",
    couldNotSearch: "Could not search materials.",
    couldNotSaveMaterial: "Could not save this material.",
    materialLinked: "Material linked to this goal.",
    previewSaved: "Preview or metadata link saved as a planning reference.",
    addTitleAndLink: "Add a title and a link first.",
    couldNotSaveLink: "Could not save the link.",
    linkSaved: "Link saved.",
    chooseFileFirst: "Choose a file to upload.",
    couldNotUploadFile: "Could not upload the file.",
    fileUploaded: "File uploaded.",
    couldNotRemoveMaterial: "Could not remove the material.",
    materialRemoved: "Material removed.",
    verificationOfficial: "Official",
    verificationVerified: "Verified",
    verificationDiscovered: "Discovered",
    verificationUserAdded: "User added",
    originOpenVerified: "Open verified",
    originOfficial: "Official",
    originUpload: "Your upload",
    originLink: "Your link",
    pagesUnit: "pages",
  },
  it: {
    materials: "Materiali",
    intro: "Usa solo fonti rights-safe, piu i tuoi link e file personali.",
    refresh: "Aggiorna materiali",
    loading: "Caricamento materiali collegati...",
    openLink: "Apri link",
    download: "Scarica",
    remove: "Rimuovi",
    noMaterials: "Nessun materiale collegato. Cerca fonti aperte oppure aggiungi i tuoi materiali.",
    searchPlaceholder: "Cerca libri, OER o risorse ufficiali",
    searching: "Ricerca in corso...",
    search: "Cerca",
    searchHint: "I risultati includono solo fonti aperte, ufficiali o comunque rights-safe.",
    previewOnly: "Solo anteprima",
    linkToGoal: "Collega all'obiettivo",
    ownLink: "Aggiungi un tuo link",
    ownLinkTitlePlaceholder: "Pagina del corso, cartella docente, appunti ufficiali",
    ownLinkUrlPlaceholder: "https://",
    estimatedPagesPlaceholder: "Pagine stimate",
    notePlaceholder: "Nota breve",
    saveLink: "Salva link",
    uploadTitle: "Carica un tuo file",
    uploadTitlePlaceholder: "Dispense, appunti o riassunto del capitolo",
    fileLabelPlaceholder: "Etichetta file",
    uploadNotePlaceholder: "Che cosa contiene?",
    uploadFile: "Carica file",
    uploading: "Caricamento...",
    couldNotLoad: "Impossibile caricare i materiali.",
    couldNotSearch: "Impossibile cercare i materiali.",
    couldNotSaveMaterial: "Impossibile salvare questo materiale.",
    materialLinked: "Materiale collegato a questo obiettivo.",
    previewSaved: "Link di anteprima o metadata salvato come riferimento per il piano.",
    addTitleAndLink: "Aggiungi prima un titolo e un link.",
    couldNotSaveLink: "Impossibile salvare il link.",
    linkSaved: "Link salvato.",
    chooseFileFirst: "Scegli prima un file da caricare.",
    couldNotUploadFile: "Impossibile caricare il file.",
    fileUploaded: "File caricato.",
    couldNotRemoveMaterial: "Impossibile rimuovere il materiale.",
    materialRemoved: "Materiale rimosso.",
    verificationOfficial: "Ufficiale",
    verificationVerified: "Verificato",
    verificationDiscovered: "Individuato",
    verificationUserAdded: "Aggiunto da te",
    originOpenVerified: "Open verified",
    originOfficial: "Fonte ufficiale",
    originUpload: "Tuo file",
    originLink: "Tuo link",
    pagesUnit: "pagine",
  },
} as const;

function inferMaterialType(result: MaterialSearchResult) {
  if (result.sourceLabel.includes("Books")) {
    return "TEXTBOOK" as const;
  }
  if (result.sourceLabel.includes("Open Library")) {
    return "TEXTBOOK" as const;
  }
  return "OPEN_RESOURCE" as const;
}

function verificationTone(verificationLevel: StudyMaterialVerificationLevel) {
  if (verificationLevel === "OFFICIAL" || verificationLevel === "VERIFIED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (verificationLevel === "DISCOVERED") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function originLabel(
  origin: StudyMaterialOrigin,
  t: (typeof COPY)[keyof typeof COPY],
) {
  if (origin === "OPEN_VERIFIED") return t.originOpenVerified;
  if (origin === "OFFICIAL_SOURCE") return t.originOfficial;
  if (origin === "USER_UPLOAD") return t.originUpload;
  return t.originLink;
}

function verificationLabel(
  verificationLevel: StudyMaterialVerificationLevel,
  t: (typeof COPY)[keyof typeof COPY],
) {
  if (verificationLevel === "OFFICIAL") return t.verificationOfficial;
  if (verificationLevel === "VERIFIED") return t.verificationVerified;
  if (verificationLevel === "DISCOVERED") return t.verificationDiscovered;
  return t.verificationUserAdded;
}

export function TargetMaterialManager({
  examId,
  subjectId,
  subjectName,
  examTitle,
  initialMaterials = [],
  onChange,
}: TargetMaterialManagerProps) {
  const { language } = useUiLanguage("en");
  const t = COPY[language] ?? COPY.en;
  const [materials, setMaterials] = useState<StudyMaterialRecord[]>(initialMaterials);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MaterialSearchResult[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [linkScope, setLinkScope] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadScope, setUploadScope] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  async function refreshMaterials() {
    setLoading(true);
    const response = await requestJson<StudyMaterialRecord[]>(
      `/api/materials?examId=${encodeURIComponent(examId)}`,
    );
    setLoading(false);

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? t.couldNotLoad);
      return;
    }

    setMaterials(response.payload.data);
  }

  async function searchMaterials() {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const response = await requestJson<SearchResponse>(
      `/api/materials/search?q=${encodeURIComponent(trimmedQuery)}&subject=${encodeURIComponent(subjectName)}`,
    );
    setSearching(false);

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? t.couldNotSearch);
      return;
    }

    setSearchResults(response.payload.data.items);
  }

  async function saveSearchResult(result: MaterialSearchResult) {
    const response = await requestJson<StudyMaterialRecord>("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId,
        subjectId,
        type: inferMaterialType(result),
        origin: result.origin,
        title: result.title,
        url: result.url,
        licenseHint: result.licenseHint,
        availabilityHint: result.availabilityHint,
        verificationLevel: result.verificationLevel,
        estimatedScopePages: result.estimatedScopePages,
        notes: result.previewOnly ? t.previewSaved : undefined,
      }),
    });

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? t.couldNotSaveMaterial);
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setMessage(t.materialLinked);
    onChange?.();
  }

  async function saveUserLink(event: FormEvent) {
    event.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setMessage(t.addTitleAndLink);
      return;
    }

    const response = await requestJson<StudyMaterialRecord>("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId,
        subjectId,
        type: "COURSE_LINK",
        origin: "USER_LINK",
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        notes: linkNotes.trim() || undefined,
        estimatedScopePages: linkScope ? Number(linkScope) : undefined,
      }),
    });

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? t.couldNotSaveLink);
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setLinkTitle("");
    setLinkUrl("");
    setLinkNotes("");
    setLinkScope("");
    setMessage(t.linkSaved);
    onChange?.();
  }

  async function uploadUserFile(event: FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      setMessage(t.chooseFileFirst);
      return;
    }

    const formData = new FormData();
    formData.set("file", uploadFile);
    formData.set("examId", examId);
    formData.set("subjectId", subjectId);
    formData.set("title", uploadTitle.trim() || uploadFile.name);
    if (uploadNotes.trim()) {
      formData.set("notes", uploadNotes.trim());
    }
    if (uploadScope) {
      formData.set("estimatedScopePages", uploadScope);
    }

    setUploading(true);
    const response = await requestJson<StudyMaterialRecord>("/api/materials", {
      method: "POST",
      body: formData,
    });
    setUploading(false);

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? t.couldNotUploadFile);
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setUploadTitle("");
    setUploadScope("");
    setUploadNotes("");
    setUploadFile(null);
    setMessage(t.fileUploaded);
    onChange?.();
  }

  async function deleteMaterial(materialId: string) {
    const response = await requestJson<{ id: string }>(
      `/api/materials?id=${encodeURIComponent(materialId)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      setMessage(response.payload.error ?? t.couldNotRemoveMaterial);
      return;
    }

    setMaterials((current) => current.filter((item) => item.id !== materialId));
    setMessage(t.materialRemoved);
    onChange?.();
  }

  const visibleSearchResults = useMemo(() => searchResults.slice(0, 6), [searchResults]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="planner-eyebrow">{t.materials}</p>
          <h4 className="mt-1 text-base font-semibold text-slate-900">{examTitle}</h4>
          <p className="mt-1 text-sm text-slate-600">{t.intro}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshMaterials()}
          className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
        >
          {t.refresh}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-600">{t.loading}</p>
        ) : materials.length > 0 ? (
          <div className="grid gap-2">
            {materials.map((material) => (
              <article
                key={material.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="planner-chip border-slate-200 bg-white text-slate-700">
                        {originLabel(material.origin, t)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${verificationTone(material.verificationLevel)}`}
                      >
                        {verificationLabel(material.verificationLevel, t)}
                      </span>
                      {typeof material.estimatedScopePages === "number" ? (
                        <span className="planner-chip border-slate-200 bg-white text-slate-700">
                          {material.estimatedScopePages} {t.pagesUnit}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{material.title}</p>
                    {material.notes ? (
                      <p className="mt-1 text-xs text-slate-600">{material.notes}</p>
                    ) : null}
                    {material.licenseHint || material.availabilityHint ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {[material.licenseHint, material.availabilityHint]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {material.url ? (
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noreferrer"
                        className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
                      >
                        {t.openLink}
                      </a>
                    ) : null}
                    {material.fileKey ? (
                      <a
                        href={`/api/materials/file?key=${encodeURIComponent(material.fileKey)}`}
                        className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
                      >
                        {t.download}
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void deleteMaterial(material.id)}
                      className="planner-btn planner-btn-danger min-h-0 px-3 py-2"
                    >
                      {t.remove}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">{t.noMaterials}</p>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="planner-input flex-1"
            />
            <button
              type="button"
              onClick={() => void searchMaterials()}
              disabled={searching}
              className="planner-btn planner-btn-accent min-h-0 px-4 py-2"
            >
              {searching ? t.searching : t.search}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.searchHint}</p>
          <div className="mt-3 space-y-2">
            {visibleSearchResults.map((result) => (
              <article
                key={result.id}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="planner-chip border-slate-200 bg-slate-100 text-slate-700">
                        {result.sourceLabel}
                      </span>
                      {result.previewOnly ? (
                        <span className="planner-chip border-amber-200 bg-amber-50 text-amber-900">
                          {t.previewOnly}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{result.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {[result.authors?.join(", "), result.licenseHint, result.availabilityHint]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSearchResult(result)}
                    className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
                  >
                    {t.linkToGoal}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={(event) => void saveUserLink(event)}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
          >
            <p className="text-sm font-semibold text-slate-900">{t.ownLink}</p>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                placeholder={t.ownLinkTitlePlaceholder}
                className="planner-input"
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder={t.ownLinkUrlPlaceholder}
                className="planner-input"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={linkScope}
                  onChange={(event) => setLinkScope(event.target.value)}
                  placeholder={t.estimatedPagesPlaceholder}
                  className="planner-input"
                />
                <input
                  type="text"
                  value={linkNotes}
                  onChange={(event) => setLinkNotes(event.target.value)}
                  placeholder={t.notePlaceholder}
                  className="planner-input"
                />
              </div>
              <button
                type="submit"
                className="planner-btn planner-btn-secondary min-h-0 px-4 py-2"
              >
                {t.saveLink}
              </button>
            </div>
          </form>

          <form
            onSubmit={(event) => void uploadUserFile(event)}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
          >
            <p className="text-sm font-semibold text-slate-900">{t.uploadTitle}</p>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder={t.fileLabelPlaceholder}
                className="planner-input"
              />
              <input
                type="file"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                className="planner-input"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={uploadScope}
                  onChange={(event) => setUploadScope(event.target.value)}
                  placeholder={t.estimatedPagesPlaceholder}
                  className="planner-input"
                />
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(event) => setUploadNotes(event.target.value)}
                  placeholder={t.uploadNotePlaceholder}
                  className="planner-input"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="planner-btn planner-btn-secondary min-h-0 px-4 py-2"
              >
                {uploading ? t.uploading : t.uploadFile}
              </button>
            </div>
          </form>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
