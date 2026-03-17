# PHASE-6C-VISUAL-RECOVERY-001

## 1. Task ID

- Task ID: `PHASE-6C-VISUAL-RECOVERY-001`

## 2. Problem

- What is broken or missing:
  - Core planner screens still show a weak visual hierarchy, dense header controls, and thin empty states.
  - Local dev/runtime failures can leak Prisma or Turbopack details into the browser.
  - Missing or expired session states leave planner pages in dead-end states instead of redirecting or offering a clear recovery action.
- Why it matters now:
  - Phase 6 product work is already in place, but the current UI/runtime polish is not good enough for daily student usage or reliable local iteration.

## 3. Scope

- In scope:
  - Harden `/api/auth/dev-bootstrap` for local schema/client mismatch fallback.
  - Sanitize technical route errors before they reach the browser.
  - Slim the global shell and de-emphasize the install prompt.
  - Rename planner navigation to `Planner`, `Study Today`, `Subjects`, and `Targets`.
  - Improve no-session and zero-data states on planner, focus, subjects, and targets.
  - Clean user-facing legacy wording that still refers to `season` or old planner labels.

## 4. Out of Scope

- Not in scope:
  - New data models or route families.
  - Native mobile packaging or app-store delivery.
  - A full visual redesign of every surface beyond shell/hierarchy cleanup.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/app/api/auth/dev-bootstrap/route.ts`
  - `src/server/http/response.ts`
  - `src/app/planner/_lib/client-api.ts`
  - `scripts/start-local-dev.ps1`
  - `src/app/layout.tsx`
  - `src/app/_components/*`
  - `src/app/planner/*`
  - `src/app/globals.css`
  - `tests/unit/*`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI
  - API
  - Auth
  - Service

## 6. Acceptance Criteria

1. [ ] Local dev bootstrap does not expose raw Prisma or Turbopack stack details to the browser when schema/client drift occurs.
2. [ ] Header shell is slimmer, install prompt is contextual/dismissible, and planner tabs use the new naming set.
3. [ ] Planner, focus, subjects, and targets pages show explicit recovery CTAs when the session is missing or the page is empty.
4. [ ] User-facing copy no longer surfaces `season` as the primary planner label on the touched screens.
5. [ ] `npm run lint`, `npm run build`, and unit tests pass after the Phase 6C slice lands.

## 7. Risks

- Copy cleanup can miss legacy strings across large planner files.
- Runtime fallback for local schema drift must stay narrow so real API regressions are not masked.
- Visual cleanup across shared CSS can unintentionally change spacing on pages not directly audited.

## 8. Rollback Notes

- Rollback trigger:
  - Phase 6C introduces build regressions, hides useful runtime errors, or breaks planner navigation.
- Revert steps:
  - Revert the Phase 6C commit(s) in reverse order.
- Data impact notes:
  - No schema or persistent data changes are introduced in this phase.
