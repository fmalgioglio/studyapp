# PHASE-7-MATERIAL-INTELLIGENCE-001

## 1. Task ID

- Task ID: PHASE-7-MATERIAL-INTELLIGENCE-001

## 2. Problem

- What is broken or missing:
  - The conservative material-link inspector exists, but linked material edits do not consistently refresh derived planning hints.
  - `verificationLevel`, `availabilityHint`, `estimatedScopePages`, and planning notes can drift when a student changes a public link, title, or origin.
- Why it matters now:
  - The planner engine already consumes `estimatedScopePages` from linked materials, so inconsistent enrichment directly weakens scope quality for `Obiettivi`.

## 3. Scope

- In scope:
  - Reuse the material-link inspector as the canonical enrichment path for linked material create/update flows.
  - Refresh derived planner hints on link edits without changing the DB schema.
  - Preserve manual overrides when the student explicitly provides them.
  - Add unit/API coverage for enrichment behavior.

## 4. Out of Scope

- Not in scope:
  - New database fields for extracted summaries or section-level structure.
  - Deep crawling or scraping beyond the explicit public PDF/HTML link.
  - Frontend redesign of the materials manager.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/server/services/material-link-inspector.ts`
  - `src/app/api/materials/route.ts`
  - `tests/unit/material-link-inspector.test.ts`
  - `tests/api/materials.route.test.ts`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - API
  - Service
  - Tests

## 6. Acceptance Criteria

1. [ ] Creating a linked material from a supported public PDF/HTML link can derive `estimatedScopePages` when the student does not supply them manually.
2. [ ] Updating a linked material URL/title/origin refreshes derived planner hints instead of leaving stale values behind.
3. [ ] Manual `verificationLevel`, `availabilityHint`, `estimatedScopePages`, and `notes` still win over derived values when the user sets them explicitly.
4. [ ] Unsupported/private links are still rejected by the materials API.
5. [ ] Unit/API tests cover both the enrichment path and the manual-override path.

## 7. Risks

- Overwriting existing material metadata too aggressively would make the saved material feel unstable after small edits.
- Derived hints could become noisy if extraction summaries are surfaced without preserving user-authored notes.

## 8. Rollback Notes

- Rollback trigger:
  - Editing linked materials starts overwriting student-entered values incorrectly.
- Revert steps:
  - Revert the slice commit for `PHASE-7-MATERIAL-INTELLIGENCE-001`.
- Data impact notes:
  - No schema migration in this slice.
