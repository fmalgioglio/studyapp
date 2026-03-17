"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

function originLabel(origin: StudyMaterialOrigin) {
  if (origin === "OPEN_VERIFIED") return "Open verified";
  if (origin === "OFFICIAL_SOURCE") return "Official";
  if (origin === "USER_UPLOAD") return "Your upload";
  return "Your link";
}

export function TargetMaterialManager({
  examId,
  subjectId,
  subjectName,
  examTitle,
  initialMaterials = [],
  onChange,
}: TargetMaterialManagerProps) {
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
      setMessage(response.payload.error ?? "Could not load materials.");
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
      setMessage(response.payload.error ?? "Could not search materials.");
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
        notes: result.previewOnly
          ? "Preview or metadata link saved as a planning reference."
          : undefined,
      }),
    });

    if (!response.ok || !response.payload.data) {
      setMessage(response.payload.error ?? "Could not save this material.");
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setMessage("Material linked to this target.");
    onChange?.();
  }

  async function saveUserLink(event: FormEvent) {
    event.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setMessage("Add a title and a link first.");
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
      setMessage(response.payload.error ?? "Could not save the link.");
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setLinkTitle("");
    setLinkUrl("");
    setLinkNotes("");
    setLinkScope("");
    setMessage("Link saved.");
    onChange?.();
  }

  async function uploadUserFile(event: FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      setMessage("Choose a file to upload.");
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
      setMessage(response.payload.error ?? "Could not upload the file.");
      return;
    }

    setMaterials((current) => [response.payload.data!, ...current]);
    setUploadTitle("");
    setUploadScope("");
    setUploadNotes("");
    setUploadFile(null);
    setMessage("File uploaded.");
    onChange?.();
  }

  async function deleteMaterial(materialId: string) {
    const response = await requestJson<{ id: string }>(
      `/api/materials?id=${encodeURIComponent(materialId)}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      setMessage(response.payload.error ?? "Could not remove the material.");
      return;
    }

    setMaterials((current) => current.filter((item) => item.id !== materialId));
    setMessage("Material removed.");
    onChange?.();
  }

  const visibleSearchResults = useMemo(() => searchResults.slice(0, 6), [searchResults]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="planner-eyebrow">Materials</p>
          <h4 className="mt-1 text-base font-semibold text-slate-900">{examTitle}</h4>
          <p className="mt-1 text-sm text-slate-600">
            Rights-safe search only, plus your own links and uploads.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshMaterials()}
          className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
        >
          Refresh materials
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-600">Loading linked materials...</p>
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
                        {originLabel(material.origin)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${verificationTone(material.verificationLevel)}`}
                      >
                        {material.verificationLevel.toLowerCase().replace(/_/g, " ")}
                      </span>
                      {typeof material.estimatedScopePages === "number" ? (
                        <span className="planner-chip border-slate-200 bg-white text-slate-700">
                          {material.estimatedScopePages} pages
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
                          .join(" • ")}
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
                        Open link
                      </a>
                    ) : null}
                    {material.fileKey ? (
                      <a
                        href={`/api/materials/file?key=${encodeURIComponent(material.fileKey)}`}
                        className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
                      >
                        Download
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void deleteMaterial(material.id)}
                      className="planner-btn planner-btn-danger min-h-0 px-3 py-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            No materials linked yet. Search open sources or add your own.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search books, OER, or official resources"
              className="planner-input flex-1"
            />
            <button
              type="button"
              onClick={() => void searchMaterials()}
              disabled={searching}
              className="planner-btn planner-btn-accent min-h-0 px-4 py-2"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Results only include open, official, or otherwise rights-safe sources.
          </p>
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
                          Preview only
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{result.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {[result.authors?.join(", "), result.licenseHint, result.availabilityHint]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSearchResult(result)}
                    className="planner-btn planner-btn-secondary min-h-0 px-3 py-2"
                  >
                    Link to target
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
            <p className="text-sm font-semibold text-slate-900">Add your own link</p>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                placeholder="Course page, teacher folder, official notes"
                className="planner-input"
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://"
                className="planner-input"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={linkScope}
                  onChange={(event) => setLinkScope(event.target.value)}
                  placeholder="Estimated pages"
                  className="planner-input"
                />
                <input
                  type="text"
                  value={linkNotes}
                  onChange={(event) => setLinkNotes(event.target.value)}
                  placeholder="Short note"
                  className="planner-input"
                />
              </div>
              <button type="submit" className="planner-btn planner-btn-secondary min-h-0 px-4 py-2">
                Save link
              </button>
            </div>
          </form>

          <form
            onSubmit={(event) => void uploadUserFile(event)}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
          >
            <p className="text-sm font-semibold text-slate-900">Upload personal file</p>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder="File label"
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
                  placeholder="Estimated pages"
                  className="planner-input"
                />
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(event) => setUploadNotes(event.target.value)}
                  placeholder="What is inside?"
                  className="planner-input"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="planner-btn planner-btn-secondary min-h-0 px-4 py-2"
              >
                {uploading ? "Uploading..." : "Upload file"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
