# QA-SIM-FOUNDATION-001

## 1. Task ID

- Task ID: `QA-SIM-FOUNDATION-001`

## 2. Problem

- What is broken or missing:
  - The release process still relies too heavily on manual QA and ad-hoc local data.
  - There is no deterministic seeded student loop to validate daily planner behavior end to end.
- Why it matters now:
  - The new exam-first planner needs repeatable evidence across engine logic, APIs, and daily student flows before further iteration.

## 3. Scope

- In scope:
  - Add a core spec for the QA and simulation foundation.
  - Add deterministic student seed data for balanced, overloaded, affinity-heavy, and mixed-material scenarios.
  - Add a reusable seed/simulation harness for local QA and Playwright.
  - Add engine coverage and API route coverage with Vitest.
  - Add Playwright coverage for the seeded daily student loop.
  - Add repo scripts required to run the new checks locally.

## 4. Out of Scope

- Not in scope:
  - Visual redesign beyond what is required to make E2E assertions stable.
  - Remote CI setup or hosted preview environments.
  - Replacing existing PowerShell smoke scripts.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `docs/specs/QA-SIM-FOUNDATION-001.md`
  - `package.json`
  - `playwright.config.ts`
  - `vitest.config.ts`
  - `scripts/seed-simulation.js`
  - `qa/e2e/**`
  - `tests/**`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - QA
  - Service
  - API
  - Data

## 6. Acceptance Criteria

1. [ ] A deterministic local seed command creates four realistic student scenarios with persisted exams, plan state, and study logs.
2. [ ] Engine tests prove canonical workload beats fallback and missing-signal cases remain conservative.
3. [ ] API route tests cover at least planner overview reads and exam-plan persistence/refresh behavior.
4. [ ] Playwright can run the seeded daily planner flow on a fresh local Next server without depending on a pre-existing dev server.

## 7. Risks

- Local E2E still depends on Prisma dev and browser binaries being available.
- Seeded data can drift from product expectations if workload contracts change without test updates.

## 8. Rollback Notes

- Rollback trigger:
  - New QA tooling blocks local development or introduces unstable scripts.
- Revert steps:
  - Revert the slice 4 commits and remove the added scripts/tests/config files.
- Data impact notes:
  - The seed script deletes and recreates only the dedicated simulation student accounts.
