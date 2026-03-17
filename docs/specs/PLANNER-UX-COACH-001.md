# PLANNER-UX-COACH-001

## 1. Task ID

- Task ID: PLANNER-UX-COACH-001

## 2. Problem

- What is broken or missing:
  - The planner homepage is still board-first and client-driven.
  - The app has no planner overview API, no exam plan preference API, and no persisted study-log write path.
  - Subjects and focus still lean on local-only planning behavior or technical product language.
- Why it matters now:
  - The user experience does not match the new server-side engine and cannot support a daily coaching loop reliably.

## 3. Scope

- In scope:
  - `GET /api/planner/overview`
  - `GET/PATCH /api/exam-plans`
  - `POST /api/exam-study-logs`
  - Planner homepage redesign to exam-first coaching
  - Focus page write path to persisted study logs
  - Subjects simplification toward context and linked exams

## 4. Out of Scope

- Not in scope:
  - Full replacement of every exams workflow string in this slice
  - Test harness expansion (handled in the next slice)

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/api/planner/overview/route.ts`
  - `src/app/api/exam-plans/route.ts`
  - `src/app/api/exam-study-logs/route.ts`
  - `src/server/validation/exam-plan.ts`
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/subjects/page.tsx`
  - `src/app/planner/_hooks/use-planner-overview.ts`
  - `src/app/planner/_components/weekly-board-section.tsx`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI
  - API
  - Validation

## 6. Acceptance Criteria

1. [ ] Planner homepage renders from `/api/planner/overview` and no longer depends on client-only season calculations.
2. [ ] Focus session completion persists to `ExamStudyLog` and updates planner recommendations after refresh.
3. [ ] Subjects page no longer uses local-only pace hints as the primary planning surface.

## 7. Risks

- Some exam setup copy remains more detailed than ideal until the follow-up copy-only pass.
- Planner cards can show partial recommendation data until each exam has a generated plan snapshot.

## 8. Rollback Notes

- Rollback trigger:
  - Broken planner homepage or failed study-log persistence.
- Revert steps:
  - Revert planner API and UI commits together.
- Data impact notes:
  - New study logs and plan snapshots are additive and safe to keep if rollback is UI-only.
