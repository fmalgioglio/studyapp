# PHASE-7-PLANNER-COACH-001

## 1. Task ID

- Task ID: PHASE-7-PLANNER-COACH-001

## 2. Problem

- What is broken or missing:
  - Planner overview still mixes English and Italian copy, uses weak summary cards, and keeps product language tied to `Targets / Target plans`.
  - `Study Today` asks for pages before the session, does not present a strong focus timer flow, and does not surface linked materials clearly.
  - Planner overview does not react to focus-progress revision events, so some updates only appear after manual refresh.
- Why it matters now:
  - Planner and focus are the most visible surfaces in the product and currently undercut the student-coach direction locked for Phase 7.

## 3. Scope

- In scope:
  - Rename planner-facing product copy to `Obiettivi`, `Piano di studio`, and `Studia oggi`.
  - Replace planner summary cards with circular hero metrics driven by existing planner payload fields.
  - Rework `Study Today` into a focus-first flow with central timer, pause/resume, preset durations, and post-session logging for pages/topic.
  - Surface linked materials in planner/focus cards without introducing new planning logic in UI.
  - Refresh planner overview on focus-progress revision events.

## 4. Out of Scope

- Not in scope:
  - Exam/objectives form redesign and study rhythm setup.
  - Subject/profile surface repair.
  - Material extraction service changes.
  - Visual artifact pipeline and merge to `main`.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/_hooks/use-planner-overview.ts`
  - `src/app/globals.css`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI
  - Client state/hooks

## 6. Acceptance Criteria

1. [ ] Planner overview shows product-facing copy aligned to `Obiettivi / Piano di studio / Studia oggi`, with no mixed EN/IT labels in the main flow.
2. [ ] Planner hero uses circular summary metrics for progress, verified scope, consistency, and protected free time, using existing planner payload values only.
3. [ ] `Study Today` starts with a dominant timer flow and requests `pagine completate` only in the post-session review/log step.
4. [ ] `Study Today` surfaces linked materials context from the selected objective and refreshes planner data after successful session logging.
5. [ ] Planner overview refreshes when focus-progress revisions are emitted from another planner surface or tab.

Rule: each criterion must be binary pass/fail and directly testable.
Rule (estimator/planner specs): include at least one criterion for canonical-signal path and one for missing-signal conservative fallback.

## 7. Risks

- Circular metrics can become decorative if percent math is misleading; keep mappings conservative and presentation-only.
- Focus review flow changes local interaction state and could regress session logging if the post-session step is not wired correctly.

## 8. Rollback Notes

- Rollback trigger:
  - Focus session can no longer be logged reliably, or planner overview becomes stale after study logging.
- Revert steps:
  - Revert the slice commit for `PHASE-7-PLANNER-COACH-001`.
- Data impact notes:
  - No schema or persistence contract change in this slice.
