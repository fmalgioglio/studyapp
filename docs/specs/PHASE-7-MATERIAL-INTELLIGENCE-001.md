# PHASE-7-MATERIAL-INTELLIGENCE-001

## 1. Task ID

- Task ID: PHASE-7-MATERIAL-INTELLIGENCE-001

## 2. Problem

- What is broken or missing:
  - StudyApp can save linked materials, but the new public-link inspector is not wired into the live create/update path.
  - Planner scope currently benefits from linked material page estimates only when the user enters them manually.
  - The API still accepts localhost/private-host links as long as they pass generic URL validation.
- Why it matters now:
  - Phase 7 needs linked public materials to improve planner context with minimal, rights-safe intelligence.

## 3. Scope

- In scope:
  - Wire the material-link inspector into `POST /api/materials` and `PATCH /api/materials`.
  - Block non-public link targets before persistence.
  - Enrich saved linked materials with derived scope pages and short extraction hints using existing schema fields.
  - Add route coverage for blocked links and inspector-based enrichment.
- In scope constraints:
  - Reuse existing `StudyMaterial` fields only.
  - Keep crawling disabled and inspect only the exact link provided by the user.

## 4. Out of Scope

- Not in scope:
  - Prisma schema changes for structured extraction metadata.
  - Background extraction jobs or asynchronous queues.
  - UI redesign of the materials manager.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/api/materials/route.ts`
  - `src/server/services/material-link-inspector.ts`
  - `tests/api/materials.route.test.ts`
  - `docs/core/04-logbook.md`
- Layers impacted:
  - API
  - Service
  - Tests

## 6. Acceptance Criteria

1. [ ] `POST /api/materials` rejects localhost/private-host links even if they pass generic URL validation.
2. [ ] `POST /api/materials` and `PATCH /api/materials` enrich public links with inspector-derived `estimatedScopePages` when the user did not provide one.
3. [ ] Existing user-entered `estimatedScopePages`, `availabilityHint`, and `notes` remain authoritative when already provided.
4. [ ] Material create/update remains successful when public-link inspection cannot fetch the remote page but the link itself is policy-safe.
5. [ ] API tests cover the blocked-link path and the enrichment path.

## 7. Risks

- Remote link inspection can add latency to material create/update.
- Existing fields are a lossy place to store extraction hints; future schema work may still be needed.

## 8. Rollback Notes

- Rollback trigger:
  - Material creation latency or failures increase materially after the route starts inspecting public links.
- Revert steps:
  - Revert the slice commit for `PHASE-7-MATERIAL-INTELLIGENCE-001`.
- Data impact notes:
  - No schema migration in this slice; rollback only affects derived field population.
