# PHASE-7-SURFACES-REPAIR-001

## 1. Task ID

- Task ID: PHASE-7-SURFACES-REPAIR-001

## 2. Problem

- What is broken or missing:
  - `Profilo` still exposes mostly English copy and feels disconnected from the rest of the planner.
  - `Materie` and `Obiettivi` still carry a few low-quality labels and badges that weaken the new product language.
  - Students can reach core surfaces with mixed product wording even after the larger Phase 7 refactor.
- Why it matters now:
  - These are high-frequency planner surfaces, so copy inconsistency directly hurts the perceived quality of the product before the final mainline merge.

## 3. Scope

- In scope:
  - Localize and clean the `Profilo` surface in EN/IT.
  - Align `Materie` and `Obiettivi` badges/messages to the `Obiettivi / ritmo di studio / materiali` vocabulary.
  - Remove the most visible mixed or low-signal labels without changing business logic.

## 4. Out of Scope

- Not in scope:
  - New planner engine behavior.
  - Schema/API changes.
  - Full redesign of the objectives create/edit layout.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/planner/students/page.tsx`
  - `src/app/planner/subjects/page.tsx`
  - `src/app/planner/exams/page.tsx`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI

## 6. Acceptance Criteria

1. [ ] `Profilo` supports coherent EN/IT copy across overview, details, and study preferences.
2. [ ] `Materie` shows cleaner linked-objective details without broken separators or mixed wording.
3. [ ] `Obiettivi` uses product-aligned labels for study rhythm, completed pages, linked materials, and missing values.
4. [ ] No business logic or API contract changes are introduced in this slice.
5. [ ] `npm run lint`, `npm run test:unit`, and `npm run build` pass after the surface cleanup.

## 7. Risks

- Surface-level localization can drift if not kept inside a compact copy contract.
- Small label edits can accidentally break layout density on mobile cards if they grow too much.

## 8. Rollback Notes

- Rollback trigger:
  - The surface cleanup introduces regressions or obvious layout breakage.
- Revert steps:
  - Revert the slice commit for `PHASE-7-SURFACES-REPAIR-001`.
- Data impact notes:
  - No data or persistence impact in this slice.
