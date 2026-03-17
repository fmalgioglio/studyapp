# CORE-PLANNER-RECOVERY-001

## 1. Task ID

- Task ID: CORE-PLANNER-RECOVERY-001

## 2. Problem

- What is broken or missing:
  - Subjects and exams do not appear reliably after creation or deletion.
  - Planner data cache can leak stale state across refresh intervals and student switches.
  - Revision events are emitted but ignored by core planner surfaces.
- Why it matters now:
  - This blocks the core daily study loop and breaks trust in planner data.

## 3. Scope

- In scope:
  - Student-scoped planner cache.
  - Deterministic create/delete/update visibility on planner, exams, and subjects.
  - Revision propagation enablement on core planner surfaces.
  - Optimistic local commits using the existing hook contract.

## 4. Out of Scope

- Not in scope:
  - New planner engine behavior.
  - Schema changes.
  - UX redesign beyond freshness recovery.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/planner/_hooks/use-planner-data.ts`
  - `src/app/planner/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI

## 6. Acceptance Criteria

1. [ ] After creating a subject, it is visible immediately on subjects and available for exam creation without manual refresh.
2. [ ] After creating, editing, or deleting an exam, planner and exams surfaces reflect the change immediately without waiting for cache TTL expiry.
3. [ ] Logging out and logging in as another student does not reuse the previous student's planner cache.

## 7. Risks

- Optimistic updates can drift briefly if a follow-up forced refresh fails.
- Revision subscriptions can increase refresh frequency if noisy emitters are added later.

## 8. Rollback Notes

- Rollback trigger:
  - Immediate regression in planner list visibility or excessive refresh churn.
- Revert steps:
  - Revert this slice commit and restore previous hook behavior.
- Data impact notes:
  - No schema or persisted data changes in this slice.
