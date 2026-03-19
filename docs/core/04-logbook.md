# 04 Logbook - Session Handoff Contract

This is persistent operational memory.
One entry per session.

---

## Entry Template

- Date:
- Task ID:
- Role:
- Owner:

### Decisions Taken

- 

### What Was Done

- 

### Evidence

- Lint:
- Build:
- Tests:
- Manual checks:

### Residual Risks

- 

### Assumptions

- 

### Next Action (Concrete)

- First command/file:
- Next owner:

---

## Initial Entry (Framework Bootstrap)

- Date: 2026-02-28
- Task ID: INT-OS-V2-BOOTSTRAP
- Role: Planner + Builder
- Owner: Francesco + Codex

### Decisions Taken

- Reduced framework to 5 core files for long-term reuse.
- Set local-first documentation posture.
- Adopted fixed orchestration: Planner -> Builder -> Reviewer.
- Adopted Figma light instead of heavy design process.

### What Was Done

- Created `AGENTS.md` as single agent entrypoint.
- Created `docs/core/01-manifest.md`.
- Created `docs/core/02-project-map.md`.
- Created `docs/core/03-spec-template.md`.
- Created `docs/core/04-logbook.md`.
- Archived previous top-level docs under `docs/_archive-local/`.

### Evidence

- Lint: not required (docs-only change).
- Build: not required (docs-only change).
- Tests: not required (docs-only change).
- Manual checks: confirmed all framework files exist.

### Residual Risks

- Existing project docs may drift if not migrated gradually into core format.
- Figma board link still missing in project map.

### Assumptions

- Framework remains local-first by default.
- Core changes will now start from SPEC template.

### Next Action (Concrete)

- First command/file: open `docs/core/03-spec-template.md` and compile first real SPEC.
- Next owner: Planner role.

---

## Entry - Multi-Agent Sprint Setup

- Date: 2026-02-28
- Task ID: SPRINT-001-SETUP
- Role: Planner
- Owner: Francesco + Codex

### Decisions Taken

- Launch first parallel sprint with 3 streams: PERF-001, UI-001, SCOPE-001.
- Enforce stream boundaries to reduce merge conflicts.
- Keep merge order: PERF first, then SCOPE, then UI.

### What Was Done

- Created sprint overview:
  - `docs/specs/SPRINT-001-multi-agent-overview.md`
- Created stream specs:
  - `docs/specs/PERF-001-planner-data-pipeline.md`
  - `docs/specs/UI-001-gamified-planner-polish.md`
  - `docs/specs/SCOPE-001-session-orchestration.md`

### Evidence

- Lint: not required (docs-only setup).
- Build: not required (docs-only setup).
- Tests: not required (docs-only setup).
- Manual checks: verified files exist under `docs/specs`.

### Residual Risks

- Parallel streams can still collide on `src/app/planner/page.tsx` if boundaries are not respected.
- Figma board link still placeholder and must be added before UI review.

### Assumptions

- Team will run separate terminal sessions with one owner per stream.
- Each stream will attach evidence before merge.

### Next Action (Concrete)

- First command/file: assign one terminal per stream and start implementation from each SPEC.
- Next owner: Builder role (per stream).

---

## Entry - PERF-001 Planner Data Pipeline

- Date: 2026-02-28
- Task ID: PERF-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Centralized planner data reads into a single shared hook to remove duplicated page-level fetch effects.
- Added guarded refresh sequencing to keep refresh results deterministic during rapid repeated triggers.
- Kept existing UI markup/classes unchanged and limited code changes to scoped planner files.

### What Was Done

- Added shared hook:
  - `src/app/planner/_hooks/use-planner-data.ts`
- Migrated target pages to use the shared hook refresh/data/error flow:
  - `src/app/planner/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
- Removed duplicated read-fetch effects for `/api/subjects` and `/api/exams` from those pages.
- Kept create/delete mutations in page components and wired them to hook refresh + data revision notifications.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional test suite executed in this task.
- Manual checks: not executed in this session.

### Residual Risks

- Data error messaging is now rendered from derived hook errors + local action message; UX wording precedence can still be tuned.
- Hook currently keeps last successful list when one endpoint fails, which is intentional but may require product confirmation.

### Assumptions

- Planner pages are all client components and can share one normalized exam/subject read shape.
- Existing `/api/subjects` and `/api/exams` response contracts remain stable.

### Next Action (Concrete)

- First command/file: run manual smoke from SPEC section 9 on `/planner`, `/planner/exams`, `/planner/subjects`.
- Next owner: QA/Reliability.

---

## Entry - SCOPE-001 Session Orchestration

- Date: 2026-02-28
- Task ID: SCOPE-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Centralized exam progress/readiness/focus contribution computation into one season helper so all planner pages consume the same status model.
- Kept the task within UI/orchestration boundaries with no API contract or schema changes.
- Surfaced multi-exam-per-subject visibility through subject-level exam strips and aggregate metrics.

### What Was Done

- Extended shared season logic:
  - `src/app/planner/_lib/season-engine.ts`
  - Added `buildExamProgressSnapshot` and shared status/contribution derivations.
  - Updated `buildSeasonPlan` to consume shared exam snapshots.
- Updated planner season overview:
  - `src/app/planner/page.tsx`
  - Added readiness + focus contribution signals in timeline/details and mission context.
- Updated exams surface:
  - `src/app/planner/exams/page.tsx`
  - Added per-exam readiness, completion, and focus contribution/focus signal chips.
- Updated subjects surface:
  - `src/app/planner/subjects/page.tsx`
  - Added multi-exam progress strip by subject and aggregate readiness/progress/focus metrics.
- Updated focus surface:
  - `src/app/planner/focus/page.tsx`
  - Added shared progress strip and selected-exam readiness/contribution/completion status blocks.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no dedicated unit/integration test suite added in this scope.
- Manual checks:
  - Scenario 1 (multiple exams under one subject): pass via code-path review; subject cards now render per-exam progress chips and aggregate linked-exam metrics.
  - Scenario 2 (focus sessions mapped to different exams): pass via code-path review; focus logging remains per exam ID and updates shared snapshot signals.
  - Scenario 3 (progress alignment across season/exams/subjects): pass via code-path review; all three pages now consume shared `buildExamProgressSnapshot`.
  - Negative case (missing/empty progress): pass via code-path review; snapshot builder clamps and defaults to zero-safe values.

### Residual Risks

- Scenario checks were validated by implementation/code-path review; browser-driven manual smoke is still required for final UX confirmation.
- Progress state thresholds are heuristic and may need tuning after real usage data.
- Focus contribution percent is minutes-based and may over/under represent outcomes for atypical study methods.

### Assumptions

- Local focus progress storage (`studyapp_focus_exam_progress_v1`) remains the source of truth for first-pass cross-page signals.
- Existing `/api/exams` and `/api/subjects` response contracts remain stable.
- No backend schema migration is required for this scope.

### Next Action (Concrete)

- First command/file: run browser smoke on `/planner`, `/planner/exams`, `/planner/subjects`, `/planner/focus` with multi-exam and multi-focus logging scenarios.
- Next owner: QA/Reliability.

---

## Entry - UI-001 Gamified Planner Polish

- Date: 2026-02-28
- Task ID: UI-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept implementation strictly presentation-only by centralizing UI primitives in `globals.css` and reusing them across planner pages.
- Preserved existing planner/focus/exams/subjects behavior, data reads/writes, and event handlers.
- Prioritized mobile density safety with shared compact card/button rules at `<=360px`.

### What Was Done

- Added shared planner visual primitives:
  - `src/app/globals.css`
  - New classes for panel/card/chip/button/field/input/alert + compact mobile rules.
- Applied consistent hierarchy and style language across target pages:
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
- Updated planner page typing alias to support localized copy object union during build (`PlannerCopy`).

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated test suite executed (UI-only stream).
- Manual checks:
  - Screenshot capture tooling is not available in this terminal session.
  - Visual pass summary prepared for reviewer: hero/panel/card/button/chip hierarchy is now consistent across Planner, Focus, Exams, Subjects; compact mobile rules added in global styles.

### Residual Risks

- Contrast perception may vary by theme because panel/card surfaces are now token-driven across all planner pages.
- Without rendered screenshot artifacts in this session, final visual verification still requires QA manual check in browser.

### Assumptions

- Existing Tailwind + global CSS pipeline remains stable for shared class usage.
- UI-001 acceptance is limited to presentation consistency and responsive readability without logic changes.

### Next Action (Concrete)

- First command/file: run `npm run dev`, capture desktop/mobile screenshots for `/planner`, `/planner/focus`, `/planner/exams`, `/planner/subjects`.
- Next owner: QA/Reliability.

---

## Must

- One entry per session.
- Complete handoff fields.
- Evidence included for implementation sessions.

## Must Not

- Keep state only in chat history.
- Close session without next concrete action.

---

## Entry - PERF-UX-002 Seamless Loop

- Date: 2026-03-01
- Task ID: PERF-UX-002
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Added client-side persistent cache (sessionStorage) for auth/planner bootstrap to reduce cold and warm loading delays.
- Kept cache TTL short to avoid stale UX while preserving speed.
- Standardized no-MCP Figma handoff protocol inside core docs to keep design iteration seamless.

### What Was Done

- Updated auth hook cache model + storage sync:
  - `src/app/planner/_hooks/use-auth-student.ts`
- Updated planner data hook with persistent cache hydration:
  - `src/app/planner/_hooks/use-planner-data.ts`
- Added seamless design handoff rules:
  - `docs/core/02-project-map.md`
  - `docs/core/03-spec-template.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional test suite executed.
- Manual checks: cache hydration path validated by code-path review.

### Residual Risks

- Session storage can carry stale data for up to TTL window; forced refresh still resolves.
- Without direct MCP bridge, handoff quality depends on discipline in SPEC packet completeness.

### Assumptions

- Browser sessionStorage is available in target browsers.
- Planner pages continue to fetch server truth on refresh and mutation events.

### Next Action (Concrete)

- First command/file: run `npm run dev`, open `/planner`, `/planner/exams`, `/planner/subjects` and compare first vs second load time.
- Next owner: QA/Reliability.

---

## Entry - UI-S1-HOME-NAV Design To Code

- Date: 2026-03-01
- Task ID: UI-S1-HOME-NAV
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Implemented only Home + global navigation visual shell updates.
- Kept all product logic, API contracts, and route behavior unchanged.
- Added a concrete handoff package under `design/handoff/S1_HOME_NAV` for Figma to Codex iteration.

### What Was Done

- Updated global style tokens and Home/Nav component classes:
  - `src/app/globals.css`
- Updated root layout header shell:
  - `src/app/layout.tsx`
- Updated top navigation visual hierarchy and CTA styles:
  - `src/app/_components/site-nav.tsx`
- Updated Home hero and CTA card presentation:
  - `src/app/page.tsx`
- Added design handoff artifacts:
  - `design/handoff/S1_HOME_NAV/tokens.json`
  - `design/handoff/S1_HOME_NAV/notes.md`
  - `design/handoff/S1_HOME_NAV/implementation-request.txt`
  - `design/handoff/S1_HOME_NAV/frames/manifest.json`
  - `design/handoff/S1_HOME_NAV/frames/README.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests in this visual scope.
- Manual checks: pending browser screenshot pass for desktop/mobile nav and home.

### Residual Risks

- Final visual parity still depends on dropping exported Figma frames into `design/handoff/S1_HOME_NAV/frames`.
- Theme contrast can require minor tuning after real-device checks.

### Assumptions

- Figma MCP flow remains available for iterative exports.
- This sprint is intentionally UI-only and does not include planner business logic changes.

### Next Action (Concrete)

- First command/file: export and place `home-desktop.png`, `home-mobile.png`, `nav-desktop.png`, `nav-mobile.png` into `design/handoff/S1_HOME_NAV/frames`.
- Next owner: Product + UI reviewer.

---

## Entry - AI-WORKFLOW Template (Voice First)

- Date: 2026-03-01
- Task ID: OPS-AI-WORKFLOW-001
- Role: Builder
- Owner: Francesco + Codex

### Decisions Taken

- Added a single lightweight markdown protocol for low-token planning, high-token execution, and final cleanup.
- Kept the template beginner-friendly with pattern words and copy/paste prompts.
- Kept implementation docs-only (no runtime/API changes).

### What Was Done

- Added `ai-workflow.md` at project root with:
  - status block
  - token modes
  - plan/execute/clean phases
  - verification commands
  - pattern word cheat sheet
  - voice translator prompt
  - reusable session template

### Evidence

- Lint: not required (docs-only).
- Build: not required (docs-only).
- Tests: not required (docs-only).
- Manual checks: file created and readable.

### Residual Risks

- Prompt quality still depends on clear objective and scope lock per task.

### Assumptions

- User will use ChatGPT/Gemini for voice translation and Codex for implementation.

### Next Action (Concrete)

- First command/file: open `ai-workflow.md` and fill `STATUS` for the next task.
- Next owner: Planner role.

---

## Entry - NAV-CLEAN-003 Minimal Block C+D

- Date: 2026-03-01
- Task ID: NAV-CLEAN-003
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Treated Block C as navigation consistency only.
- Treated Block D as cleanup and verification only.
- Kept scope intentionally minimal with no API/domain/schema changes.

### What Was Done

- Added active route state handling for auth CTAs in top navigation:
  - `src/app/_components/site-nav.tsx`
- Verified project health after patch:
  - `npm run lint`
  - `npm run build`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional test suite executed (local UI shell patch).
- Manual checks: not run in browser during this session.

### Residual Risks

- Visual active-state overlap on CTA style can require small contrast tuning per theme.
- Manual mobile navigation smoke check is still required.

### Assumptions

- Block C corresponds to navigation consistency updates.
- Block D corresponds to cleanup/verification gates.

### Next Action (Concrete)

- First command/file: run `npm run dev`, validate `/login` and `/signup` active states in desktop/mobile nav.
- Next owner: QA/Reliability.

---

## Entry - CLEAN-004 PERF+UI+NAV Sweep

- Date: 2026-03-01
- Task ID: CLEAN-004
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept cleanup strictly non-functional (no API/domain/data changes).
- Applied only one duplication-removal refactor in nav classes.
- Retained all existing routing/auth behavior.

### What Was Done

- Refactored repeated nav `className` composition into one local helper:
  - `src/app/_components/site-nav.tsx`
- Scanned app sources for debug/dead-code markers (`console.log`, `debugger`, `TODO`, `FIXME`) and found none.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests in cleanup-only scope.
- Manual checks: pending visual smoke on nav CTA active states.

### Residual Risks

- CTA active styling still layers base active style + CTA style and may need future design tuning.

### Assumptions

- `PHASE CLEAN` target is code hygiene + verification, not feature changes.

### Next Action (Concrete)

- First command/file: run `npm run dev` and verify `/`, `/planner`, `/login`, `/signup` nav active states on mobile and desktop.
- Next owner: QA/Reliability.

---

## Entry - PLAN-EXEC-CLEAN-005 Token Workflow Pass

- Date: 2026-03-01
- Task ID: PLAN-EXEC-CLEAN-005
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the cycle scoped to PERF/UI/NAV only with minimal diffs.
- Prioritized cache-first behavior for planner bootstrap to reduce mount latency.
- Limited UI/NAV updates to accessibility and consistency polish.

### What Was Done

- Block A (Performance):
  - Removed forced mount refresh in planner data hook so fresh cache can short-circuit network:
    - `src/app/planner/_hooks/use-planner-data.ts`
- Block B (UI/UX):
  - Added focus-visible styles for top nav/toggles/planner tabs:
    - `src/app/globals.css`
- Block C (Navigation):
  - Added explicit nav landmarks:
    - `src/app/_components/site-nav.tsx`
    - `src/app/planner/_components/planner-tabs-nav.tsx`
- Block D:
  - Validation gates executed:
    - `npm run lint`
    - `npm run build`
- Clean:
  - Kept code behavior unchanged; no debug/noise additions.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated suites in this scoped pass.
- Manual checks: pending browser smoke for perceived load-time improvement and focus-visible rings.

### Residual Risks

- Cache-first mount can show stale data for up to TTL window before next refresh trigger.
- Focus-visible ring color may require theme-specific tuning after device QA.

### Assumptions

- Existing revision events and user-triggered refresh paths remain primary freshness mechanism.
- Scope lock excludes API/schema/auth-flow changes.

### Next Action (Concrete)

- First command/file: run `npm run dev`, compare first vs second planner load and validate keyboard navigation on top nav and planner tabs.
- Next owner: QA/Reliability.

---

## Entry - AB-006 Scope Lock + Cache-First Refinement

- Date: 2026-03-03
- Task ID: AB-006
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks A and B.
- Kept runtime changes minimal and limited to hook mount-refresh guards.
- Added explicit sprint/spec artifacts before runtime edits.

### What Was Done

- Block A (scope lock/spec):
  - Added `docs/specs/SPRINT-002-ab-overview.md`
  - Added `docs/specs/PERF-002-cache-first-refresh.md`
- Block B (performance):
  - Added fresh-cache mount guard in `usePlannerData`:
    - `src/app/planner/_hooks/use-planner-data.ts`
  - Added fresh-cache mount guard in `useFocusExamsData`:
    - `src/app/planner/_hooks/use-focus-exams-data.ts`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated suites in this scoped pass.
- Manual checks: pending warm-load comparison on `/planner` and `/planner/focus`.

### Residual Risks

- Cache-first short-circuit can keep data stale within TTL until refresh trigger/revision event.

### Assumptions

- Existing refresh triggers (manual and revision-based) remain active and sufficient.

### Next Action (Concrete)

- First command/file: run `npm run dev` and compare first vs second load behavior on `/planner` and `/planner/focus`.
- Next owner: QA/Reliability.

---

## Entry - CD-007 UI/Nav Refinement + XP Unit Tests

- Date: 2026-03-03
- Task ID: CD-007
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks C and D with minimal diff.
- Extracted XP formula into a pure helper to enable focused unit testing.
- Kept API contracts and data model unchanged.

### What Was Done

- Added task SPEC:
  - `docs/specs/CD-002-ui-nav-and-xp-tests.md`
- Block C (UI/UX):
  - Added polite live regions for focus feedback alerts:
    - `src/app/planner/focus/page.tsx`
- Block D (Navigation):
  - Refined top-nav active state to avoid dual highlight on profile routes:
    - `src/app/_components/site-nav.tsx`
- XP tests:
  - Added pure utility:
    - `src/app/planner/_lib/focus-xp.ts`
  - Added unit tests:
    - `src/app/planner/_lib/focus-xp.test.ts`
  - Wired focus page to utility:
    - `src/app/planner/focus/page.tsx`

### Evidence

- Unit tests:
  - `.\node_modules\.bin\vitest.cmd run src/app/planner/_lib/focus-xp.test.ts --pool=threads --maxWorkers=1` passed.
  - Result: 1 file passed, 3 tests passed.
- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Manual checks: pending browser smoke for nav active behavior on `/planner/students`.

### Residual Risks

- Top-nav behavior now prioritizes `Profile` active over generic `Planner` active on `/planner/students`; confirm this matches product intent.
- XP tests currently cover formula behavior only, not timer lifecycle integration.

### Assumptions

- Desired nav UX is single primary active item in top navigation.
- XP calculation behavior should remain formula-compatible with existing values.

### Next Action (Concrete)

- First command/file: run `npm run dev` and validate nav active state on `/planner`, `/planner/focus`, `/planner/students`.
- Next owner: QA/Reliability.

---

## Entry - EFG-008 UI Fixes + Scaffold Docs + Clean

- Date: 2026-03-03
- Task ID: EFG-008
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Treated Block E as full UI-fix pass (hydration safety + i18n/accessibility polish).
- Treated Block F and G as docs-only scaffolding.
- Applied PHASE CLEAN with no runtime behavior expansion.

### What Was Done

- Block E (UI fixes):
  - Hydration-safe bootstrap for persisted theme:
    - `src/app/_hooks/use-site-theme.ts`
  - Hydration-safe bootstrap for persisted language:
    - `src/app/_hooks/use-ui-language.ts`
  - Localized weekly board unit labels and planner card labels:
    - `src/app/planner/_components/weekly-board-section.tsx`
    - `src/app/planner/page.tsx`
  - Localized estimate form/advanced labels and added optional panel aria attributes:
    - `src/app/planner/estimate/page.tsx`
  - Unified live alert semantics:
    - `src/app/planner/page.tsx`
    - `src/app/planner/focus/page.tsx`
    - `src/app/planner/exams/page.tsx`
    - `src/app/planner/subjects/page.tsx`
- Block F/G scaffolding (docs-only):
  - `docs/specs/F-004-auth-reliability-scaffold.md`
  - `docs/specs/G-004-release-gate-scaffold.md`
- Added execution spec:
  - `docs/specs/EFG-008-ui-fixes-and-scaffolding.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated runtime tests in this step.
- Manual checks: pending browser smoke for first-load theme/language transition and estimate EN/IT labels.

### Residual Risks

- Theme/language now prioritize hydration consistency and apply stored values right after mount; users may briefly see default values on first paint.
- Some estimator advanced text remains partially technical by design and may need a separate UX simplification pass.

### Assumptions

- Product preference is hydration safety over immediate localStorage-first first paint.
- F/G in this step are intentionally non-runtime scaffolds.

### Next Action (Concrete)

- First command/file: run `npm run dev`, verify EN/IT labels in `/planner/estimate` and stored theme/language transitions.
- Next owner: QA/Reliability.

---

## Entry - ABC-011 Study Hub + Books Typeahead

- Date: 2026-03-03
- Task ID: ABC-011
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks A/B/C for this scope.
- Promoted `/study` as primary hub entry while keeping `/planner/*` legacy routes.
- Removed standalone Quick Estimate UX by redirecting `/planner/estimate`.

### What Was Done

- Block A:
  - Added spec: `docs/specs/ABC-011-study-hub-books-typeahead.md`
- Block B/C runtime:
  - Added API route:
    - `src/app/api/books/search/route.ts`
  - Updated estimate route for guest mode + mismatch guard:
    - `src/app/api/planning/estimate/route.ts`
  - Extended validation schema for new estimate payload fields:
    - `src/server/validation/planning.ts`
  - Added inline study estimator with:
    - 300ms debounce
    - client TTL cache
    - verified page count + confidence score display
    - mismatch confirmation gate
    - guest mode execution path
    - `src/app/planner/_components/study-estimate-inline.tsx`
  - Refactored navigation/hub:
    - `src/app/_components/site-nav.tsx` (`/study` primary)
    - `src/app/page.tsx` (CTA to `/study`)
    - `src/app/study/page.tsx` (new hub route)
    - `src/app/planner/layout.tsx` (removed quick estimate tab)
    - `src/app/planner/page.tsx` (inline estimator integrated)
    - `src/app/planner/estimate/page.tsx` (redirect)

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Clean scan: `rg -n "console\\.log|debugger|TODO|FIXME" src/app src/server` returned no matches.

### Residual Risks

- Google Books API availability/rate limits can degrade search suggestions.
- `/study` and `/planner` coexistence may create temporary navigation ambiguity.

### Assumptions

- `verified_page_count` from Google Books is treated as best-effort metadata.
- Guest-mode estimate should be available without session.

### Next Action (Concrete)

- First command/file: run `npm run dev` and smoke-test `/study` typeahead, mismatch confirmation, and guest estimate flow.
- Next owner: QA/Reliability.

---

## Entry - DE-013 Deterministic Estimator + Calibration Tracking

- Date: 2026-03-03
- Task ID: DE-013
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks D and E.
- Replaced stochastic Monte Carlo sampling with deterministic quantile scenarios for estimator core.
- Implemented per-user predicted-vs-actual tracking in service memory (no DB migration in this step).

### What Was Done

- Estimator deterministic confidence outputs:
  - `confidence_score`
  - `rationale_tags`
  - `confidence_interval`
  - file: `src/server/services/planning-estimator.ts`
- Per-user calibration tracking + predicted-vs-actual storage:
  - file: `src/server/services/estimator-calibration-store.ts`
- Estimate API integration for tracking and new response payload:
  - file: `src/app/api/planning/estimate/route.ts`
- Validation updates:
  - file: `src/server/validation/planning.ts`
- Unit tests:
  - `src/server/services/planning-estimator.test.ts`
  - `src/server/services/estimator-calibration-store.test.ts`
- Scope spec:
  - `docs/specs/DE-013-estimator-deterministic-tracking.md`

### Evidence

- Unit tests (vitest):
  - `.\node_modules\.bin\vitest.cmd run src/server/services/planning-estimator.test.ts src/server/services/estimator-calibration-store.test.ts --pool=threads --maxWorkers=1`
  - Result: 2 files passed, 4 tests passed.
- Lint: `npm run lint` passed.
- Build: `npm run build` passed.

### Residual Risks

- Tracking store is memory-backed and not durable across server restarts.
- Deterministic quantile approximation is stable but may differ from previous stochastic distribution behavior.

### Assumptions

- Deterministic logic is required for this phase and preferred over stochastic simulation.
- Durable DB persistence can be introduced in a later migration.

### Next Action (Concrete)

- First command/file: decide persistence tier for calibration tracking (in-memory vs Prisma-backed table).
- Next owner: Product + ML Architect.

---

## Entry - FI-014 Deterministic XP + Contextual Leaderboards

- Date: 2026-03-03
- Task ID: FI-014
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks F and I for reward and leaderboard domain behavior.
- Kept all changes deterministic and bounded (no runaway multipliers).
- Kept API contracts and DB schema unchanged.

### What Was Done

- Deterministic XP caps:
  - `src/app/planner/_lib/focus-xp.ts`
- XP edge-case unit tests:
  - `src/app/planner/_lib/focus-xp.test.ts`
- Contextual leaderboard with 20+ seeded fixtures:
  - `src/app/planner/_lib/season-engine.ts`
- Scope spec:
  - `docs/specs/FI-014-deterministic-xp-contextual-leaderboards.md`

### Evidence

- XP tests:
  - `.\node_modules\.bin\vitest.cmd run src/app/planner/_lib/focus-xp.test.ts --pool=threads --maxWorkers=1`
  - Result: 1 file passed, 5 tests passed.
- Lint:
  - `npm run lint` passed.
- Build:
  - `npm run build` passed.
- Manual checks:
  - not executed in browser in this session.

### Residual Risks

- New XP cap can reduce reward growth for extreme long sessions by design.
- Leaderboard context is deterministic heuristics and may still need tuning against real telemetry.

### Assumptions

- Deterministic and bounded progression is preferred for this stage.
- Dev fixtures are acceptable until persistent social backend is introduced.

### Next Action (Concrete)

- First command/file: run `npm run dev` and smoke-check `/planner` leaderboard in focused/balanced/full mode.
- Next owner: QA/Reliability.

---

## Entry - GH-015 Planner UI Contrast + Momentum Widgets

- Date: 2026-03-03
- Task ID: GH-015
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks G and H as local UI changes on planner shell.
- Kept API/data/auth/domain logic untouched.
- Applied subtle motion budget with 160ms transitions only.

### What Was Done

- Planner overview UI update:
  - `src/app/planner/page.tsx`
  - Added momentum bar, estimate accuracy score, weekly XP sparkline.
  - Merged right rail into a single panel to reduce nested containers.
  - Standardized tile links and compact spacing.
- Global UI token/variant polish:
  - `src/app/globals.css`
  - Improved secondary button hover contrast.
  - Added progress bar and tile-link utility classes.
  - Standardized spacing and button paddings.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional unit tests required in this local UI scope.
- Manual checks: not run in browser in this session.

### Residual Risks

- Estimate accuracy score is currently deterministic heuristic from existing progress signals, not persisted model telemetry.
- Sparkline readability on very low-contrast displays may need minor stroke tuning.

### Assumptions

- Blocks G/H target planner UX polish, hierarchy cleanup, and lightweight engagement metrics.
- Subtle animation constraint is satisfied by global 160ms transitions.

### Next Action (Concrete)

- First command/file: run `npm run dev` and visually verify `/planner` on desktop + mobile widths.
- Next owner: QA/Reliability.

---

## Entry - JK-016 Auth Security + Deploy Readiness

- Date: 2026-03-03
- Task ID: JK-016
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only Blocks J/K scope: auth/session security audit hardening, legal links/pages, deploy readiness artifacts.
- Kept auth API contracts and DB schema unchanged.
- Added no-store headers on auth routes and same-origin checks on auth POST endpoints.

### What Was Done

- Auth/session hardening:
  - `src/server/auth/session.ts`
  - `src/server/auth/origin.ts` (new)
  - `src/server/auth/headers.ts` (new)
  - `src/server/http/response.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/auth/dev-bootstrap/route.ts`
- Privacy/terms/cookies pages and global links:
  - `src/app/layout.tsx`
  - `src/app/globals.css`
  - `src/app/privacy/page.tsx` (new)
  - `src/app/terms/page.tsx` (new)
  - `src/app/cookies/page.tsx` (new)
- Deploy readiness:
  - `.env.example` (new)
  - `DEPLOYMENT.md` (new)
  - `package.json` (build script now includes `prisma generate`)
- Scope spec:
  - `docs/specs/JK-016-auth-security-legal-deploy.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests added in this scope.
- Manual checks: not executed in browser in this session.

### Residual Risks

- Strict same-site cookie + origin checks assume single-origin deployment and can require proxy header alignment in advanced setups.
- Legal content is technical placeholder text and not legal counsel.

### Assumptions

- Production uses HTTPS and managed Postgres.
- Dev bootstrap remains disabled in production via env.

### Next Action (Concrete)

- First command/file: deploy preview on Vercel and verify `/login`, `/signup`, `/api/auth/me`, `/privacy`, `/terms`, `/cookies`.
- Next owner: QA/Reliability.

---

## Entry - CLEAN-017 Dead Route + Label Prune

- Date: 2026-03-03
- Task ID: CLEAN-017
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed CLEAN phase only.
- Removed only verified dead/unused artifacts with zero behavior impact.
- Kept API/domain/auth contracts unchanged.

### What Was Done

- Removed dead route (no inbound references):
  - `src/app/planner/estimate/page.tsx`
- Removed duplicate/unused planner copy key:
  - `src/app/planner/page.tsx` (`momentum` in EN/IT copy map)
- Audited debug markers:
  - `console.log`, `debugger`, `TODO`, `FIXME` under `src/` (none found).

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no extra tests required for cleanup-only scope.
- Manual checks: not executed in browser in this session.

### Residual Risks

- Removing `/planner/estimate` may break old bookmarks that relied on redirect fallback.

### Assumptions

- Inline estimator in `/study` and `/planner` supersedes legacy standalone estimate route.

### Next Action (Concrete)

- First command/file: run `npm run dev` and verify legacy bookmarks are not required by product.
- Next owner: Product + QA.

---

## Entry - HOTFIX-H1 Button Contrast States

- Date: 2026-03-03
- Task ID: HOTFIX-H1
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Applied minimal-diff style-only fix for active/selected/hover readability.
- Prioritized mixed state conflicts (`active + CTA`) in top navigation.
- Kept all logic/routes/APIs unchanged.

### What Was Done

- Updated button/text contrast states:
  - `src/app/globals.css`
  - Explicit text color on hover for primary/accent buttons.
  - Added combined selectors for `.site-nav-cta-*` with `.site-nav-link-active`.
  - Added safe hover treatment for toggle buttons and active tab buttons.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: not applicable for style-only hotfix.
- Manual checks: pending browser visual pass.

### Residual Risks

- Final perceived contrast can still vary by device brightness/theme combinations.

### Assumptions

- HOTFIX H1 scope is limited to CSS visual state contrast.

### Next Action (Concrete)

- First command/file: run `npm run dev` and inspect `/login`, `/signup`, `/study`, `/planner` buttons in both themes.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-H2 Books Search + Typeahead UX

- Date: 2026-03-03
- Task ID: HOTFIX-H2
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed HOTFIX H2 only (books search + typeahead interaction).
- Preserved guest-mode access for `/api/books/search`.
- Used minimal surface changes limited to route/component/styles.

### What Was Done

- Search route resilience:
  - `src/app/api/books/search/route.ts`
  - Added key-failure retry without API key.
  - Added fallback title-focused query (`intitle:`) when broad query yields zero items.
  - Fixed Google Books partial fields selector for thumbnail path.
- Amazon-style typeahead UX:
  - `src/app/planner/_components/study-estimate-inline.tsx`
  - Debounced fetch + local TTL cache.
  - Dropdown panel with loading/no-results/error states.
  - Keyboard navigation (ArrowUp/ArrowDown/Enter/Escape).
  - Active option state and highlight matched substring.
  - Guard to prevent dropdown reopening after selecting an item.
- Styling:
  - `src/app/globals.css`
  - Added typeahead panel/option/status/highlight classes.
- Spec:
  - `docs/specs/HOTFIX-H2-books-typeahead.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no new unit tests added in this hotfix scope.
- Manual checks: pending browser smoke in guest mode.

### Residual Risks

- Google Books quota/rate limits can still return sparse/no results.
- If `GOOGLE_BOOKS_API_KEY` has strict referrer/IP restrictions, keyed request may fail and rely on fallback anonymous quota.

### Assumptions

- Guest mode intentionally allows anonymous book lookup via server endpoint.

### Next Action (Concrete)

- First command/file: run `npm run dev`, open `/study`, and verify typeahead behavior in guest mode with and without API key configured.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-H3-H4 Labels + Subject Delete

- Date: 2026-03-03
- Task ID: HOTFIX-H3-H4
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed only H3/H4 scope: UI label rename + subject delete flow.
- Kept existing API routes and estimator endpoint names unchanged.
- Implemented server-side confirmation gate before cascading delete.

### What Was Done

- Added combined hotfix spec:
  - `docs/specs/HOTFIX-H3-H4-labels-subject-delete.md`
- Renamed Estimator labels in UI copy (no API changes):
  - `src/app/planner/page.tsx`
  - `src/app/planner/_components/study-estimate-inline.tsx`
  - `src/app/planner/subjects/page.tsx`
- Added subject delete with confirmation and safe relational handling:
  - API: `src/app/api/subjects/route.ts` (`DELETE`)
  - UI: `src/app/planner/subjects/page.tsx` (delete button + two-step confirm flow)

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests in this hotfix scope.
- Manual checks: pending browser smoke for delete flow.

### Residual Risks

- Cascade delete can remove linked exams/sources/sessions when confirmed.
- Subject-local client hints in localStorage persist unless manually cleaned.

### Assumptions

- Cascading behavior is intentional and aligned with Prisma relations.
- "Estimator" rename targets visible UI labels only.

### Next Action (Concrete)

- First command/file: run `npm run dev`, test delete for subject with and without linked exams from `/planner/subjects`.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-HYD-019 Study Hub Hydration Mismatch

- Date: 2026-03-03
- Task ID: HOTFIX-HYD-019
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Fixed hydration mismatch in `PlannerOverviewPage` by making first render deterministic.
- Delayed localStorage hydration to post-mount async tick.
- Kept API/domain behavior unchanged.

### What Was Done

- Updated hydration-safe client state bootstrap:
  - `src/app/planner/page.tsx`
  - Defaulted `focusStats`, `focusProgress`, `questCompletions` to deterministic server-safe values.
  - Added post-mount storage hydration via `setTimeout(0)`.
  - Guarded quest completion localStorage writes until hydration is complete.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional tests in this hotfix scope.
- Manual checks: pending browser verification on `/study`.

### Residual Risks

- Brief first-paint values (0/default) can appear before client hydration applies persisted local storage data.

### Assumptions

- Hydration stability is prioritized over immediate persisted-value first paint.

### Next Action (Concrete)

- First command/file: run `npm run dev` and verify `/study` loads without hydration warning on hard refresh.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-H2B Search Fallback Stabilization

- Date: 2026-03-03
- Task ID: HOTFIX-H2B
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept Amazon-like typeahead behavior and removed hard-fail UX for Google Books outages.
- Prefer resilient success responses with fallback suggestions over blocking errors.
- Maintained guest-mode access without auth requirements.

### What Was Done

- Search API resilience:
  - `src/app/api/books/search/route.ts`
  - Added local catalog fallback with ranked matching.
  - On Google failures/quota/key issues, return fallback suggestions via `apiSuccess` instead of `apiError`.
  - Added degraded response flag and reason metadata.
- Typeahead UI degradation handling:
  - `src/app/planner/_components/study-estimate-inline.tsx`
  - Added degraded mode hint in dropdown.
- Styling:
  - `src/app/globals.css`
  - Added warning style for degraded search status.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no extra unit tests added in this hotfix.
- Manual checks: pending browser smoke for degraded/fallback mode.

### Residual Risks

- Fallback catalog coverage is intentionally limited and may not match niche books.
- Google Books rate limits still affect freshness/richness of live suggestions.

### Assumptions

- Product priority is uninterrupted search UX over strict live-provider-only responses.

### Next Action (Concrete)

- First command/file: run `npm run dev`, disable/empty `GOOGLE_BOOKS_API_KEY`, and verify fallback suggestions in `/study`.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-H2C Search Coverage + Precision

- Date: 2026-03-03
- Task ID: HOTFIX-H2C
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Preserved existing API contract and improved retrieval quality by strategy, not by schema changes.
- Added optional `subject hint` refinement instead of forcing subject-only search.
- Increased suggestion pool and ranking strictness to improve relevance on common textbook queries.

### What Was Done

- Search API improvements:
  - `src/app/api/books/search/route.ts`
  - Expanded query variants (`exact phrase`, `intitle`, subject-augmented variants).
  - Increased target list size to 20 and Google batch size to 30.
  - Added OpenLibrary `title` mode fallback when broad query stays sparse.
  - Improved ranking tie-breakers and local fallback matching by query terms.
  - Expanded local fallback catalog coverage and subject tags.
- Typeahead UX refinement:
  - `src/app/planner/_components/study-estimate-inline.tsx`
  - Added optional subject hint selector.
  - Added source label in dropdown rows and selected book summary.
  - Localized unknown-author and metadata labels.
- Added scope spec:
  - `docs/specs/HOTFIX-H2C-search-coverage-precision.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional unit tests in this hotfix scope.
- Manual checks: pending browser smoke for relevance against real user queries.

### Residual Risks

- External catalog/rate-limit constraints still prevent a strict "any book always found" guarantee.
- Local fallback catalog requires periodic curation to stay useful for niche courses.

### Assumptions

- Best-effort multi-source retrieval is acceptable for this product stage.
- Optional subject hint improves precision without increasing user friction.

### Next Action (Concrete)

- First command/file: run `npm run dev`, test `/study` with and without subject hint on 8-10 real book titles.
- Next owner: QA/Reliability.

---

## Entry - HOTFIX-H2D Search Speed + Estimator Precision

- Date: 2026-03-03
- Task ID: HOTFIX-H2D
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept contracts backward-compatible while adding metadata fields to improve UX autofill.
- Improved search speed with parallel provider query batches and provider-level timeout guards.
- Refined estimator by modeling page-count uncertainty directly, instead of inflating page-equivalent outputs.

### What Was Done

- Search API precision/speed:
  - `src/app/api/books/search/route.ts`
  - Added metadata extraction (`categories`, `inferred_subject`) for Google/OpenLibrary/local.
  - Added provider timeout guard and parallel Google query batches.
  - Improved scoring and fallback handling with richer metadata.
- Inline estimator autofill:
  - `src/app/planner/_components/study-estimate-inline.tsx`
  - Added metadata-aware subject autofill and payload subject propagation.
  - Added stable autofill behavior for known pages/subject with touch guards.
- Estimator math refinement:
  - `src/server/services/planning-estimator.ts`
  - Added confidence-aware page-count model (`known`, `verified`, `inferred` paths).
  - Integrated page-count uncertainty into scenario simulation.
  - Reworked daily pages derivation to avoid difficulty-driven overinflation.
- Tests:
  - `src/server/services/planning-estimator.test.ts`
  - Added monotonic checks for workload pressure and availability effects.
- Added scope spec:
  - `docs/specs/HOTFIX-H2D-search-engine-precision.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests:
  - `vitest` run attempted for estimator tests and failed in this environment with `spawn EPERM` (tooling/permissions issue), not assertion failure.
- Manual checks: pending browser smoke on `/study` and estimate realism scenarios.

### Residual Risks

- External catalog variability/rate limits still affect search quality tails.
- Estimator precision improved but still depends on user metadata quality in cold-start sessions.
- Unit test execution needs a stable local environment (current session hit `spawn EPERM`).

### Assumptions

- Additive search metadata fields are acceptable and non-breaking for existing clients.
- Product prioritizes trustworthy outputs over optimistic underestimation.

### Next Action (Concrete)

- First command/file: run `npm run dev`, validate `/study` autofill and compare estimate outputs across 3 scenarios (light/medium/extreme workload).
- Next owner: QA/Reliability.

---

## Entry - DOC-BOUNDARY-MAP-021 Concise Architecture Boundary Rewrite

- Date: 2026-03-10
- Task ID: DOC-BOUNDARY-MAP-021
- Role: Planner + Builder + Reviewer
- Owner: Francesco + Codex

### Decisions Taken

- Kept `docs/core/02-project-map.md` as a strict architecture boundary map only.
- Removed non-boundary/process framing and retained only path-level boundary guidance.
- Aligned the file to the requested 8-section structure.

### What Was Done

- Rewrote:
  - `docs/core/02-project-map.md`
- Preserved concrete repository paths for UI/API/service/auth/validation/data boundaries.

### Evidence

- Lint: not required (docs-only change).
- Build: not required (docs-only change).
- Tests: not required (docs-only change).
- Manual checks: verified referenced sensitive-module paths exist in repo.

### Residual Risks

- None for runtime behavior (docs-only).

### Assumptions

- Current architecture paths remain stable and continue to be the source of boundary decisions.

### Next Action (Concrete)

- First command/file: review and confirm boundary wording in `docs/core/02-project-map.md`.
- Next owner: Product/Owner.

---

## Entry - OPS-AGENTS-REFINE-020 Minimal Agent Contract

- Date: 2026-03-10
- Task ID: OPS-AGENTS-REFINE-020
- Role: Planner + Builder + Reviewer
- Owner: Francesco + Codex

### Decisions Taken

- Reduced AGENTS contract to only three operational agents: Planner, Builder, Reviewer.
- Converted Product/QA/ML/App viewpoints into review lenses instead of agent roles.
- Kept mandatory governance rules (SPEC for core changes, logbook handoff, architecture boundaries, privacy).

### What Was Done

- Rewrote `AGENTS.md` to a minimal 8-section structure:
  - Purpose
  - Core workflow
  - Roles
  - Core vs local changes
  - Required outputs
  - Boundaries
  - Review lenses
  - References

### Evidence

- Lint: not required (docs-only change).
- Build: not required (docs-only change).
- Tests: not required (docs-only change).
- Manual checks: verified `AGENTS.md` structure matches requested 8 sections.

### Residual Risks

- None for runtime behavior (docs-only).

### Assumptions

- Team will keep using `docs/core/03-spec-template.md`, `docs/core/04-logbook.md`, and `docs/core/02-project-map.md` as linked contracts.

### Next Action (Concrete)

- First command/file: review and confirm the new `AGENTS.md` contract wording.
- Next owner: Product/Owner.

---

## Entry - SPEC-TEMPLATE-022 Compact Core Template

- Date: 2026-03-10
- Task ID: SPEC-TEMPLATE-022
- Role: Planner + Builder + Reviewer
- Owner: Francesco + Codex

### Decisions Taken

- Reduced the SPEC template to only core-change essentials.
- Removed broad planning/process narrative to make the template fast to fill.
- Kept acceptance criteria and rollback explicitly required.

### What Was Done

- Rewrote `docs/core/03-spec-template.md` to 8 sections only:
  - Task ID
  - Problem
  - Scope
  - Out of Scope
  - Files / Layers Affected
  - Acceptance Criteria
  - Risks
  - Rollback Notes

### Evidence

- Lint: not required (docs-only change).
- Build: not required (docs-only change).
- Tests: not required (docs-only change).
- Manual checks: verified section set matches requested structure.

### Residual Risks

- None for runtime behavior (docs-only).

### Assumptions

- Core tasks will continue to use this template and keep entries binary/verifiable.

### Next Action (Concrete)

- First command/file: review and approve `docs/core/03-spec-template.md` wording.
- Next owner: Product/Owner.

---

## Entry - STUDY-MERGE-A-023 Canonical Study Route Family

- Date: 2026-03-10
- Task ID: STUDY-MERGE-A-023
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Implemented Merge A only: added canonical ` /study` route family with auth-gated layout.
- Reused existing planner surfaces directly via thin wrappers to avoid duplication.
- Deferred redirects and global link migration to later merge phases.

### What Was Done

- Added new route files:
  - `src/app/study/layout.tsx`
  - `src/app/study/profile/page.tsx`
  - `src/app/study/exams/page.tsx`
  - `src/app/study/subjects/page.tsx`
  - `src/app/study/focus/page.tsx`
- Kept existing `src/app/study/page.tsx` as planner overview wrapper.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests in this merge step.
- Manual checks: route list confirms new ` /study/*` pages are built.

### Residual Risks

- Internal CTA links inside reused planner pages still point to legacy ` /planner*` paths until planned nav/link migration phase.
- Both planner and study shells now coexist; consistency checks needed in next merge.

### Assumptions

- Direct wrapper reuse is acceptable for Merge A and minimizes risk.
- Redirect behavior will be introduced in the next merge step as planned.

### Next Action (Concrete)

- First command/file: implement Merge B internal navigation/link migration to ` /study*`.
- Next owner: Builder role.

---

## Entry - STUDY-MERGE-B-024 Internal Link Target Migration

- Date: 2026-03-10
- Task ID: STUDY-MERGE-B-024
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Updated internal navigation and deep-link targets to canonical ` /study*` routes.
- Kept legacy ` /planner*` routes intact and functional (no redirects in this merge).
- Limited changes to route destinations and active-state handling only.

### What Was Done

- Updated canonical route targets in:
  - `src/app/_components/site-nav.tsx`
  - `src/app/planner/layout.tsx`
  - `src/app/planner/_components/planner-tabs-nav.tsx`
  - `src/app/planner/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/signup/page.tsx`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional test suite in this merge step.
- Manual checks: no remaining `href`/router targets to ` /planner*` found in `src/app`.

### Residual Risks

- Legacy planner pages now navigate to study routes, which is intentional but may feel mixed until redirects are added.

### Assumptions

- Redirects will be introduced in Merge C, so temporary dual-route coexistence is acceptable.

### Next Action (Concrete)

- First command/file: implement Merge C redirect mappings from ` /planner*` to ` /study*`.
- Next owner: Builder role.

---

## Entry - BUG-SUBJECT-DELETE-025 Force Refresh After Delete

- Date: 2026-03-10
- Task ID: BUG-SUBJECT-DELETE-025
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept fix minimal and local to subject deletion flow.
- Avoided API/schema changes because backend delete logic is valid.
- Forced post-delete data refresh to bypass client cache skip behavior.

### What Was Done

- Updated `src/app/planner/subjects/page.tsx`:
  - changed post-delete refresh calls to `refresh({ force: true })` in both direct and cascade delete success branches.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no additional automated tests in this bugfix.
- Manual checks: pending browser click-through of subject delete and cascade delete flows.

### Residual Risks

- Other mutation flows that still use non-forced refresh can show stale UI under fresh cache windows.

### Assumptions

- Deletion API behavior is correct and UI staleness is the primary observed failure.

### Next Action (Concrete)

- First command/file: run manual smoke on `/study/subjects` and `/planner/subjects` deleting subjects with and without linked records.
- Next owner: QA/Reliability.

---

## Entry - BUG-SUBJECT-DELETE-026 End-to-End Cascade Delete Stabilization

- Date: 2026-03-10
- Task ID: BUG-SUBJECT-DELETE-026
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope limited to subject delete path only.
- Preserved existing UI confirm flow and API contract.
- Added explicit relational cleanup on confirmed cascade delete to avoid DB-constraint drift issues.

### What Was Done

- Updated `src/app/api/subjects/route.ts` DELETE flow:
  - when linked data exists and `confirmCascade=true`, explicitly delete related `StudySession`, `StudySource`, and `Exam` rows (scoped by `studentId` + `subjectId`) before deleting the subject.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Manual checks:
  - direct local runtime smoke could not be executed in this environment (`next dev` fails with `spawn EPERM`).
  - code-path validation confirms:
    - no-linked delete still goes through direct `subject.delete`
    - linked delete with confirmation now performs explicit child cleanup then `subject.delete`

### Residual Risks

- Environment-specific runtime verification is still required on a local machine where `next dev` can run.

### Assumptions

- Primary blocker after UI refresh fix was backend relational delete execution under non-uniform local FK behavior.

### Next Action (Concrete)

- First command/file: run manual delete smoke in browser for both no-linked and linked+confirm flows on `/study/subjects`.
- Next owner: QA/Reliability.

---

## Entry - BUG-SUBJECT-DELETE-027 Immediate Subject List Reconciliation

- Date: 2026-03-10
- Task ID: BUG-SUBJECT-DELETE-027
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept backend DELETE logic unchanged.
- Added immediate client-side list reconciliation in the subjects page, then preserved forced refresh as secondary sync.

### What Was Done

- Updated `src/app/planner/subjects/page.tsx`:
  - introduced `visibleSubjects` local state synced from hook-provided `subjects`.
  - on successful delete (direct or cascade-confirmed), immediately removed the deleted subject from `visibleSubjects`.
  - kept existing `refresh({ force: true })` and `notifyDataRevision()` calls as consistency sync.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.
- Manual checks: pending browser confirmation of immediate removal UX.

### Residual Risks

- Build verification is partially blocked by environment-level process permissions.
- If delete succeeds but follow-up refresh fails, local optimistic state may temporarily diverge from server state until next successful refresh.

### Assumptions

- Delayed UX is caused by waiting for async refresh/cache reconciliation before render state changes.

### Next Action (Concrete)

- First command/file: run browser smoke on `/planner/subjects` to confirm immediate disappearance after delete (with and without cascade confirmation).
- Next owner: QA/Reliability.

---

## Entry - CORE-DATA-COHERENCE-001 Shared Dataset And Immediate Reconciliation

- Date: 2026-03-10
- Task ID: CORE-DATA-COHERENCE-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope frontend-only with no API/domain/schema changes.
- Promoted `usePlannerData` as canonical client dataset source for subjects/exams.
- Replaced focus-only exams cache path with `usePlannerData` to remove split TTL behavior.
- Standardized mutation behavior: local reconcile first, forced background sync second.

### What Was Done

- Updated `src/app/planner/_hooks/use-planner-data.ts`:
  - added local reconciliation helpers: `upsertSubject`, `removeSubject`, `upsertExam`, `removeExam`.
  - added local cache/state commit path shared by these helpers.
  - dataset revision listener now triggers `refresh({ force: true })`.
- Updated `src/app/planner/_hooks/use-focus-exams-data.ts`:
  - removed separate exams cache logic.
  - now consumes `usePlannerData({ enabled: true, subscribeToRevision: true })`.
- Updated `src/app/planner/subjects/page.tsx`:
  - switched to revision subscription enabled.
  - on subject create/delete success, applies immediate local reconciliation via hook helpers.
  - keeps forced refresh as secondary consistency sync.
- Updated `src/app/planner/exams/page.tsx`:
  - switched to revision subscription enabled.
  - on exam create/delete success, applies immediate local reconciliation via hook helpers.
  - keeps forced refresh as secondary consistency sync.
- Updated `src/app/planner/page.tsx`:
  - enabled revision subscription to consume dataset mutation revisions.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.
- Manual checks: pending browser smoke for create/delete immediacy and cross-surface sync.

### Residual Risks

- If forced background sync fails after local reconciliation, temporary client/server divergence can occur until next successful sync.
- Build validation remains partially blocked by local environment process permission (`spawn EPERM`).

### Assumptions

- Authenticated study/planner surfaces remain behind existing session gate, so `useFocusExamsData` can safely enable dataset loading directly.

### Next Action (Concrete)

- First command/file: run manual smoke on `/study/subjects`, `/study/exams`, `/study`, and `/study/focus` for create/delete immediacy and cross-page consistency.
- Next owner: QA/Reliability.

---

## Entry - BUG-SUBJECT-HUB-LOAD-028 Subject-First Refresh Unblock

- Date: 2026-03-11
- Task ID: BUG-SUBJECT-HUB-LOAD-028
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept fix minimal in shared client state flow only.
- Prioritized subject availability over exam fetch completion inside shared refresh.
- Removed redundant explicit refresh path from subject mutations to avoid double sync triggers.

### What Was Done

- Updated `src/app/planner/_hooks/use-planner-data.ts`:
  - changed in-flight gating to apply only when `force` is false.
  - split refresh fetch flow into subject-first + exams-follow-up.
  - commits subject state/errors as soon as `/api/subjects` resolves; exams continue syncing in background.
- Updated `src/app/planner/subjects/page.tsx`:
  - removed direct `refresh({ force: true })` calls after create/delete.
  - kept immediate local reconcile + `notifyDataRevision()` as single post-mutation sync trigger.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Forced refresh can now run in parallel with an existing in-flight refresh, increasing temporary request concurrency.
- Subject load responsiveness is improved, but final cross-dataset consistency still depends on successful follow-up exam fetch.

### Assumptions

- Subject Hub UX should prioritize fast subject render, with exam-derived metrics allowed to settle shortly after.

### Next Action (Concrete)

- First command/file: manual smoke on `/study/subjects` for slow-network simulation during load + create/delete actions.
- Next owner: QA/Reliability.

---

## Entry - CORE-EXAM-MODEL-001 Merge 1 Optional Workload Contract Scaffolding

- Date: 2026-03-11
- Task ID: CORE-EXAM-MODEL-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept Merge 1 non-breaking and schema-free.
- Added optional exam workload fields to validation and API contract only.
- Preserved existing create/edit/delete behavior by defaulting workload contract fields.
- Added plain-language replacement mapping for legacy study tier labels without changing runtime copy yet.

### What Was Done

- Updated `src/server/validation/exam.ts`:
  - added optional workload contract fields:
    - `workloadReadiness`: `known | unknown`
    - `materialType`: `book | notes | mixed`
    - `workloadPayload` (minimal optional payload fields)
- Updated `src/app/api/exams/route.ts`:
  - added workload-contract response shape helper with safe defaults.
  - GET now returns exams with optional workload contract defaults.
  - POST accepts optional workload fields and echoes them in response contract.
- Updated `src/app/planner/_hooks/use-planner-data.ts`:
  - extended `PlannerExam` client type with optional workload contract fields.
- Updated `src/server/services/planning-estimator.ts`:
  - added `LEGACY_STUDY_MODE_PLAIN_LABELS` mapping (e.g., `"Tier 2 Medium" -> "Balanced effort"`).

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Workload contract fields are not persisted yet (no schema changes in Merge 1), so values from POST response are transitional scaffolding.
- Legacy label replacement mapping is defined but not yet wired to output surfaces.

### Assumptions

- Merge 1 is intended as compatibility-first contract setup before persistence and UI integration merges.

### Next Action (Concrete)

- First command/file: implement Merge 2 in `src/app/planner/exams/page.tsx` to expose canonical workload inputs in create/edit flows.
- Next owner: App Engineer.

---

## Entry - CORE-EXAM-MODEL-001 Merge 1 Semantic Correction (No False Durability)

- Date: 2026-03-11
- Task ID: CORE-EXAM-MODEL-001
- Role: Reviewer + Builder
- Owner: App Engineer + QA

### Decisions Taken

- Kept Merge 1 scaffolding direction, but removed API behavior implying non-existent persistence.
- Preserved optional workload fields in validation/client types for forward compatibility.

### What Was Done

- Updated `src/app/api/exams/route.ts`:
  - removed synthetic workload defaults injection from GET response.
  - removed non-persisted workload echo from POST response.
  - API now returns only persisted exam fields until schema persistence is introduced.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Workload fields remain accepted by validation but are not persisted yet, so persistence semantics are intentionally deferred.

### Assumptions

- Merge 2 or later will introduce persistence and then promote workload fields to durable API truth.

### Next Action (Concrete)

- First command/file: implement persistence-aware exam workload fields before exposing them as durable API response fields.
- Next owner: App Engineer.

---

## Entry - CORE-EXAM-MODEL-001 Merge 1.5 Durable Exam Workload Persistence

- Date: 2026-03-11
- Task ID: CORE-EXAM-MODEL-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Implemented minimal nullable persistence on `Exam` only.
- Kept workload fields optional and non-blocking for existing flows.
- Persisted values only when provided; no synthetic defaults introduced.

### What Was Done

- Updated `prisma/schema.prisma`:
  - `Exam.workloadReadiness String?`
  - `Exam.materialType String?`
  - `Exam.workloadPayload Json?`
- Generated migration:
  - `prisma/migrations/20260311151309_add_exam_workload_fields/migration.sql`
- Regenerated Prisma client (`src/generated/prisma/*`).
- Updated `src/app/api/exams/route.ts`:
  - GET now selects and returns persisted workload fields as-is.
  - POST normalizes optional workload input before write (trim strings, empty payload -> DB null).
  - No default invention when fields are absent.

### Evidence

- Migration generated successfully.
- Prisma client generated successfully.
- Type check: `npx tsc --noEmit` passed.
- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- DB-level allowed values for readiness/material are still enforced in app validation, not DB constraints (intended for minimal diff).
- Runtime verification on environment with reliable `next build`/`next dev` execution is still pending.

### Assumptions

- Optional nullable fields are sufficient for Merge 1.5 before UI rollout in Merge 2.

### Next Action (Concrete)

- First command/file: implement Merge 2 exam create/edit workload UI wiring in `src/app/planner/exams/page.tsx`.
- Next owner: App Engineer.

---

## Entry - BUG-PRISMA-MISMATCH-029 Apply Exam Workload Migration And Regenerate Runtime Client

- Date: 2026-03-11
- Task ID: BUG-PRISMA-MISMATCH-029
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Applied minimal runtime consistency fix only (no product logic changes).
- Kept fix focused on migration + generated client alignment.

### What Was Done

- Verified runtime client import path in `src/server/db/client.ts` points to `@/generated/prisma/client`.
- Verified migration existed but was not applied.
- Applied pending migration `20260311151309_add_exam_workload_fields`.
- Regenerated Prisma client to `src/generated/prisma`.
- Re-verified migration status and generated model field presence.

### Evidence

- `prisma migrate status`: database schema is up to date.
- `npx tsc --noEmit`: passed.
- Generated Exam model now contains:
  - `workloadReadiness`
  - `materialType`
  - `workloadPayload`
- Local `next dev` runtime verification is blocked in this environment by `spawn EPERM`.

### Residual Risks

- Direct `/api/exams` runtime smoke could not be completed in this environment due local `next dev` process spawn restriction.

### Assumptions

- On a normal local runtime (without spawn restriction), restarting the app after migration+generate resolves the unknown-field error.

### Next Action (Concrete)

- First command/file: restart local app process and run authenticated smoke on `/api/exams` to confirm no `Unknown field` error.
- Next owner: QA/Reliability.

---

## Entry - UX-SUBJECTS-031 Transient Success Feedback Pattern

- Date: 2026-03-11
- Task ID: UX-SUBJECTS-031
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope limited to local feedback behavior on Subjects surface.
- Matched feedback pattern already used on Exams for consistency.

### What Was Done

- Updated `src/app/planner/subjects/page.tsx`:
  - replaced sticky `message` state with typed `feedback` state (`success|error`).
  - success feedback now auto-dismisses after ~2.2s.
  - inline persistent alert now reserved for errors only.
  - added lightweight transient success toast.
  - preserved existing create/delete behavior and backend interactions.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Subject hint-save success is now also transient (toast), which changes persistence of that feedback.
- Browser smoke still required to validate feel/timing on real user interactions.

### Assumptions

- Success messages should be non-sticky and less noisy across planner surfaces.

### Next Action (Concrete)

- First command/file: manual smoke on `/study/subjects` and `/planner/subjects` for create/delete/hint-save feedback behavior.
- Next owner: QA/Reliability.

---

## Entry - UX-EXAMS-030 Transient Success Feedback And Faster Perceived Mutation Flow

- Date: 2026-03-11
- Task ID: UX-EXAMS-030
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope localized to exams page feedback + mutation flow.
- Preserved optimistic/local reconciliation path.
- Removed redundant explicit post-mutation forced refresh wait to reduce noise and latency perception.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - replaced sticky `message` with typed `feedback` state (`success|error`).
  - success feedback now auto-dismisses after ~2.2s.
  - inline persistent alert now reserved for errors.
  - success shown via lightweight transient toast.
  - create/delete mutation flows keep immediate local reconcile (`upsertExam` / `removeExam`) + `notifyDataRevision()` and no longer await explicit `refresh({ force: true })`.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Background sync now relies on revision-triggered refresh path; if that path regresses, sync can lag.
- Runtime UX smoke still required in browser to confirm subjective responsiveness improvement.

### Assumptions

- Immediate local reconcile plus revision-based sync is sufficient for exam create/delete consistency.

### Next Action (Concrete)

- First command/file: manual smoke on `/study/exams` and `/planner/exams` for create/delete speed perception and feedback behavior.
- Next owner: QA/Reliability.

---

## Entry - UX-SUBJECTS-031 Transient Success Feedback On Subjects

- Date: 2026-03-11
- Task ID: UX-SUBJECTS-031
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Matched the lightweight transient success feedback pattern used on exams.
- Kept sticky inline alert reserved for errors only.
- Kept scope local to subjects page UI state and rendering only.

### What Was Done

- Updated `src/app/planner/subjects/page.tsx`:
  - replaced sticky success `message` usage with typed `feedback` state (`success | error`).
  - auto-dismiss success feedback after ~2.2s.
  - preserved inline alert for errors only.
  - render short-lived success toast at bottom-right.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` fails in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Timing of transient feedback can feel too short/long depending on device/perf.
- Browser manual smoke still needed for final UX validation.

### Assumptions

- Subjects should follow exams behavior: transient success + persistent inline errors.

### Next Action (Concrete)

- First command/file: manual smoke on `/planner/subjects` and `/study/subjects` for create/delete feedback visibility and auto-dismiss timing.
- Next owner: QA/Reliability.

---

## Entry - CORE-EXAM-MODEL-001 Merge 2 Canonical Workload Inputs In Exams UI

- Date: 2026-03-11
- Task ID: CORE-EXAM-MODEL-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Exposed exam-owned workload fields directly in exams create flow with an explicit unknown-first path.
- Added minimal workload-only edit persistence (`PATCH /api/exams?id=...`) to avoid fake edit semantics.
- Kept wording plain and student-facing; no certainty defaults or inferred workload values.

### What Was Done

- `src/app/planner/exams/page.tsx`
  - added inline workload inputs to exam create:
    - `workloadReadiness` (`known`/`unknown`)
    - `materialType` (`book`/`notes`/`mixed`)
    - workload payload (`totalPages`, `bookTitle`, `notesSummary`, `materialDetails`)
  - unknown workload is valid and shown as provisional guidance.
  - added per-exam lightweight workload edit panel and save action.
  - added clear helper copy around unknown/material/provisional states.
- `src/server/validation/exam.ts`
  - added `updateExamWorkloadSchema` for workload-only patch payloads.
- `src/app/api/exams/route.ts`
  - added `PATCH` handler to persist workload field updates for owned exams.
  - normalizes trim/choices/payload and stores only provided persisted values.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after successful compile during TypeScript/build worker phase.

### Residual Risks

- New edit panel increases per-card UI density on exams list.
- Material type remains optional in known mode for now; some records may stay partially specified.

### Assumptions

- Merge 2 requires real persisted workload edits, not UI-only draft state.
- Keeping unknown mode explicit is preferable to forced incomplete defaults.

### Next Action (Concrete)

- Manual smoke on `/planner/exams` and `/study/exams`: create exam (unknown/known), edit workload save, reload check persistence, and verify no regression in delete/open timeline.

---

## Entry - CORE-EXAM-MODEL-001 Merge 2.1 Book Lookup Consolidation Into Exams

- Date: 2026-03-12
- Task ID: CORE-EXAM-MODEL-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Moved the automatic book lookup experience into canonical exam-owned workload create/edit flow.
- Reused existing `/api/books/search` contract and typeahead behavior from Study Plan Assistant (suggestions, verified pages, source, confidence).
- Disabled standalone Study Plan Assistant surface in Season overview to keep Season focused on overview/planning.

### What Was Done

- Added reusable lookup component: `src/app/planner/_components/book-search-typeahead.tsx`.
- Integrated lookup into `src/app/planner/exams/page.tsx` for `materialType = book|mixed` in both create and edit workload flows.
- Stored lookup metadata in exam-owned `workloadPayload` (verified pages, source, match confidence, authors, inferred subject).
- Extended client/API validation and normalization to persist new optional metadata fields:
  - `src/app/planner/_hooks/use-planner-data.ts`
  - `src/server/validation/exam.ts`
  - `src/app/api/exams/route.ts`
- Removed standalone estimator CTA block and component mount from Season overview:
  - `src/app/planner/page.tsx`

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Existing standalone assistant component file remains in repo but is no longer mounted from Season overview.
- Mixed/known flows depend on user choosing material type before conditional fields appear.

### Assumptions

- Exam create/edit is now the canonical ownership point for workload/material entry.
- Season should not host a duplicate primary input flow for the same responsibility.

### Next Action (Concrete)

- Manual smoke on `/study/exams` and `/planner/exams`:
  - create with book lookup, notes, mixed, unknown
  - edit workload and verify persisted metadata after reload
  - confirm Season overview no longer exposes standalone assistant input flow

---

## Entry - UX-EXAMS-032 Minimal Simplification Of Subject+Exam Create Flow

- Date: 2026-03-12
- Task ID: UX-EXAMS-032
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope local to `src/app/planner/exams/page.tsx` with no backend contract changes.
- Combined subject selection and quick subject creation into the same primary exam submit flow.
- Reduced visible fields via staged sections and conditional rendering (target grade hidden by default).

### What Was Done

- Unified create panel into a single staged frame:
  1) Subject (existing or quick create inline)
  2) Exam basics (title/date + optional target grade toggle)
  3) Study setup (unknown/book/notes/mixed with conditional fields)
- Added quick inline subject creation inside exam submit path:
  - if `Create new subject` is selected, `/api/subjects` is called first, then exam create proceeds with the new subject id.
- Preserved existing book lookup in create flow and existing exam create/edit/delete behavior.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- New quick subject create path can surface subject conflict errors (e.g., duplicate name) in the same submit cycle.
- Existing subject auto-selection behavior remains for convenience and may not fit every user preference.

### Assumptions

- One submit action for subject+exam setup reduces friction more than a separate subject-first step.

### Next Action (Concrete)

- Manual smoke on `/study/exams` and `/planner/exams`:
  - existing subject + exam create
  - new inline subject + exam create
  - unknown/book/notes/mixed setup visibility and submission

---

## Entry - CORE-SUBJECT-AFFINITY-001 First Usable Onboarding Panel

- Date: 2026-03-12
- Task ID: CORE-SUBJECT-AFFINITY-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Used existing profile surface (`/study/profile`) for first-input onboarding to keep scope minimal.
- Added durable persistence on `Student.subjectAffinity` as nullable JSON for reuse in future affinity logic.
- Kept UI compact and non-gamey: two plain multi-select questions with one primary save action.

### What Was Done

- Added student-level durable affinity field:
  - `prisma/schema.prisma` -> `Student.subjectAffinity Json?`
  - migration created/applied: `prisma/migrations/20260312203807_add_student_subject_affinity/migration.sql`
- Extended validation and API wiring:
  - `src/server/validation/student.ts` -> subject option set + `subjectAffinity` schema
  - `src/app/api/students/route.ts` -> accepts/persists normalized affinity payload
  - `src/app/api/auth/me/route.ts` -> returns `subjectAffinity`
  - `src/app/planner/_hooks/use-auth-student.ts` -> typed `subjectAffinity` in auth cache shape
- Added onboarding panel UI in profile page:
  - `src/app/planner/students/page.tsx`
  - two required questions with multi-select subject chips
  - one primary action: `Save preferences and continue`

### Evidence

- Migration applied successfully (`20260312203807_add_student_subject_affinity`).
- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Affinity subject list is currently fixed in UI/validation; updates require code changes.
- No downstream affinity engine consumes these preferences yet (intentional first-input layer only).

### Assumptions

- `/study/profile` is acceptable as first rollout surface for onboarding preferences.

### Next Action (Concrete)

- Manual smoke:
  - open `/study/profile`
  - select multiple chips in both questions
  - save, refresh page, and confirm preferences remain selected

---

## Entry - CORE-SUBJECT-AFFINITY-002 Lightweight Planning Use

- Date: 2026-03-12
- Task ID: CORE-SUBJECT-AFFINITY-002
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Added one shared helper layer (`src/lib/subject-affinity.ts`) for normalization + modest planning factors.
- Applied affinity only as small multipliers (buffer/pace), with no rigid labels and no heavy ML.
- Surfaced plain-language explanation in Season timeline when an affinity adjustment is active.

### What Was Done

- Shared helper:
  - `src/lib/subject-affinity.ts`
  - normalizes stored affinity payload
  - resolves subject match (`preferred` / `effort` / `none`)
  - exposes modest factors for pace/buffer/urgency weighting
- Season planning integration:
  - `src/app/planner/_lib/season-engine.ts`
    - `buildExamProgressSnapshot` and `buildSeasonPlan` now accept normalized affinity
    - applies small adjustments to pace, daily targets, mission minutes, urgency weighting
    - exposes `affinityAdjustment` on each exam track
  - `src/app/planner/page.tsx`
    - reads affinity from auth context
    - passes it into `buildSeasonPlan`
    - shows plain-language note in selected exam timeline card
- Estimator service integration:
  - `src/app/api/planning/estimate/route.ts`
    - loads student `subjectAffinity` and passes normalized value to estimator
  - `src/server/services/planning-estimator.ts`
    - applies small affinity multipliers to cold-start pace and workload buffering
    - adds rationale tags (`affinity_effort_buffer` / `affinity_preferred_pace`)
    - keeps outputs transparent via `affinityAdjustment` + rationale text

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Alias-based subject matching is heuristic and may miss uncommon subject names.
- Adjustment multipliers are intentionally modest but still heuristic until more user feedback/data.

### Assumptions

- Small, transparent buffer/pace shifts are preferable to opaque personalization.

### Next Action (Concrete)

- Manual smoke:
  - set effort/easiest subjects in `/study/profile`
  - verify `/study` selected exam timeline shows affinity note where applicable
  - run `/api/planning/estimate` with authenticated session and verify affinity rationale tags.

---

## Entry - UX-AFFINITY-003 Planner Explanation Refinement

- Date: 2026-03-12
- Task ID: UX-AFFINITY-003
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the affinity logic unchanged and refined only the planner-facing explanation layer.
- Moved affinity explanation copy into a small shared helper so the tone stays consistent.
- Continued to show affinity rationale only in the selected exam timeline area, not across multiple cards.

### What Was Done

- Updated `src/lib/subject-affinity.ts`:
  - added `getSubjectAffinityExplanation()` for calm, plain-language UI copy.
- Updated `src/app/planner/page.tsx`:
  - removed inline affinity explanation strings from page-local copy.
  - renders one shared “plan note” message only when the selected exam has an active affinity adjustment.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Affinity explanation still appears only in the overview timeline, not in other planning surfaces.
- Copy is centralized now, but any future new surface should reuse the helper to avoid drift.

### Assumptions

- A single contextual note is clearer than repeating the same rationale across multiple cards.

### Next Action (Concrete)

- Manual smoke:
  - open `/study`
  - select an exam with an active affinity adjustment
  - confirm one calm note appears and no note appears for neutral subjects

---

## Entry - CORE-SUBJECT-AFFINITY-004 Matching Robustness Pass

- Date: 2026-03-12
- Task ID: CORE-SUBJECT-AFFINITY-004
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the affinity model unchanged and improved only the alias-resolution layer.
- Switched matching from loose substring behavior to explicit normalized phrase/token matching.
- Added common English, Italian, and abbreviation variants while keeping the rules readable.

### What Was Done

- Updated `src/lib/subject-affinity.ts`:
  - expanded alias coverage (`matematica`, `fisica`, `chimica`, `diritto`, `informatica`, `econ`, `cs`, etc.)
  - added token-set matching for single-word aliases
  - added exact phrase matching for multi-word aliases
  - avoids accidental partial matches such as `art` inside unrelated words
- Added `src/lib/subject-affinity.test.ts` to pin down common variations and false-positive cases.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.
- Test execution: test file added, but local Vitest execution failed in this environment with `spawn EPERM`.
- Build: `npm run build` failed in this environment with `spawn EPERM` after compile during TypeScript/build worker phase.

### Residual Risks

- Alias-based matching is still heuristic and depends on the curated list staying current.
- Very uncommon custom subject names may still fall through to `none`.

### Assumptions

- Explicit aliases plus token/phrase matching is a safer step than introducing fuzzy matching.

### Next Action (Concrete)

- Manual smoke:
  - save affinity with Italian and abbreviated subject names where possible
  - verify matching subjects get the expected planner note

## 2026-03-12 - UX-AFFINITY-005 Next-Step Affinity Explanation

- Task ID: UX-AFFINITY-005
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the affinity adjustment model unchanged and only exposed it in the next-step mission explanation.
- Rendered the note only when a mission has an active affinity adjustment.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts` to carry `affinityAdjustment` onto each `SeasonMission`.
- Added `getNextStepAffinityExplanation()` in `src/lib/subject-affinity.ts` for short, calm mission-level copy.
- Updated `src/app/planner/page.tsx` to show one small note under the mission duration/pages line only when affinity materially changed that step.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.

### Residual Risks

- Mission-level explanation is still shown per affected mission, so pages with many adjusted missions can repeat the pattern.

### Assumptions

- A short mission note is the smallest useful place to explain affinity impact on the next recommended step.

### Next Action (Concrete)

- Manual smoke:
  - open `/study`
  - verify adjusted missions show the note only when affinity is active
  - verify neutral missions show no extra explanation

## 2026-03-12 - CORE-EXAM-MODEL-002 Partial Book Coverage Support

- Task ID: CORE-EXAM-MODEL-002
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the exam record as the canonical source of truth by extending only `workloadPayload`.
- Added only the first partial-book representation now: a page range for book or mixed materials.
- Avoided invented defaults: no partial coverage is stored unless the user explicitly enables it.

### What Was Done

- Extended exam workload validation and API normalization with:
  - `bookCoverageMode: "page_range"`
  - `bookPageStart`
  - `bookPageEnd`
- Updated planner exam typing to expose the persisted partial-book fields.
- Updated `src/app/planner/exams/page.tsx` create/edit workload UI:
  - added a lightweight partial-book toggle in book/mixed flows
  - added start/end page inputs when partial coverage is enabled
  - blocked save/create when the partial range is incomplete or invalid
  - surfaced the saved assigned page range in exam chips

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.

### Residual Risks

- Planner progression logic still does not consume the stored partial page range outside the exams workflow.
- Chapter-level inclusion/exclusion is still out of scope and not represented yet.

### Assumptions

- Page-range support is the smallest honest first representation for partial book assignments before adding chapter-level coverage.

### Next Action (Concrete)

- Manual smoke:
  - create a book-backed exam with partial coverage enabled
  - edit an existing exam to add and remove a page range
  - confirm the saved range persists and reopens correctly

## 2026-03-12 - UX-EXAMS-033 Book Lookup Layout Containment

- Task ID: UX-EXAMS-033
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept lookup behavior and data flow unchanged.
- Fixed only layout containment and copy block wrapping in the shared typeahead UI.

### What Was Done

- Updated `src/app/planner/_components/book-search-typeahead.tsx`:
  - enforced `min-w-0` on the field/input container
  - constrained suggestion panel width (`w-full max-w-full`)
  - improved helper text wrapping
  - added text wrapping on option rows to avoid horizontal overflow
- Updated `src/app/planner/exams/page.tsx`:
  - added `min-w-0` to both create/edit lookup wrappers in the exam workload sections

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.

### Residual Risks

- Very long unbroken strings can still force awkward wrapping in small widths, but they remain contained.

### Assumptions

- The visible break was caused by missing width constraints and word wrapping in the shared typeahead UI.

### Next Action (Concrete)

- Manual smoke:
  - open `/study/exams` and `/planner/exams`
  - switch to Book material type in create and edit
  - verify helper text and suggestions remain aligned and contained on desktop and mobile widths

## 2026-03-12 - UX-PROFILE-034 Transient Save Feedback For Profile + Affinity

- Task ID: UX-PROFILE-034
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept feedback changes local to the profile/affinity page where sticky success prompts were active.
- Kept inline alerts for errors and moved success to short-lived transient feedback.

### What Was Done

- Updated `src/app/planner/students/page.tsx`:
  - replaced string `message` state with typed `feedback` state (`success | error`)
  - added success auto-dismiss timer (~2.2s)
  - retained persistent inline `planner-alert` for error messages only
  - rendered success as transient toast (`role="status"`, `aria-live="polite"`)
- No form, API, or persistence logic changed.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.

### Residual Risks

- Fixed toast timeout may feel short or long depending on reading speed.

### Assumptions

- Profile and affinity save flows should follow the same success/error feedback policy already used on exams/subjects pages.

### Next Action (Concrete)

- Manual smoke on `/study/profile`:
  - save profile fields and confirm transient success toast
  - save affinity selections and confirm transient success toast
  - force an error path and confirm inline persistent error alert

## 2026-03-12 - UX-EXAMS-035 Subject Entry Simplification In Exam Create

- Task ID: UX-EXAMS-035
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept the exam create flow canonical and unchanged in behavior.
- Limited changes to the subject-entry section visual/interaction structure only.

### What Was Done

- Updated `src/app/planner/exams/page.tsx` subject block:
  - added a clearer mode context line (`existing` vs `new`) with concise hint copy
  - replaced loose mode buttons with a compact segmented switch style
  - reduced spacing and visual weight in this section
  - kept existing subject select path intact
  - tightened inline new-subject form into a compact 2-column layout with lightweight placeholders
- No API, persistence, or routing changes.

### Evidence

- Lint: `npm run lint` passed.
- Type check: `npx tsc --noEmit` passed.

### Residual Risks

- Placeholder examples are opinionated; some users may ignore them.
- Segment buttons still use global button styles, so full visual consistency depends on shared class behavior.

### Assumptions

- The main friction was visual heaviness and unclear subject-mode context, not data or validation behavior.

### Next Action (Concrete)

- Manual smoke:
  - `/study/exams` and `/planner/exams`
  - verify existing-subject path remains one quick select
  - verify inline new-subject path remains one-submit with exam create

## 2026-03-12 - UX-AFFINITY-036 Profile Affinity Modal Flow + Selection Caps

- Task ID: UX-AFFINITY-036
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Replaced the embedded affinity section with a compact summary card and a local modal editor to reduce profile page weight.
- Enforced a strict max of 3 selections per affinity group and mutual exclusivity between groups.
- Added normalization on both client and API save path so legacy profiles with larger stored lists do not fail new max-3 validation.

### What Was Done

- Updated `src/app/planner/students/page.tsx`:
  - removed embedded chip selectors from page body
  - added compact summary card with one action button (`Set preferences` / `Edit preferences`)
  - added local dismissible modal for affinity editing
  - auto-opens modal once when loaded profile has no saved affinity
  - keeps manual reopen/edit always available from summary card
  - added counters and calm inline guidance in modal
  - enforced max 3 per group and mutual exclusivity in local toggle behavior
  - normalized loaded/saved values (allowed subjects only, dedupe, cap, cross-group cleanup)
- Updated `src/server/validation/student.ts`:
  - tightened `subjectAffinity` schema max length from 12 to 3 for each group
- Updated `src/app/api/students/route.ts`:
  - normalized incoming affinity lists with cap=3, dedupe, allowed-subject filter, and cross-group exclusivity before persistence

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.
- Build: `npm.cmd run build` failed in this environment with `spawn EPERM` after successful compile + TypeScript phase.

### Residual Risks

- Auto-open behavior is local to each profile page visit; users who dismiss without saving will see the prompt again on a later visit while preferences remain empty.
- Summary chips reflect normalized saved state; if external tooling writes non-normalized values directly, they will be trimmed on next profile interaction/save.

### Assumptions

- “Auto-open once” means once per profile visit/load cycle, not a permanent cross-session suppression flag.
- Preference storage remains optional and should tolerate empty selections.

### Next Action (Concrete)

- Manual smoke on `/study/profile`:
  - first-time user with empty affinity: confirm one-time auto-open + dismiss/reopen behavior
  - enforce 3/3 cap in each group with mutual exclusion toggles
  - save and refresh to confirm normalized persistence for both groups

## 2026-03-12 - UX-AFFINITY-037 Next-Step Affinity Explanation Relevance Guard

- Task ID: UX-AFFINITY-037
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept existing affinity explanation copy and placement model, and changed only relevance/noise gating.
- Limited affinity explanation rendering to one next-step card at most, only when affinity materially changed that mission recommendation.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - extended `SeasonMission` with `affinityEffectMaterial`
  - computed mission-level material impact by comparing baseline mission minutes vs affinity-adjusted mission minutes (threshold: at least 5 minutes difference)
- Updated `src/app/planner/page.tsx`:
  - selected the first today mission with `affinityEffectMaterial`
  - rendered next-step affinity note only for that mission card (single note, no repeated noise)

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.

### Residual Risks

- Materiality is currently minute-delta based; edge cases where pages or urgency shift without a minute delta are not surfaced by this note.

### Assumptions

- A 5-minute change is a practical minimum threshold for “meaningful” impact in this UI context.

### Next Action (Concrete)

- Manual smoke on `/study`:
  - verify note appears only once in today missions when affinity materially shifts the recommendation
  - verify no note appears when affinity has no material effect on computed mission minutes

## 2026-03-12 - UX-EXAMS-038 Book Lookup Block Rendering Stability

- Task ID: UX-EXAMS-038
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept existing lookup query/suggestion behavior intact and focused only on structural rendering stability.
- Fixed the shared Book Lookup block structure first so create/edit flows inherit the same stable layout.
- Applied only small wrapper/text-overflow adjustments in both create and edit workload forms.

### What Was Done

- Updated `src/app/planner/_components/book-search-typeahead.tsx`:
  - replaced single outer `<label>` wrapper with explicit block structure:
    - field label (`label[for]`)
    - input
    - helper text
    - suggestions/results panel
  - kept existing debounce/cache/search/select behavior unchanged
  - added explicit input/help IDs for stable accessibility linkage
  - removed option-level `overflow-hidden` clipping class from suggestion buttons
  - normalized suggestion panel spacing (`mt-0`) within the block
- Updated `src/app/planner/exams/page.tsx`:
  - aligned create/edit Book Lookup wrappers with `md:self-start` and `min-w-0`
  - hardened selected-book and partial-coverage cards against long-text overflow (`min-w-0`, `break-words`, relaxed line height)

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.
- Build: `npm.cmd run build` failed in this environment with `spawn EPERM` after successful compile + TypeScript phase.

### Residual Risks

- Suggestion panel remains in-flow (not portal/floating); very dense forms can still push surrounding content downward when many results are visible.

### Assumptions

- Reported breakage was primarily from container semantics/layout structure and overflow behavior, not from API/search logic.

### Next Action (Concrete)

- Manual smoke on `/study/exams` and `/planner/exams`:
  - set material type to `book` in create and edit
  - verify stable vertical order (label/input/helper/results)
  - verify no clipping/overlap on long titles/authors and no detached panel behavior

## 2026-03-14 - EST-WORKLOAD-LAYER-001 Patch A Shared Heuristic Core

- Task ID: EST-WORKLOAD-LAYER-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Implemented Patch A as an isolated, pure shared helper with no planner/API wiring changes.
- Kept scope to deterministic heuristic core only: effective scope, pace prior, and reliability.
- Used only currently available signals (no new workload fields, no adaptation logic).

### What Was Done

- Added `src/lib/workload-estimation-core.ts`:
  - `estimateWorkloadCore(input)` returns:
    - `effectiveScopePages`
    - `scopeSource`
    - `priorPagesPerHour`
    - `paceSource`
    - `reliabilityLevel`
    - `reliabilityWhy`
  - implemented deterministic evidence ladder:
    - `known_pages`
    - `book_partial_range`
    - `verified_pages`
    - `total_pages`
    - `subject_material_fallback`
  - implemented deterministic subject/material pace priors with bounded output and explicit source tags
  - implemented reliability scoring from evidence quality, workload readiness, and page-signal mismatch checks
- Added `src/lib/workload-estimation-core.test.ts`:
  - evidence ladder precedence checks
  - fallback behavior checks
  - reliability assignment checks
  - bounded/monotonic behavior checks for scope and pace outputs

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.
- New unit test execution:
  - `.\node_modules\.bin\vitest.cmd run src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1`
  - failed in this environment with `spawn EPERM` before test execution.
- Build: `npm.cmd run build` failed in this environment with `spawn EPERM` after successful compile + TypeScript phase.

### Residual Risks

- Heuristic priors and fallback constants are intentionally conservative and may need calibration with real usage data.
- Reliability scoring is currently rules-based and not yet informed by observed progress trends.

### Assumptions

- Patch A should remain reusable and isolated, so existing planner/estimator behavior remains unchanged until later wiring patches.

### Next Action (Concrete)

- Patch B: wire `estimateWorkloadCore` into one integration point first (`planning-estimator`) behind deterministic regression tests, then mirror into season planner once outputs match acceptance criteria.

## 2026-03-14 - EST-WORKLOAD-LAYER-002 Patch B Canonical Non-Book + Approximate Signals

- Task ID: EST-WORKLOAD-LAYER-002
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Extended exam workload payload as canonical source with additive optional signals only.
- Kept exam form lightweight with conditional fields only in non-book paths (`notes` / `mixed`).
- Preserved existing behavior when new fields are absent and avoided fake precision defaults.

### What Was Done

- Added shared canonical workload signal contract:
  - `src/lib/exam-workload-contract.ts`
- Extended schema validation:
  - `src/server/validation/exam.ts`
  - added `materialShape`, `approximateScopeValue`, `approximateScopeUnit`, `isApproximate`
  - added pair-consistency checks for approximate value/unit
- Added API workload payload normalization module:
  - `src/server/validation/exam-workload-normalization.ts`
  - wired into `src/app/api/exams/route.ts`
- Updated planner exam typing and workload draft/payload mapping:
  - `src/app/planner/_hooks/use-planner-data.ts`
  - `src/app/planner/exams/page.tsx`
  - create/edit conditional compact inputs for new signals in non-book flows
  - workload chips now surface saved material shape and approximate indicator
- Added tests:
  - `src/server/validation/exam.test.ts`
- Extended shared workload-core payload type contract:
  - `src/lib/workload-estimation-core.ts`

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.
- Tests:
  - `.\node_modules\.bin\vitest.cmd run src/server/validation/exam.test.ts --pool=threads --maxWorkers=1` passed (5 tests).
- Manual checks:
  - Conditional flow logic verified in code path for create/edit notes/mixed workload sections.

### Residual Risks

- `materialType` and `materialShape` can still be interpreted as overlapping by some users, especially for `mixed`.
- New approximate signals are stored but not yet consumed by estimator/planner computations in this patch.

### Assumptions

- Patch B scope is contract + validation + normalization + exam UI capture only, with no planner adaptation wiring yet.
- Existing workload payload consumers safely ignore additive optional fields.

### Next Action (Concrete)

- First command/file:
  - Wire these new canonical signals into the next estimator integration patch entry point (starting with `src/server/services/planning-estimator.ts`).
- Next owner:
  - Planner + Builder for Patch C integration scope.

## 2026-03-14 - EST-WORKLOAD-LAYER-003 Patch C Shared Core Consumption

- Task ID: EST-WORKLOAD-LAYER-003
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Integrated shared workload core in estimator first, then mirrored into season planner because the patch remained low-risk and isolated.
- Preserved legacy fallback paths when canonical workload scope evidence is missing.
- Kept explainability honest by returning core fields only when canonical workload metadata is actually present.

### What Was Done

- Extended shared workload core behavior:
  - `src/lib/workload-estimation-core.ts`
  - added support for approximate scope conversion and conservative reliability handling for approximate scope
  - added material-shape pace multiplier support
- Extended planning input validation:
  - `src/server/validation/planning.ts`
  - accepts optional canonical workload fields (`workloadReadiness`, `materialType`, `workloadPayload` including Patch B signals)
- Updated planning estimate API pass-through:
  - `src/app/api/planning/estimate/route.ts`
  - mismatch checks and resolved known/verified pages now consider canonical payload verified pages
- Wired shared core into estimator:
  - `src/server/services/planning-estimator.ts`
  - core scope used when explicit canonical scope evidence exists
  - legacy page-count model retained when canonical scope is absent
  - core pace prior blended conservatively only when pace signals are meaningful
  - estimator output now carries:
    - `effectiveScopePages`
    - `scopeSource`
    - `priorPagesPerHour`
    - `paceSource`
    - `reliabilityLevel`
    - `reliabilityWhy`
- Mirrored core consumption into season planner:
  - `src/app/planner/_lib/season-engine.ts`
  - canonical exam scope drives `estimatedPages` when explicit scope evidence exists
  - fallback heuristic still used when scope evidence is absent/incomplete
  - canonical prior pace propagates into exam track pace calculations
  - exam tracks now carry the same core explainability fields (nullable)
- Added/updated regression tests:
  - `src/server/services/planning-estimator.test.ts`
  - `src/app/planner/_lib/season-engine.test.ts`
  - `src/lib/workload-estimation-core.test.ts`

### Evidence

- Lint: `npm.cmd run lint` passed.
- Type check: `npx.cmd tsc --noEmit` passed.
- Tests:
  - `.\node_modules\.bin\vitest.cmd run src/server/services/planning-estimator.test.ts src/app/planner/_lib/season-engine.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1` passed (16 tests).
  - `.\node_modules\.bin\vitest.cmd run src/server/validation/exam.test.ts --pool=threads --maxWorkers=1` passed (5 tests).
- Note: Vitest execution required non-sandbox mode in this environment due `spawn EPERM` under sandbox.

### Residual Risks

- Approximate-scope conversion coefficients are deterministic but still heuristic and may require calibration with real-world usage.
- Core changes now affect both estimator and season planner scope/pace flows; future tuning should include both test suites.

### Assumptions

- Patch C scope allows safe season-planner mirror when fallback behavior remains unchanged for missing canonical scope signals.
- Canonical exam workload remains the source of truth for workload-related planning signals.

### Next Action (Concrete)

- First command/file:
  - add one UI exposure pass for estimator explainability fields in `src/app/planner/_components/study-estimate-inline.tsx` (read-only, concise) if product wants user-facing transparency.
- Next owner:
  - Planner + UX reviewer.

## 2026-03-14 - UX-FOCUS-HYDRATION-004 Focus Page Hydration Mismatch Fix

- Task ID: UX-FOCUS-HYDRATION-004
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope limited to `PlannerFocusPage` hydration path only.
- Fixed root cause by removing client-only reads from initial render state.
- Avoided `suppressHydrationWarning`; hydrated localStorage-backed values after mount.

### What Was Done

- Updated `src/app/planner/focus/page.tsx`:
  - added deterministic server-safe initial stats constant (`EMPTY_FOCUS_STATS`)
  - changed initial `stats` state to server-safe defaults
  - changed initial `focusProgress` state to empty map
  - added client hydration flag (`hasHydratedClientState`)
  - added mount hydration effect to load:
    - `getInitialFocusStats()`
    - `readFocusProgress()`
  - gated stats persistence effect so `localStorage` writes occur only after hydration

### Evidence

- Type check: `npx.cmd tsc --noEmit` passed.
- Lint: `npm.cmd run lint` passed.
- Manual checks: not executed in this terminal session.

### Residual Risks

- A short post-mount UI update is expected when persisted focus stats/progress are loaded.

### Assumptions

- The hydration warning was caused by initial render reading localStorage-derived values on client while SSR used zero/empty values.

### Next Action (Concrete)

- First command/file:
  - run manual browser check on `/study/focus` with non-zero `studyapp_focus_stats` in localStorage and confirm no hydration mismatch warning.
- Next owner:
  - QA/Reliability.

## 2026-03-14 - EST-WORKLOAD-LAYER-004 Patch D Cautious Progress Adaptation

- Task ID: EST-WORKLOAD-LAYER-004
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Added progress adaptation only in estimator pace correction path (no UI/schema/planner redesign).
- Applied correction only after minimum evidence gate and stability gate pass.
- Kept correction bounded and gradual to avoid sparse-data overreaction.

### What Was Done

- Updated `src/server/services/planning-estimator.ts`:
  - introduced deterministic adaptation constants and gate states
  - added `applyProgressPaceAdaptation` with:
    - minimum evidence gate (samples + minutes)
    - variability gate (`cv`) for noisy progress
    - bounded correction factor clamp
    - gradual weighted update capped by max adaptation weight
  - wired adaptation into pace posterior before pace-driven estimation
  - added explainability carry-through via:
    - rationale tags (`progress_adaptation_applied`, `progress_adaptation_gated`)
    - conservative/adapted note in `passChanceRationale`
- Updated `src/server/services/planning-estimator.test.ts`:
  - gate behavior
  - clamp behavior
  - gradual adaptation behavior
  - sparse outlier no-overreaction behavior
  - missing-progress fallback behavior

### Evidence

- Tests:
  - `npx.cmd vitest run src/server/services/planning-estimator.test.ts src/app/planner/_lib/season-engine.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1` passed (21 tests).
- Type check:
  - `npx.cmd tsc --noEmit` passed.
- Lint:
  - `npm.cmd run lint` passed.
- Note: vitest required non-sandbox mode in this environment due `spawn EPERM` under sandbox.

### Residual Risks

- Adaptation thresholds are deterministic heuristics and may need tuning after observing longer-run production progress traces.
- Progress evidence quality still depends on session logging consistency (minutes/pages/retention).

### Assumptions

- Real-progress adaptation scope is limited to estimator pace correction in Patch D; planner-wide adaptation remains out of scope.
- Conservative gating + bounded blending is preferred over aggressive early personalization.

### Next Action (Concrete)

- First command/file:
  - add one compact unit-level calibration/tuning table in `src/server/services/planning-estimator.test.ts` for threshold boundary cases.
- Next owner:
  - Planner + QA.

## 2026-03-14 - DOCS-CORE-WORKLOAD-005 Core Docs Alignment for Shared Workload Direction

- Task ID: DOCS-CORE-WORKLOAD-005
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept doc updates minimal and operational (no redesign, no long-form narrative).
- Updated architecture map for shared workload-core ownership and canonical signal boundaries.
- Added one small spec-template rule to reduce future estimator/planner ambiguity.

### What Was Done

- Updated `docs/core/02-project-map.md`:
  - added shared workload core boundary (`src/lib/workload-estimation-core.ts`)
  - documented planner consumers (`planning-estimator`, `season-engine`)
  - documented canonical non-book/approximate signals (`materialShape`, `approximateScopeValue`, `approximateScopeUnit`, `isApproximate`)
  - added contract/normalization ownership paths
  - added explicit conservative fallback guidance when canonical evidence is missing/weak
- Updated `docs/core/03-spec-template.md`:
  - added one rule line requiring estimator/planner specs to cover both canonical-signal path and missing-signal fallback path

### Evidence

- File checks:
  - `docs/core/02-project-map.md`
  - `docs/core/03-spec-template.md`
- Content verification by direct read after patch.

### Residual Risks

- Docs align with current estimator/planner shape; future boundary shifts still require same-session map updates.

### Assumptions

- Strategic audit material remains local and is intentionally not moved into core docs.

### Next Action (Concrete)

- First command/file:
  - include this updated project-map boundary in the next estimator/planner core SPEC draft.
- Next owner:
  - Planner.

## 2026-03-14 - EST-WORKLOAD-LAYER-006 Patch D Boundary Regression Tightening

- Task ID: EST-WORKLOAD-LAYER-006
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Kept scope to tests only because boundary verification did not reveal an estimator bug.
- Added compact threshold-boundary coverage rather than expanding Patch D narrative tests.

### What Was Done

- Updated `src/server/services/planning-estimator.test.ts`:
  - added table-driven cases for:
    - minimum valid sample threshold
    - minimum observed minutes threshold
    - exact lower correction clamp boundary
    - exact upper correction clamp boundary
    - below/above clamp boundary behavior
  - added practical near-threshold unstable-evidence coverage:
    - stable-enough case remains adapted
    - just-too-noisy case gates as `unstable_evidence`

### Evidence

- Tests:
  - `npx.cmd vitest run src/server/services/planning-estimator.test.ts src/app/planner/_lib/season-engine.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1` passed (23 tests).

### Residual Risks

- The exact instability threshold is still covered by practical near-threshold cases rather than an analytically exact CV=`0.7` fixture.

### Assumptions

- Existing Patch D estimator logic is correct at current threshold boundaries because all new boundary assertions passed unchanged.

### Next Action (Concrete)

- First command/file:
  - add one exact-CV fixture only if future refactors make the instability threshold implementation harder to reason about.
- Next owner:
  - QA.

---

## 2026-03-16 - ENGINE-REALISM-001 Reviewer Gate Block

- Date: 2026-03-16
- Task ID: ENGINE-REALISM-001
- Role: Reviewer
- Owner: Copilot CLI

### Decisions Taken

- Kept `ENGINE-REALISM-001` blocked at Reviewer and did not advance it to QA.
- Accepted the Builder's file-scope as in-bounds for the approved spec.
- Rejected the handoff on missing mandatory evidence, not on code-boundary or logic-scope violations found in review.

### What Was Done

- Reviewed Builder handoff for `ENGINE-REALISM-001`.
- Verified changed-file scope reported by Builder stayed within approved engine boundaries:
  - `src/lib/workload-estimation-core.ts`
  - `src/lib/workload-estimation-core.test.ts`
  - `src/server/services/planning-estimator.ts`
  - `src/server/services/planning-estimator.test.ts`
  - `src/app/planner/_lib/season-engine.ts`
  - `src/app/planner/_lib/season-engine.test.ts`
  - `src/app/planner/focus/page.tsx`
- Ran static review against:
  - `docs/specs/ENGINE-REALISM-001.md`
  - `docs/core/02-project-map.md`
- Confirmed no IDE diagnostics were reported on touched files.
- Confirmed Builder could not provide lint/build/test/manual evidence because command execution is blocked by missing `pwsh.exe`.

### Evidence

- Lint:
  - fail / missing evidence in this session
- Build:
  - fail / missing evidence in this session
- Tests:
  - fail / missing evidence in this session
- Manual checks:
  - fail / missing evidence in this session
- Static review:
  - code review found no blocker-level architecture violation in touched files
  - IDE diagnostics returned clean for current workspace

### Residual Risks

- Without executed lint/build/tests/manual smoke, the implementation can still hide runtime or integration regressions despite looking correct in static review.
- `ENGINE-REALISM-001` changes shared planner/workload behavior across lib, service, planner domain, and Focus, so unverified regressions would have broad user impact.
- QA cannot operate as a meaningful release gate until execution evidence exists.

### Assumptions

- Missing `pwsh.exe` is an environment/tooling blocker rather than a product-scope blocker.
- Builder's reported implementation is otherwise spec-aligned pending executable verification.

### Next Action (Concrete)

- First command/file:
  - restore a working command runner, then execute:
    - targeted Vitest for `src/lib/workload-estimation-core.test.ts`, `src/server/services/planning-estimator.test.ts`, `src/app/planner/_lib/season-engine.test.ts`
    - `npm run lint`
    - `npm run build`
    - manual smoke for spec Section 12 scenarios
- Next owner:
  - Builder, then Reviewer re-check, then QA.

---

## 2026-03-16 - ORCH-2026-03-16 Persistent Stream Routing

- Date: 2026-03-16
- Task ID: ORCH-2026-03-16
- Role: Orchestrator
- Owner: Copilot CLI

### Decisions Taken

- Classified `ENGINE-REALISM-001` as the highest-value runnable core stream because it has an approved spec and directly addresses planning reliability.
- Kept execution serial inside the engine stream and routed it to Builder first.
- Blocked parallel starts for `FOCUS-TRACKING-001`, `SEASON-REDESIGN-001`, `EXAMS-WORKLOAD-001`, and `LEADERBOARDS-CONTEXT-001` because they either lack approved matching specs or would collide with engine-owned planner and workload files.
- Treated `FI-014` and `PLANNER-SURFACING-019` as nearby prior-art only, not separate runnable streams for this session.

### What Was Done

- Read orchestration/governance docs:
  - `AGENTS.md`
  - `docs/core/01-manifest.md`
  - `docs/core/02-project-map.md`
  - `docs/core/03-spec-template.md`
  - `docs/core/04-logbook.md`
  - `.github/copilot-instructions.md`
  - `.github/agents/orchestrator.agent.md`
  - `.github/agents/planner.agent.md`
  - `.github/agents/builder.agent.md`
  - `.github/agents/reviewer.agent.md`
  - `.github/agents/qa.agent.md`
  - `docs/agents/agent-map.md`
  - `docs/agents/context-packs.md`
  - `docs/agents/handoff-rules.md`
  - `docs/local/StudyApp_audit_struttura.md`
- Reviewed active and adjacent specs/logbook evidence:
  - `docs/specs/ENGINE-REALISM-001.md`
  - `docs/specs/EST-WORKLOAD-LAYER-002-patch-b-canonical-signals.md`
  - `docs/specs/EST-WORKLOAD-LAYER-003-patch-c-shared-core-consumption.md`
  - `docs/specs/FI-014-deterministic-xp-contextual-leaderboards.md`
  - `docs/specs/PLANNER-SURFACING-019-today-weekly-surfacing.md`
- Checked relevant ownership surfaces:
  - `src/lib/workload-estimation-core.ts`
  - `src/server/services/planning-estimator.ts`
  - `src/app/api/planning/estimate/route.ts`
  - `src/app/planner/_lib/season-engine.ts`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
- Started Builder stream for `ENGINE-REALISM-001` in a delegated background agent with strict spec-bound file scope.

### Evidence

- Lint: not run by Orchestrator in this session; delegated Builder instructed to run required gates.
- Build: not run by Orchestrator in this session; delegated Builder instructed to run required gates.
- Tests: not run by Orchestrator in this session; delegated Builder instructed to run targeted tests required by the spec.
- Manual checks:
  - Confirmed `ENGINE-REALISM-001` has an approved core spec.
  - Confirmed candidate labels `FOCUS-TRACKING-001`, `SEASON-REDESIGN-001`, `EXAMS-WORKLOAD-001`, and `LEADERBOARDS-CONTEXT-001` are not present as approved stream specs in `docs/specs`.
  - Confirmed file-boundary collisions between engine work and planner/focus/exams/leaderboard candidates on:
    - `src/app/planner/_lib/season-engine.ts`
    - `src/app/planner/page.tsx`
    - `src/app/planner/focus/page.tsx`
    - `src/app/planner/exams/page.tsx`
    - `src/app/planner/subjects/page.tsx`

### Residual Risks

- The engine stream spans shared lib, service, validation, API, and planner consumers, so concurrent work on planner/focus/exams surfaces would create high collision risk.
- Candidate stream names without approved specs remain blocked at Planner and should not be sent to Builder yet.
- Builder evidence is still pending; reviewer and QA routing must wait for actual handoff output.

### Assumptions

- `ENGINE-REALISM-001` supersedes earlier workload patches and is the current canonical core stream for estimator/workload realism.
- No safe second implementation stream exists right now without violating the no-overlap rule.
- `LEADERBOARDS-CONTEXT-001` remains downstream of engine/planner foundations because contextual ranking semantics depend on stable planner realism outputs.

### Next Action (Concrete)

- First command/file:
  - reclaim Builder handoff for `ENGINE-REALISM-001`, then route to Reviewer if scope/evidence pass.
- Next owner:
  - Builder, then Reviewer, then QA.

## 2026-03-14 - PLANNER-EXPLAINABILITY-007 Compact Workload Explainability Block

- Task ID: PLANNER-EXPLAINABILITY-007
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the UI change inside the existing planner timeline detail area.
- Reused season-planner explainability outputs already derived from the shared workload core.
- Kept language calm and user-facing; did not expose raw internal estimator field names.

### What Was Done

- Updated `src/app/planner/page.tsx`:
  - added one compact read-only explainability card in the selected exam timeline panel
  - surfaces:
    - reliability level
    - reliability reason
    - pace note only when pace uses subject/material priors
  - added small EN/IT copy translations for the new block
- Updated `src/server/services/planning-estimator.test.ts`:
  - fixed a readonly tuple typing issue in the Patch D boundary test table so `tsc` stays green

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit` passed.
- Lint:
  - `npm.cmd run lint` passed.
- Tests:
  - `npx.cmd vitest run src/server/services/planning-estimator.test.ts src/app/planner/_lib/season-engine.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1` passed (23 tests).

### Residual Risks

- Reliability reasons are concise and already user-readable, but some phrases still come directly from shared-core explainability text.

### Assumptions

- The timeline detail panel is the most relevant planner surface for a single calm explainability summary.

### Next Action (Concrete)

- First command/file:
  - if product wants the same transparency on the quick estimator surface, mirror this wording into `src/app/planner/_components/study-estimate-inline.tsx`.
- Next owner:
  - Planner + UX reviewer.

## 2026-03-14 - PLANNER-TIMELINE-008 Subject Grouping in Timeline Explorer

- Task ID: PLANNER-TIMELINE-008
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the change inside `src/app/planner/page.tsx` only.
- Grouped timeline navigation by `subjectId` while preserving exam-level selection and details.
- Reduced duplicate subject tabs without changing season-planner or estimator logic.

### What Was Done

- Updated `src/app/planner/page.tsx`:
  - added subject-group memo for `seasonPlan.examTracks`
  - changed timeline tab row from per-exam buttons to one button per subject
  - added a compact "Exams in this subject" chooser inside the active subject view
  - kept the existing selected-exam detail panel unchanged below the grouped exam chooser
  - added EN/IT copy for the grouped exam list label

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit` passed.
- Lint:
  - `npm.cmd run lint` passed.

### Residual Risks

- Subject grouping keys off `subjectId`; if future data inconsistencies create duplicate IDs/names mismatches, grouping behavior will follow IDs.

### Assumptions

- Grouping by subject for navigation while keeping exam-level buttons inside the selected group is the lightest way to preserve visibility without redesigning the planner page.

### Next Action (Concrete)

- First command/file:
  - run a quick browser smoke check on `/study/planner` with multiple exams sharing one subject to confirm grouped tab feel and spacing.
- Next owner:
  - QA.

## 2026-03-14 - EXAMS-LAYOUT-009 Top Exams Header and Frame Stabilization

- Task ID: EXAMS-LAYOUT-009
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the fix inside the exams page layout only.
- Fixed the top frame by correcting responsive structure rather than adding cosmetic overflow hacks.
- Preserved existing exam creation behavior and field logic.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - constrained the hero text block for cleaner top-frame width
  - aligned the top subject-section header for wrapped explanatory text
  - converted the subject-mode toggle from a single-row `inline-flex` strip to a responsive grid
  - removed reliance on a one-line segmented control that could break under narrow-width button sizing

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit` passed.
- Lint:
  - `npm.cmd run lint` passed.

### Residual Risks

- This session verified structure with static checks only; visual browser smoke on narrow widths is still recommended.

### Assumptions

- The visible breakage came from the top subject-mode frame collapsing under small-width button/layout rules, not from exam data logic.

### Next Action (Concrete)

- First command/file:
  - run a quick browser check on `/study/exams` at desktop and narrow mobile widths to confirm the subject-mode frame stays intact.
- Next owner:
  - QA.

## 2026-03-14 - PLANNER-NEXTSTEP-010 First Dispense-Oriented Next-Step Layer

- Task ID: PLANNER-NEXTSTEP-010
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept scope inside the season planner only.
- Added a small next-step descriptor layer without changing estimator or workload-core behavior.
- Reused only existing canonical exam workload signals and degraded to broader wording when evidence was weak.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - added `nextStudyStep` output for exam tracks and missions
  - added unit types:
    - `pages`
    - `handouts`
    - `slide_decks`
    - `topics`
    - `sessions`
  - mapped material defaults:
    - book -> pages
    - slides -> slide decks
    - handout set -> handouts
    - personal notes -> topics when scope is weak, pages when scope is safer
    - offline approximate -> sessions
    - mixed -> dominant primary unit plus at most one support unit
- Updated `src/app/planner/page.tsx`:
  - surfaced one calm next-step line in today-mission cards
  - surfaced one compact next-step card in the selected exam timeline
  - localized next-step wording for EN/IT without adding a new planner panel
- Updated `src/app/planner/_lib/season-engine.test.ts`:
  - added regression coverage for:
    - book
    - slides
    - handout set
    - personal notes
    - mixed with dominant primary unit
    - offline approximate session-first fallback

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit` passed.
- Lint:
  - `npm.cmd run lint` passed.
- Tests:
  - `npx.cmd vitest run src/app/planner/_lib/season-engine.test.ts src/server/services/planning-estimator.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1` passed (29 tests).

### Residual Risks

- Mixed-material dominance is intentionally heuristic because there is still no uploaded file structure or explicit topic ontology.
- Some fallback wording remains broad by design to avoid fake precision.

### Assumptions

- Showing the next-step layer in missions and the selected timeline view is enough for the first patch and avoids planner-wide noise.

### Next Action (Concrete)

- First command/file:
  - add one follow-up patch to replace page-only weekly milestone wording for clearly non-book exams in `src/app/planner/_lib/season-engine.ts`.
- Next owner:
  - Planner + UX reviewer.

## 2026-03-14 - PLANNER-NEXTSTEP-011 Concrete Book and Mixed Next-Step Wording

- Task ID: PLANNER-NEXTSTEP-011
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the next-step model unchanged and improved only wording/output specificity where canonical evidence was already strong enough.
- Preserved conservative fallback behavior for weak, approximate, or offline material.
- Extended milestone wording only for clearly non-book units to avoid page-only phrasing where it felt wrong.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - made mixed-material support clauses concrete when book-page support is safely available
  - replaced vague page support wording with counted book-page wording when `supportUnitValue` exists
  - made weekly milestones unit-aware for clearly non-book material
- Updated `src/app/planner/_lib/season-engine.test.ts`:
  - added regression checks for concrete book page wording
  - added regression checks for mixed slide-plus-book wording with a counted support clause
  - added regression checks for non-book weekly milestone wording

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`
- Tests:
  - `npx.cmd vitest run src/app/planner/_lib/season-engine.test.ts src/server/services/planning-estimator.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1`

### Residual Risks

- Mixed-material support sizing is still heuristic because canonical material signals do not yet encode a richer topic/file structure.
- Non-book weekly milestones are intentionally broad after the first week to stay calm and avoid fake certainty.

### Assumptions

- A concrete next-step line and unit-aware milestone wording are sufficient follow-up improvements without broadening the planner UI surface.

### Next Action (Concrete)

- First command/file:
  - consider making milestone week-two/week-three wording lightly unit-aware in `src/app/planner/_lib/season-engine.ts` only if it stays concise.
- Next owner:
  - Planner + UX reviewer.

## 2026-03-14 - EXAMS-LAYOUT-012 Hero Frame Balance Fix

- Task ID: EXAMS-LAYOUT-012
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept scope limited to the exams-page top hero/frame only.
- Fixed the layout structure by balancing the hero content against the existing blue decorative treatment instead of changing page behavior.
- Preserved all existing content and copy.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - centered and width-constrained the hero content block
  - added a stable minimum hero height so the first frame reads as a deliberate banner
  - kept the blue hero styling while preventing the decorative right-side weight from making the frame feel shifted

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`

### Residual Risks

- This patch was verified with static checks in-session, not a live browser smoke test.
- If any remaining issue exists, it is likely minor visual polish rather than another structural imbalance.

### Assumptions

- Centering the hero content is acceptable within the exams page and better matches the calmer planner direction.

### Next Action (Concrete)

- First command/file:
  - run a quick manual check on `/study/exams` at desktop and narrow mobile widths.
- Next owner:
  - QA.

## 2026-03-14 - EXAMS-LAYOUT-013 First Exams Section Shell Flattening

- Task ID: EXAMS-LAYOUT-013
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept scope on the first Exams form section only.
- Treated the visual imbalance as a container-shell problem, not a spacing-only issue.
- Reused the existing outer `planner-panel` as the section shell instead of stacking another soft card shell inside it.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - flattened the first subject section by removing the extra `planner-card-soft` shell
  - kept the subject mode controls and subject selector inside the main panel container
  - tightened the first-section header into a responsive grid so the helper note aligns cleanly without skewing the frame

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`

### Residual Risks

- This patch was verified with static checks in-session, not a browser smoke test.
- If any remaining issue persists, it is most likely minor visual tuning in the nested controls rather than another shell-level problem.

### Assumptions

- The first section should visually read as part of the main Exams container rather than as a smaller card floating inside it.

### Next Action (Concrete)

- First command/file:
  - manually verify `/study/exams` with the first section open on desktop and narrow mobile widths.
- Next owner:
  - QA.

## 2026-03-14 - EXAMS-LAYOUT-014 First Exams Section Inner Wrapper Alignment

- Task ID: EXAMS-LAYOUT-014
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the fix inside the first Exams form section only.
- Treated the remaining imbalance as an inner-wrapper alignment problem after shell flattening.
- Preserved all existing form behavior and controls.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - wrapped the first subject section in one shared centered inner container
  - removed inconsistent per-control `max-w-xl` constraints that left the section content visually anchored to the left
  - kept the subject mode controls and subject selector on the same width system so the outer panel frame reads symmetrically

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`

### Residual Risks

- This patch was verified with static checks in-session, not a live browser smoke test.
- If anything still feels off, it is likely subtle visual tuning rather than another wrapper-structure bug.

### Assumptions

- The first section should read as a centered form block inside the Exams panel rather than as uneven left-anchored controls inside a full-width shell.

### Next Action (Concrete)

- First command/file:
  - manually verify `/study/exams` at desktop and narrow mobile widths with both subject modes.
- Next owner:
  - QA.

## 2026-03-14 - PLANNER-NEXTSTEP-016 Mixed-Material Timing Guidance

- Task ID: PLANNER-NEXTSTEP-016
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept `missionMinutes` as the single canonical effort budget.
- Implemented mixed-material timing only in the season planner layer.
- Reused the existing `NextStudyStep` timing fields instead of adding a new planner contract.
- Applied a default `70/30` primary/support split with a short-mission guard below `35` minutes.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - added a planner-local mixed-step timing resolver
  - switched mixed book-page support to share-based page sizing instead of the previous broad heuristic
  - added rounded primary/support time hints with a minimum of `15` / `10` minutes
  - suppressed support clauses for short mixed missions
  - kept mixed offline approximate cases session-first without a fake split
- Updated `src/app/planner/page.tsx`:
  - aligned localized EN/IT next-step wording with the new timing/display policy
- Updated `src/app/planner/_lib/season-engine.test.ts`:
  - added regression coverage for:
    - slides + book
    - handouts + notes
    - book + notes
    - mixed offline approximate fallback
    - display policy
    - short-mission guard
    - legacy non-mixed behavior

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`
- Tests:
  - `npx.cmd vitest run src/app/planner/_lib/season-engine.test.ts src/server/services/planning-estimator.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1`

### Residual Risks

- Mixed page-share sizing is intentionally simple and may still need future calibration against real usage.
- Some mixed notes cases remain recap-time based because the planner still lacks a richer topic ontology.

### Assumptions

- Short missions below `35` minutes should stay single-action and calm rather than forcing an artificial two-part sentence.

### Next Action (Concrete)

- First command/file:
  - manually verify `/study/planner` with mixed exams so the updated EN/IT wording feels calm in mission cards and the selected timeline panel.
- Next owner:
  - Planner + QA.

## 2026-03-15 - EXAMS-LAYOUT-017 First Exams Section Single-Shell Balance Fix

- Task ID: EXAMS-LAYOUT-017
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept scope limited to the first Exams form section.
- Treated the remaining blue-frame imbalance as a shell-layering problem inside the section, not as a spacing-only issue.
- Preserved existing subject-mode behavior and content.

### What Was Done

- Updated `src/app/planner/exams/page.tsx`:
  - restored the first subject section as one explicit `planner-card-soft` container
  - removed the extra `planner-field` shell around the subject selector and quick-create inputs
  - kept the segmented control and inputs inside the same card shell so the blue frame reads as one balanced container

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`

### Residual Risks

- This patch was verified with static checks in-session, not a live browser smoke test.
- If anything still feels off, it is most likely minor visual tuning rather than another duplicated-shell bug.

### Assumptions

- The first Exams block should visually read as a single soft card inside the page panel, with inputs sitting directly inside that shell rather than inside a second tinted field wrapper.

### Next Action (Concrete)

- First command/file:
  - manually verify `/study/exams` at desktop and narrow mobile widths with both subject modes.
- Next owner:
  - QA.

## 2026-03-14 - PLANNER-NEXTSTEP-015 Concrete Mixed and Book-Supported Guidance

- Task ID: PLANNER-NEXTSTEP-015
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept scope inside the existing next-step wording layer and planner label helper.
- Used rounded time hints only where the planner already had a stable minutes suggestion.
- Preserved conservative fallback behavior for weak, approximate, or offline material.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - replaced vague book-support wording with counted book-page actions
  - added rounded primary/support time hints where they are safely available
  - improved handout-set wording to read as a practical study unit
- Updated `src/app/planner/page.tsx`:
  - mirrored the same concrete wording in the localized planner label helper for EN/IT
- Updated `src/app/planner/_lib/season-engine.test.ts`:
  - added regression checks for book page-plus-time wording
  - added regression checks for mixed slide-plus-book counted support wording
  - added regression checks for mixed handout-set recap-time wording

### Evidence

- Type check:
  - `npx.cmd tsc --noEmit`
- Lint:
  - `npm.cmd run lint`
- Tests:
  - `npx.cmd vitest run src/app/planner/_lib/season-engine.test.ts src/server/services/planning-estimator.test.ts src/lib/workload-estimation-core.test.ts --pool=threads --maxWorkers=1`

### Residual Risks

- Time hints remain heuristic because they derive from planner mission minutes rather than a richer material-by-material timing model.
- Some non-book mixed cases will still stay broad by design when canonical evidence is weak.

### Assumptions

- Rounded time guidance is acceptable when phrased as `about` / `circa` and only shown where quantity already has solid backing.

### Next Action (Concrete)

- First command/file:
  - consider one small follow-up to make mission-card copy prefer time hints only when they reduce ambiguity, not everywhere.
- Next owner:
  - Planner + UX reviewer.

## 2026-03-15 - PLANNER-REVIEWLOOP-018 First Review / Revisit Loop

- Task ID: PLANNER-REVIEWLOOP-018
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept the change planner-local inside the existing `season-engine` flow.
- Added one `studyIntent` resolver layer instead of creating a second scheduler.
- Preserved mission minutes, urgency, XP, and per-exam identity logic while changing only action framing.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - added planner-local `StudyIntent`
  - resolved intent from existing signals such as `daysLeft`, `completionPercent`, `focusContributionPercent`, `sessionsCompleted`, `updatedAt`, `remainingPages`, and `progressState`
  - threaded `studyIntent` into exam tracks, missions, and `nextStudyStep`
  - localized intent-aware calm wording through one shared next-step label formatter
- Updated `src/app/planner/page.tsx`:
  - switched planner mission/timeline labels to the shared intent-aware formatter
- Updated `src/app/planner/_lib/season-engine.test.ts`:
  - added regression coverage for:
    - legacy no-progress -> `continue_new`
    - light evidence with prior activity -> `review_due`
    - clear mismatch -> `revisit_weak`
    - final 5 days -> `refresh_before_exam`
    - unfinished scope near exam -> `continue_new`
    - mixed-material dominant/support preservation
    - no regression to mission identity, minutes, XP, and urgency
- Added core SPEC:
  - `docs/specs/PLANNER-REVIEWLOOP-018-first-review-revisit-loop.md`

### Evidence

- Lint:
  - `npm.cmd run lint` passed.
- Build:
  - not run in this session.
- Tests:
  - `npx.cmd tsc --noEmit` passed.
  - `npx.cmd vitest run src/app/planner/_lib/season-engine.test.ts --pool=threads --maxWorkers=1` passed (20 tests).
- Manual checks:
  - not run in browser during this session.

### Residual Risks

- Intent thresholds are heuristic and may need tuning after real student usage.
- Near-boundary cases between `review_due` and `continue_new` are intentionally conservative but still heuristic.

### Assumptions

- Mission intent can stay exam-level within the current single-pass planner and does not need day-by-day recomputation.
- Reframing the existing unit/timing sentence is enough for the first review/revisit loop without adding more UI.

### Next Action (Concrete)

- First command/file:
  - run a quick browser smoke on `src/app/planner/page.tsx` via `/planner` to confirm EN/IT mission wording feels calm for each intent.
- Next owner:
  - Planner + QA.

## 2026-03-15 - PLANNER-SURFACING-019 Today Quests and Weekly Board Surfacing

- Task ID: PLANNER-SURFACING-019
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept planning math exam-level and changed only planner-local weekly distribution plus planner surface derivation.
- Replaced the fixed same-top-4-every-day behavior with a conservative weekly rotation that preserves urgency ranking, keeps 4 missions/day max, and rotates lower-ranked active exams into the week.
- Introduced one shared planner-local surfacing helper for Today Quests, Weekly Board, and same-title exam label disambiguation.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - added weekly mission rotation helper
  - sorted weekly mission selection by urgency score
  - guaranteed weekly coverage for schedulable active exams while preserving existing mission minutes/pages/XP math
  - added `examDate` and `subjectId` on planner missions for downstream surfacing
- Added `src/app/planner/_lib/planner-surfacing.ts`:
  - grouped Today Quests by subject
  - grouped Weekly Board rows by subject
  - added same-title exam label disambiguation with date-first then completion fallback
- Updated `src/app/planner/page.tsx`:
  - switched Today Quests to grouped subject cards with per-exam quest rows
  - reused shared disambiguated exam labels in the timeline chooser and selected exam detail
- Updated `src/app/planner/_components/weekly-board-section.tsx`:
  - replaced raw first-two mission chips with grouped rows up to a calm cap of 3 plus overflow summary
- Added regression coverage:
  - `src/app/planner/_lib/season-engine.test.ts`
  - `src/app/planner/_lib/planner-surfacing.test.ts`
- Added core SPEC:
  - `docs/specs/PLANNER-SURFACING-019-today-weekly-surfacing.md`

### Evidence

- Lint:
  - `npm.cmd run lint` passed.
- Build:
  - `npm.cmd run build` passed.
- Tests:
  - `npx.cmd tsc --noEmit` passed.
  - `.\node_modules\.bin\vitest.cmd run src/app/planner/_lib/season-engine.test.ts src/app/planner/_lib/planner-surfacing.test.ts --pool=threads --maxWorkers=1` passed (25 tests).
- Manual checks:
  - not run in browser during this session.

### Residual Risks

- If a user has more active remaining exams than the weekly board can physically surface in `7 x 4` slots, full-mode weekly coverage still has a hard capacity ceiling.
- Grouped Today cards need browser QA to confirm the nested quest rows still feel calm on narrow mobile widths.

### Assumptions

- Derived macro grouping remains display-only compression and is not promoted to a first-class planner or data-model concept.
- Preserving current mission-budget math is more important than maximizing daily slot fill symmetry.

### Next Action (Concrete)

- First command/file:
  - run a browser smoke on `/study` and `/planner` with 5+ active exams, including repeated subject and same-title cases, to validate grouped Today cards and Weekly Board overflow feel.
- Next owner:
  - QA + Planner reviewer.

## 2026-03-15 - PLANNER-SURFACING-019 Today Quests and Weekly Board Surfacing Cleanup

- Task ID: PLANNER-SURFACING-019
- Role: Builder + Reviewer
- Owner: App Engineer

### Decisions Taken

- Kept planning math exam-level and changed only planner-local weekly rotation plus surfacing/grouping behavior.
- Replaced fixed same-top-4 repetition with a conservative weekly rotation that guarantees at least one appearance per active exam when weekly capacity allows.
- Added one shared planner surfacing helper so Today Quests, Weekly Board, and timeline exam labels use the same grouping and disambiguation logic.

### What Was Done

- Updated `src/app/planner/_lib/season-engine.ts`:
  - added weekly appearance targeting and rotation helpers
  - preserved existing mission minutes/pages/XP math per exam
  - kept max 4 missions per day while rotating lower-ranked exams into the week
- Added shared planner-local surfacing helper:
  - `src/app/planner/_lib/planner-surfacing.ts`
  - derives subject-grouped Today cards
  - derives subject-grouped Weekly Board rows with calm row cap + footer summary
  - disambiguates same-title exams with date first, then completion, then subject fallback
- Updated planner UI:
  - `src/app/planner/page.tsx`
  - `src/app/planner/_components/weekly-board-section.tsx`
  - Today Quests now groups same-subject missions into one card with exam-level rows
  - Weekly Board now shows grouped subject rows up to 3 visible rows with footer summary
  - timeline subject exam buttons now reuse shared disambiguated labels
- Added regression coverage:
  - `src/app/planner/_lib/season-engine.test.ts`
  - `src/app/planner/_lib/planner-surfacing.test.ts`

### Evidence

- Lint:
  - pending in this session
- Build:
  - not run in this session
- Tests:
  - pending targeted Vitest run in this session
- Manual checks:
  - not run in browser during this session

### Residual Risks

- If active exams with remaining work exceed weekly capacity (`7 x 4 = 28` exam-day slots), the UI cannot physically guarantee all appear within one week without breaking the daily cap.
- Today Quests still reflects the planner’s week-start day selection; this task intentionally did not redefine the broader “today vs week” model.

### Assumptions

- Normal focused/balanced/full usage stays within a schedulable active-exam count for the weekly rotation guarantee.
- Subject grouping is the calmest way to avoid duplicate visible labels without hiding exam-level rows.

### Next Action (Concrete)

- First command/file:
  - run targeted tests for `src/app/planner/_lib/season-engine.test.ts` and `src/app/planner/_lib/planner-surfacing.test.ts`, then browser-smoke `/planner`.
- Next owner:
  - QA.

## 2026-03-16 - PLANNER-HYDRATION-020 Stabilize seasonPlan first render on /planner

- Task ID: PLANNER-HYDRATION-020
- Role: Builder
- Owner: App Engineer

### Scope Implemented

- In:
  - made `/planner` first render use a deterministic placeholder `seasonPlan`
  - delayed live `buildSeasonPlan(...)` execution until after mount via existing planner hydration state
- Out:
  - planner domain rules
  - season-engine workload behavior
  - unrelated routes

### Files Touched

- `src/app/planner/page.tsx`
- `docs/core/04-logbook.md`

### Evidence

- Code inspection:
  - `seasonPlan` in `src/app/planner/page.tsx` now returns `EMPTY_SEASON_PLAN` until `storageHydrated` is true, so first server/client render no longer depends on live `new Date()`
- Verification commands:
  - not run; project build remains blocked by unrelated pre-existing missing modules outside planner scope

### Risks + Assumptions

- `/planner` summary cards and weekly sections now first paint with deterministic empty values before hydrating to the live plan after mount.
- Assumes the remaining flash was caused by planner-only first-render `buildSeasonPlan(...)` time dependence, as previously diagnosed.

### Next Action

- Hard-refresh `/planner` and confirm the previous weekly board / `daysLeft` mount mismatch no longer causes flashing or repeated remounting.

## 2026-03-16 - RECOVERY-MORNING-021 Reconstruct morning StudyApp product state above aee040e

- Task ID: RECOVERY-MORNING-021
- Role: Builder
- Owner: App Engineer

### Scope Implemented

- In:
  - restored student preference persistence and subject affinity profile flow
  - restored exam workload contract, validation, API persistence, and planner data hydration
  - re-stabilized planner-local hydration on `/planner` and `/planner/focus`
- Out:
  - quick estimate / study shell reintroduction
  - root layout or nav churn
  - planner surfacing and engine expansions not required for the recovered morning state

### Files Touched

- `prisma/schema.prisma`
- `prisma/migrations/20260311151309_add_exam_workload_fields/migration.sql`
- `prisma/migrations/20260312203807_add_student_subject_affinity/migration.sql`
- `src/lib/subject-affinity.ts`
- `src/lib/exam-workload-contract.ts`
- `src/server/validation/student.ts`
- `src/server/validation/exam.ts`
- `src/server/validation/exam-workload-normalization.ts`
- `src/app/api/students/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/exams/route.ts`
- `src/app/planner/_hooks/use-auth-student.ts`
- `src/app/planner/_hooks/use-planner-data.ts`
- `src/app/planner/students/page.tsx`
- `src/app/planner/page.tsx`
- `src/app/planner/focus/page.tsx`

### Evidence

- Recovery evidence source set:
  - `aee040e` used as clean baseline from local git history
  - morning capabilities reconstructed from local stash content, `.next` source maps, and matching logbook entries (`CORE-SUBJECT-AFFINITY-004`, `CORE-EXAM-MODEL-002`, `UX-AFFINITY-037`)
- Hydration stabilization:
  - `/planner` now first-renders deterministic focus state and placeholder `seasonPlan`
  - `/planner/focus` now first-renders deterministic stats/progress and hydrates local storage after mount
- Verification:
  - `npm.cmd run build` passed

### Risks + Assumptions

- This restores the morning product surface conservatively rather than replaying all late-day planner experiments.
- Advanced planner surfacing/review-loop changes remain intentionally excluded unless separately re-proven safe.

### Next Action

- Run `npm run build`, then browser-smoke `/planner`, `/planner/students`, and `/planner/exams` against the restored morning feature set.

## 2026-03-16 - RECOVERY-SCREENSHOT-022 Reconstruct screenshot-backed working StudyApp surface

- Task ID: RECOVERY-SCREENSHOT-022
- Role: Builder
- Owner: App Engineer

### Scope Implemented

- In:
  - restored the screenshot-backed home shell details: `Study Hub` nav label, profile nav link, hero CTA copy, and legal footer
  - restored the richer Exams create flow with inline subject creation, workload fields, book lookup, and verified-page/source badges
  - restored the Study Plan Assistant verification bar with book typeahead on `/planner/estimate`
  - restored the visible subject affinity onboarding surface and stabilized subject dashboard hydration
- Out:
  - `/study` route alias or legacy study shell reintroduction
  - planner engine/domain rewrites
  - broader root layout churn beyond footer + stable nav wording

### Files Touched

- `src/app/_components/site-nav.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/api/books/search/route.ts`
- `src/app/planner/_components/book-search-typeahead.tsx`
- `src/app/planner/exams/page.tsx`
- `src/app/planner/estimate/page.tsx`
- `src/app/planner/students/page.tsx`
- `src/app/planner/subjects/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/cookies/page.tsx`
- `docs/core/04-logbook.md`

### Evidence

- Recovery evidence source set:
  - screenshot set supplied in task as product truth
  - local `.next` source maps and prior logbook entries for `ABC-011`, `DE-013`, `CORE-EXAM-MODEL-001`, and `UX-AFFINITY-036/037`
- Verification:
  - `npm.cmd run build` passed

### Risks + Assumptions

- The top-level Study Hub wording now matches screenshots while preserving the stable `/planner` route instead of reviving the old `/study` shell.
- Exams and estimate now reuse the restored local books search contract with offline-safe local catalog fallback; live provider quality still depends on network availability.
- Planner overview quest grouping was left on the current stable implementation because the required screenshot features were already present without reintroducing the late surfacing layer.

### Next Action

- Browser-smoke `/`, `/planner/exams`, `/planner/estimate`, `/planner/students`, and `/planner/subjects` against the screenshot set to confirm spacing and interaction parity.

---

## Entry - EXAMS-RESTORE-AND-CLEANUP-001 Safe Slice

- Date: 2026-03-16
- Task ID: EXAMS-RESTORE-AND-CLEANUP-001
- Role: Planner + Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Executed a narrow recovery slice first to avoid broad planner instability.
- Prioritized audited user-facing defects: subject delete safety and exam page total display realism.
- Deferred unrelated redesign and estimator-core work to later non-overlapping streams.

### What Was Done

- Added subject delete endpoint with ownership check and cascade confirmation gate:
  - `src/app/api/subjects/route.ts`
- Added subject delete UX with two-step confirm flow and relation count warning:
  - `src/app/planner/subjects/page.tsx`
- Replaced exam list page-total chip fallback order to prefer workload-backed values over inferred defaults:
  - `src/app/planner/exams/page.tsx`

### Evidence

- Commit:
  - `31d9410` (`fix: restore subject delete safety and exam page totals`)
- Lint:
  - failed at this checkpoint due existing `react-hooks/set-state-in-effect` blockers across planner pages.
- Build:
  - `npm run build` passed.
- Reviewer verdict:
  - scope compliance pass, release gate blocked by lint status.

### Residual Risks

- Subject cascade delete is destructive by design once confirmed.
- Browser QA evidence for delete-cancel/delete-confirm branches still required.

### Assumptions

- Existing Prisma relation cascades are intentional product behavior for this phase.
- This slice is a recovery checkpoint, not full stream closure.

### Next Action (Concrete)

- First command/file: run lint-hardening stream on planner hook effects to unblock release gates.
- Next owner: Builder.

---

## Entry - PERFORMANCE-HARDENING-001 Lint Gate Stabilization

- Date: 2026-03-16
- Task ID: PERFORMANCE-HARDENING-001
- Role: Builder + Reviewer
- Owner: App Engineer + QA

### Decisions Taken

- Treated lint blockers as stability debt blocking release gates.
- Applied behavior-preserving refactors only; no API/domain/schema changes.
- Kept scope strictly to five planner client pages with lint errors.

### What Was Done

- Replaced synchronous mount-effect setState patterns with lazy initialization and hydration-safe patterns:
  - `src/app/planner/estimate/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/page.tsx`
  - `src/app/planner/subjects/page.tsx`

### Evidence

- Commit:
  - `37829f3` (`harden: eliminate planner set-state effect lint blockers`)
- Lint:
  - `npm run lint` passed.
- Build:
  - `npm run build` passed.

### Residual Risks

- Low risk of subtle hydration-timing differences in local-storage-backed UI state.
- Targeted browser smoke is still required for focus/planner hydration behavior.

### Assumptions

- Current lint rules are part of release quality gate and must remain enabled.
- No behavioral regression is expected because logic and contracts were unchanged.

### Next Action (Concrete)

- First command/file: run QA smoke on `/planner/exams` and `/planner/subjects` for delete flow and page-total rendering paths.
- Next owner: QA.


## Entry - TIMELINE-EXPLORER-001 Follow-Up QA (af7f3bf)

- Date: 2026-03-16
- Task ID: TIMELINE-EXPLORER-001 (QA verification, follow-up commit)
- Role: QA
- Owner: GitHub Copilot

### Decisions Taken

- Verified follow-up commit af7f3bf (fix: finalize exam plan explorer accessibility and selection) at HEAD after 23405de rebuild.
- Deterministic verification scope: lint, build, code grep, state simplification audit.

### What Was Done

- Ran clean build: `rm -r .next && npm run build` ? success, all routes compiled.
- Ran linter: `npm run lint` ? 0 errors, 0 warnings.
- Grepped for removed copy: `milestones` and `noTopic` ? 0 matches (removed from page.tsx).
- Grepped for accessibility markers: `role="option" ` ? 1 match, line 611-613 (ARIA semantics present).
- Code review: verified two-column layout intact (`lg:grid-cols-[0.95fr_1.4fr]`), state simplified (removed `timelineTracks`), ARIA attributes added.

### Evidence

- Lint: ? clean (0 errors)
- Build: ? clean (Next.js Turbopack, 16 routes)
- Code grep (milestones): 0 matches
- Code grep (role="option"): 1 match, line 611-613
- Diff: 1 file changed (src/app/planner/page.tsx), +13/-23 (only expected changes)
- QA report: `qa/reports/TIMELINE-EXPLORER-001-follow-up-af7f3bf-2026-03-16.md`

### Residual Risks

- None identified; follow-up is cleanup + accessibility with no domain logic changes.

### Assumptions

- `seasonPlan.examTracks` has unique exam IDs (no defensive dedup needed).
- No downstream code depends on removed COPY keys.
- ARIA attributes supported in target browsers (standard 2024+).

### Next Action (Concrete)

- First command/file: ready for merge to stable.
- Next owner: Release queue.

---

---

## Entry - TIMELINE-EXPLORER-001 Follow-Up QA (af7f3bf)

- Date: 2026-03-16
- Task ID: TIMELINE-EXPLORER-001 (QA verification, follow-up commit)
- Role: QA
- Owner: GitHub Copilot

### Decisions Taken

- Verified follow-up commit af7f3bf (fix: finalize exam plan explorer accessibility and selection) at HEAD after 23405de rebuild.
- Deterministic verification scope: lint, build, code grep, state simplification audit.

### What Was Done

- Ran clean build: \m -r .next && npm run build\ ? success, all routes compiled.
- Ran linter: \
pm run lint\ ? 0 errors, 0 warnings.
- Grepped for removed copy: milestones, noTopic ? 0 matches (removed from page.tsx).
- Grepped for accessibility markers: role="option" ? 1 match, line 611-613 (ARIA semantics present).
- Code review: verified two-column layout intact (lg:grid-cols-[0.95fr_1.4fr]), state simplified (removed timelineTracks), ARIA attributes added.

### Evidence

- Lint: ? clean (0 errors)
- Build: ? clean (Next.js Turbopack, 16 routes)
- Code grep (milestones): 0 matches
- Code grep (role="option"): 1 match, line 611-613
- Diff: 1 file changed (src/app/planner/page.tsx), +13/-23 (only expected changes)
- QA report: qa/reports/TIMELINE-EXPLORER-001-follow-up-af7f3bf-2026-03-16.md

### Residual Risks

- None identified; follow-up is cleanup + accessibility with no domain logic changes.

### Assumptions

- seasonPlan.examTracks has unique exam IDs (no defensive dedup needed).
- No downstream code depends on removed COPY keys.
- ARIA attributes supported in target browsers (standard 2024+).

### Next Action (Concrete)

- First command/file: ready for merge to stable.
- Next owner: Release queue.

---

## Entry - SUBJECT-DASHBOARD-CLARITY-001 QA Gate

- Date: 2026-03-16
- Task ID: SUBJECT-DASHBOARD-CLARITY-001
- Role: QA
- Owner: GitHub Copilot

### Decisions Taken

- Executed localhost-oriented deterministic QA with mandatory preflight first.
- Used lint/build gates, localhost route probes, source-level assertions, and runtime chunk checks.
- Marked verdict as PASS-WITH-MINORS because this pass did not include an interactive headed DOM readability walkthrough.

### What Was Done

- Validated clarity copy and control labeling/hints in src/app/planner/subjects/page.tsx for study pace and summary usage.
- Confirmed storage behavior remains based on studyapp_exam_hints localStorage get/set flow.
- Confirmed subject API interaction surface remains /api/subjects.
- Added consolidated QA report:
  - qa/reports/SUBJECT-DASHBOARD-CLARITY-001-qa-gate-2026-03-16.md

### Evidence

- Lint: npm run lint passed.
- Build: npm run build passed.
- Localhost route probe: /planner/subjects returned HTTP 200.
- Runtime artifact probe: planner chunk contains exam-settings/pace/summary copy plus studyapp_exam_hints and /api/subjects markers.
- Commit scope probe: git show --stat --oneline 417fe4b -- src/app/planner/subjects/page.tsx shows the intended file-only slice.

### Residual Risks

- Readability confidence is based on deterministic source/runtime artifact checks; no interactive visual evidence was captured in this run.

### Assumptions

- Reviewer gate for the implementation slice is already satisfied before this QA pass.
- Current localhost runtime reflects release-gate behavior for the targeted file scope.

### Next Action (Concrete)

- First command/file: run one headed walkthrough on /planner/subjects and capture screenshot proof only if release policy requires visual evidence.
- Next owner: QA/Release gate owner.

---

## Entry - SUBJECT-DASHBOARD-CLARITY-001 Follow-up QA (878c76e)

- Date: 2026-03-16
- Task ID: SUBJECT-DASHBOARD-CLARITY-001
- Role: QA
- Owner: GitHub Copilot

### Decisions Taken

- Executed deterministic localhost QA specifically against HEAD/follow-up commit 878c76e.
- Focused on three acceptance points: student-facing wording, per-exam settings clarity, and behavior/storage invariance.
- Assigned verdict PASS-WITH-MINORS because objective checks passed but local /api/health remained 500.

### What Was Done

- Ran preflight gates: npm run lint, npm run build.
- Verified commit scope with git show/git diff against prior baseline 417fe4b.
- Confirmed copy updates are student-facing and old jargon is removed.
- Confirmed per-exam settings labels and hints remain present in source and localhost runtime chunk.
- Confirmed storage/API contracts unchanged (studyapp_exam_hints and /api/subjects anchors).
- Added consolidated follow-up QA report:
  - qa/reports/SUBJECT-DASHBOARD-CLARITY-001-follow-up-878c76e-2026-03-16.md

### Evidence

- Lint: npm run lint passed.
- Build: npm run build passed.
- Localhost probes:
  - /planner/subjects => HTTP 200
  - /api/health => HTTP 500 (local environment issue)
- Runtime artifact probe:
  - New student-facing subtitle present
  - Old estimator-jargon subtitle absent
  - Per-exam study settings and hint strings present
  - studyapp_exam_hints and /api/subjects markers present
- Diff scope: only copy-line updates in src/app/planner/subjects/page.tsx between 417fe4b and 878c76e.

### Residual Risks

- Environment DB connectivity remains unstable in this session (/api/health = 500), reducing full-stack confidence outside the copy-only scope.
- No headed screenshot capture in this follow-up pass.

### Assumptions

- The release gate for this task accepts deterministic source/runtime artifact evidence for copy-only changes.
- DB health instability is pre-existing and not caused by 878c76e.

### Next Action (Concrete)

- First command/file: restore local DB health and rerun /api/health plus one headed visual walkthrough on /planner/subjects if required by release policy.
- Next owner: QA/Release gate owner.

---

## Entry - RELEASE-QA-002 Lightweight 2-User Gate

- Date: 2026-03-16
- Task ID: RELEASE-QA-002
- Role: QA
- Owner: GitHub Copilot

### Decisions Taken

- Ran deterministic localhost QA with exactly two provided users only (Marco and Sofia).
- Kept scope lightweight/high-signal: auth/session, planner surface reachability, exam create+inline edit, focus dev-control guard, profile/subject checks, and cleanup.
- Marked verdict as PASS-WITH-MINORS due one runtime evidence gap on server HTML label detection for subject hub per-exam settings, covered by source-level verification.

### What Was Done

- Executed preflight checks for localhost reachability and /api/health.
- Authenticated both users with register-or-login flow and validated /api/auth/me session context.
- Performed deterministic pre-clean for only these two users' exams/subjects.
- Created realistic subjects/exams for both users.
- Validated inline workload edit with PATCH /api/exams?id=... and persisted payload checks.
- Verified authenticated reachability (200) for:
  - /planner/exams
  - /planner/focus
  - /planner/subjects
  - /planner/students
- Verified no focus dev simulation token present in runtime probe and source grep.
- Verified subject-hub per-exam settings labels in source copy and profile-affinity compact surface markers.
- Cleaned all created exams/subjects and confirmed empty lists for both users.
- Added consolidated QA report:
  - qa/reports/RELEASE-QA-002-light-2user-pass-2026-03-16.md

### Evidence

- Preflight:
  - Test-NetConnection localhost:3000 -> pass
  - GET /api/health -> 200 (status=ok, db=connected) pre and post run
- API scenario endpoints exercised:
  - /api/auth/register, /api/auth/login, /api/auth/me
  - /api/subjects (POST/GET/DELETE)
  - /api/exams (POST/GET/PATCH/DELETE)
- Persistence checks:
  - Marco exam patched to materialType=mixed and workloadPayload.totalPages=280
- Planner route probes:
  - /planner/exams, /planner/focus, /planner/subjects, /planner/students -> all 200
- Cleanup checks:
  - both users end-state 0 exams and 0 subjects

### Residual Risks

- /planner/subjects server HTML probe did not include the per-exam settings string in this run; evidence for that specific label depends on source-level validation.

### Assumptions

- Runtime route 200 + deterministic API behavior + targeted source anchors are acceptable for this lightweight release-oriented QA gate.

### Next Action (Concrete)

- First command/file: if strict visual QA is required, run one headed browser walkthrough specifically on /planner/subjects to capture the per-exam settings panel on hydrated UI.
- Next owner: QA/Release gate owner.

---

## Entry - RELEASE-CANDIDATE-003 Product Recovery Upgrade

- Date: 2026-03-16
- Task ID: RELEASE-CANDIDATE-003
- Role: Builder
- Owner: Codex

### Decisions Taken

- Treated this as a shipping recovery slice, not a docs-only or QA-only pass.
- Kept dev host behavior anchored to `localhost` and added a startup script that brings up Prisma dev before Next.
- Moved planner trust signals toward real exam workload inputs before heuristic fallback.
- Removed visible dev shortcut leakage and reduced noisy gamified copy on landing/season/focus surfaces.
- Kept local QA data constrained to exactly two realistic students.

### What Was Done

- Updated local startup:
  - Added `scripts/start-local-dev.ps1`
  - Added `scripts/dev-smoke.ps1`
  - Switched `npm run dev` to the startup script and kept `npm run dev:next` for direct Next boot.
  - Forced Next dev to bind `localhost`.
- Hardened host normalization:
  - Extended middleware canonical-host checks to include forwarded host and request URL host.
- Upgraded season planning:
  - `src/app/planner/_lib/season-engine.ts` now resolves exam scope from real workload payload fields (`totalPages`, page range, verified pages, approximate mixed/notes support scope) before title/subject inference.
  - Added scope-source visibility to planner season UI and calmer metric rings for readiness, focus support, and verified scope coverage.
- Improved exams workflow:
  - Added book coverage range controls.
  - Added notes/mixed material-shape and approximate-scope controls.
  - Surfaced richer material scope chips in exam cards.
- Compacted profile:
  - Converted profile details and subject affinity into summary-first, expandable editors.
- Cleaned entry/product copy:
  - Removed login-page dev shortcut card.
  - Replaced landing-page mascot/dev framing with product-oriented study messaging.
  - Reduced noisy language on season/focus surfaces.
- Local data cleanup:
  - Reset local data and reseeded only Marco Bianchi and Sofia Romani with realistic subjects/exams for QA.

### Evidence

- Verification commands passed:
  - `npm run build`
  - `npm run lint`
  - `powershell -ExecutionPolicy Bypass -File ./scripts/dev-smoke.ps1`
- Runtime QA:
  - Registered/logged in exactly two users:
    - `marco.bianchi.qa@test.studyapp.local`
    - `sofia.romani.qa@test.studyapp.local`
  - Verified route 200 responses with authenticated cookies:
    - `/planner`
    - `/planner/exams`
    - `/planner/subjects`
    - `/planner/students`
    - `/planner/focus`
  - Verified per-user exam isolation through `/api/exams`.
  - Verified mixed-material exam PATCH persistence for Marco including:
    - `bookCoverageMode=page_range`
    - `bookPageStart/bookPageEnd`
    - `materialShape=slides`
    - `approximateScopeValue/Unit`
    - updated notes/material scope text

### Residual Risks

- Local DB still depends on `prisma dev` being alive; the new startup script reduces this but does not remove the dependency.
- Browser-automation visual capture was unavailable in this workspace, so page-level QA relied on authenticated route probes plus live API persistence checks.

### Assumptions

- The current Prisma dev bridge behavior is the intended local development dependency for this repo.
- Route 200s plus live API persistence are sufficient release evidence for this recovery slice in the absence of headed browser capture.

### Next Action (Concrete)

- First command/file: run `npm run dev` from a clean shell, sign in as Marco or Sofia, and perform one visual pass on `/planner`, `/planner/exams`, and `/planner/students`.
- Next owner: Product/QA handoff owner.

---

## Entry - DEV-ACCESS-LOCAL-001 Local Auth Bootstrap Recovery

- Date: 2026-03-16
- Task ID: DEV-ACCESS-LOCAL-001
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Added a browser-native local dev entry instead of relying on manual cookie jar flows.
- Standardized the local auth origin on `localhost` and preserved method-safe redirects for API calls.
- Reduced local setup confusion by documenting the Node/Next/Prisma flow explicitly and removing any implication that Python or `venv` is part of the normal path.

### What Was Done

- Added shared local dev bootstrap helpers and enabled `DEV_BOOTSTRAP_ENABLED` while preserving backward compatibility for `ENABLE_DEV_BOOTSTRAP`.
- Added a visible `Enter dev app` button on the homepage and login page that posts to `/api/auth/dev-bootstrap`, verifies `/api/auth/me`, and redirects to `/planner`.
- Hardened loopback canonicalization for `127.0.0.1` and `::1` in middleware and the pre-hydration layout script.
- Updated `.env.example`, `README.md`, and `scripts/start-local-dev.ps1` to document the supported local flow.
- Added core change spec:
  - `docs/specs/DEV-ACCESS-LOCAL-001.md`

### Evidence

- Lint: `npm run lint` passed after each stable slice and at final verification.
- Build: `npm run build` passed after each stable slice and at final verification.
- Tests: no dedicated automated test suite added in this slice.
- Manual checks:
  - verified dev-entry button render path in source on `/` and `/login`
  - verified local host canonicalization behavior with localhost/loopback probes
  - verified `/api/auth/dev-bootstrap` and `/api/auth/me` in browser-session flow during final validation

### Residual Risks

- Dev bootstrap still depends on the local database being reachable and migrated.
- Keeping the env flag enabled on a shared dev machine intentionally leaves a shortcut available until disabled.

### Assumptions

- `localhost:3000` remains the canonical local origin for this repo.
- Browser-session validation against the local dev server is sufficient evidence for this recovery slice.

### Next Action (Concrete)

- First command/file: run one authenticated browser pass through `/planner`, `/planner/exams`, and `/planner/subjects` using the dev-entry button.
- Next owner: QA/Release gate owner.

---

## Entry - CORE-PLANNER-RECOVERY-001 Immediate Freshness Recovery

- Date: 2026-03-17
- Task ID: CORE-PLANNER-RECOVERY-001
- Role: Planner + Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Kept slice 1 strictly on freshness/data-flow recovery with no schema or engine changes.
- Made planner cache student-scoped instead of one shared session snapshot.
- Used optimistic hook methods already present in the planner data hook instead of adding a second mutation path.

### What Was Done

- Added slice spec:
  - `docs/specs/CORE-PLANNER-RECOVERY-001.md`
- Reworked planner cache behavior:
  - `src/app/planner/_hooks/use-planner-data.ts`
  - cache is now keyed by student
  - session storage key is student-scoped
  - cache state resets safely on auth changes
- Enabled revision subscriptions and optimistic local commits on core planner surfaces:
  - `src/app/planner/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/subjects/page.tsx`
- Replaced create/edit/delete refresh-only flows with optimistic local commit + forced background sync.

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no dedicated automated test suite added in this slice.
- Manual checks: code-path review confirms immediate upsert/remove behavior and student-scoped cache separation.

### Residual Risks

- Brief optimistic divergence is still possible if a follow-up forced refresh fails after a successful mutation.
- Focus page still has its own cache path and is not part of this freshness slice.

### Assumptions

- Reviewer gate for slice 1 accepts lint/build plus deterministic code-path validation in this session.
- Freshness guarantees are required for planner, exams, and subjects first.

### Next Action (Concrete)

- First command/file: open `prisma/schema.prisma` and add `ExamPlanState` plus `ExamStudyLog` for slice 2.
- Next owner: Builder.

---

## Entry - ENGINE-UNIFICATION-001 Persistence + Unified Engine Base

- Date: 2026-03-17
- Task ID: ENGINE-UNIFICATION-001
- Role: Planner + Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Added dedicated persisted planner state instead of reusing client-only exam hints.
- Added persisted per-exam study logs instead of relying on local-only focus progress for future planner calibration.
- Kept the new planner output contract shared in `src/lib`, while the recommendation logic itself lives server-side in `src/server/services`.

### What Was Done

- Added slice spec:
  - `docs/specs/ENGINE-UNIFICATION-001.md`
- Added persistence models and migration:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260317165000_add_exam_plan_state_and_study_logs/migration.sql`
- Applied the migration SQL locally and regenerated Prisma client.
- Added shared planner output/input types:
  - `src/lib/exam-plan.ts`
- Added unified server recommendation engine:
  - `src/server/services/exam-plan-engine.ts`
- Updated architecture map with the new planner boundaries:
  - `docs/core/02-project-map.md`

### Evidence

- Lint: `npm run lint` passed after persistence and engine additions.
- Build: `npm run build` passed after persistence and engine additions.
- Tests: no dedicated engine test suite added in this slice.
- Manual checks:
  - migration SQL generated from current datasource to new schema
  - migration SQL executed successfully via `prisma db execute`
  - Prisma client regenerated successfully

### Residual Risks

- The new engine is not yet the live frontend source of truth until slice 3 switches planner pages to the new APIs.
- Existing migration history in the repo is modified, so future local schema evolution may still require explicit diff/execution instead of `prisma migrate dev`.

### Assumptions

- Local development database reset is not acceptable for this session, so explicit diff + execute is the safe path.
- Slice 2 acceptance in this session is engine readiness plus persisted boundaries, not final UI adoption.

### Next Action (Concrete)

- First command/file: add `/api/planner/overview`, `/api/exam-plans`, and `/api/exam-study-logs` on top of `src/server/services/exam-plan-engine.ts`.
- Next owner: Builder.

---

## Entry - PLANNER-UX-COACH-001 Exam-First Planner Surfaces

- Date: 2026-03-17
- Task ID: PLANNER-UX-COACH-001
- Role: Planner + Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Moved planner homepage to an exam-first coaching surface driven by the new overview API.
- Kept the weekly board in product as a secondary collapsible view.
- Moved focus logging to persisted study logs and simplified subjects into a context surface instead of a local hint editor.

### What Was Done

- Added slice spec:
  - `docs/specs/PLANNER-UX-COACH-001.md`
- Added planner APIs:
  - `src/app/api/planner/overview/route.ts`
  - `src/app/api/exam-plans/route.ts`
  - `src/app/api/exam-study-logs/route.ts`
- Added validation for planner preferences and study-log writes:
  - `src/server/validation/exam-plan.ts`
- Extended exam reads with plan-state data:
  - `src/app/api/exams/route.ts`
- Added overview client hook and updated planner surfaces:
  - `src/app/planner/_hooks/use-planner-overview.ts`
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/subjects/page.tsx`
  - `src/app/planner/_components/weekly-board-section.tsx`
  - `src/app/planner/exams/page.tsx`
- Rewrote top-level home/profile copy to be more student-facing:
  - `src/app/home-page-client.tsx`
  - `src/app/planner/students/page.tsx`

### Evidence

- Lint: `npm run lint` passed after API and UX changes.
- Build: `npm run build` passed after API and UX changes.
- Tests: no dedicated automated route or E2E suite added in this slice.
- Manual checks:
  - build output confirms `/api/planner/overview`, `/api/exam-plans`, and `/api/exam-study-logs`
  - focus page now posts persisted study logs instead of local-only progress
  - planner homepage renders from overview hook instead of client season engine

### Residual Risks

- Exams page still carries some detailed workload wording that can be softened further in a later copy-only pass.
- Home/profile copy is improved, but not every legacy planner string was rewritten in this slice.

### Assumptions

- Slice 3 is accepted when the main daily planner loop is API-driven and student-facing, even if some secondary wording remains.
- The new planner overview API remains the primary source for planner and focus surfaces going forward.

### Next Action (Concrete)

- First command/file: add Playwright, seeded student fixtures, and engine/API coverage for QA foundation.
- Next owner: Builder.

---

## Entry - QA-SIM-FOUNDATION-001 Deterministic QA Foundation

- Date: 2026-03-17
- Task ID: QA-SIM-FOUNDATION-001
- Role: Planner + Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Added deterministic seeded students instead of relying on ad-hoc manual QA data.
- Kept engine coverage in Vitest and daily-loop coverage in Playwright.
- Forced Playwright to boot a fresh production Next server with an explicit TCP database URL to avoid local Prisma bridge instability.

### What Was Done

- Added slice spec:
  - `docs/specs/QA-SIM-FOUNDATION-001.md`
- Added seeded simulation harness and local scripts:
  - `scripts/seed-simulation.js`
  - `package.json`
  - `package-lock.json`
- Added test configuration and coverage:
  - `playwright.config.ts`
  - `vitest.config.ts`
  - `tests/unit/exam-plan-engine.test.ts`
  - `tests/api/planner-overview.route.test.ts`
  - `tests/api/exam-plans.route.test.ts`
  - `qa/e2e/daily-loop.spec.ts`
- Added test-only runtime hardening for local auth/database boot:
  - `src/server/db/client.ts`
  - `src/server/auth/session.ts`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed as part of the E2E run.
- Tests:
  - `npm run seed:simulation` passed.
  - `npm run test:unit` passed.
  - `npm run test:e2e` passed.
- Manual checks:
  - verified the seeded balanced student can log in and reach the exam-first planner flow under Playwright

### Residual Risks

- E2E currently covers the balanced daily loop only; the other seeded students are available for follow-up scenarios but not yet asserted in browser automation.
- Local Playwright still depends on browser binaries and a reachable local Postgres bridge behind the seeded TCP URL.

### Assumptions

- Local QA acceptance for this slice is satisfied by deterministic seed + unit/API/E2E evidence.
- Test-only env flags (`PRISMA_FORCE_TCP_DATABASE_URL`, `ALLOW_INSECURE_AUTH_COOKIES`) are acceptable because they are opt-in and not enabled in normal app runtime.

### Next Action (Concrete)

- First command/file: add one follow-up Playwright scenario for persisted study logging on `/planner/focus`.
- Next owner: QA/Reliability.

---

## Entry - DEV-LOCALHOST-004 Localhost Startup Recovery

- Date: 2026-03-17
- Task ID: DEV-LOCALHOST-004
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Treated the localhost issue as a local dev-flow fix, not a product slice.
- Switched the direct dev bind to IPv6 loopback-compatible startup so `localhost` no longer depends on IPv4 fallback.
- Added proactive Turbopack cache reset to avoid repeated local startup failures on Windows.

### What Was Done

- Updated direct dev script:
  - `package.json`
- Updated the local startup script:
  - `scripts/start-local-dev.ps1`

### Evidence

- Lint: not required for script-only local runtime fix.
- Build: not required for script-only local runtime fix.
- Tests:
  - `Test-NetConnection localhost -Port 3000` confirmed a local listener was active during diagnosis.
- Manual checks:
  - diagnosed current server behavior as IPv4-only on `127.0.0.1:3000` while `localhost` attempted `::1`
  - confirmed recent dev-server traffic was reaching the app on port 3000

### Residual Risks

- The currently running dev process must be restarted to pick up the new bind/cache behavior.
- Existing stale local Node processes can still confuse port ownership until they are stopped.

### Assumptions

- Local development should prioritize `http://localhost:3000` as the canonical entrypoint.

### Next Action (Concrete)

- First command/file: stop the old dev process and run `npm run dev` again.
- Next owner: Local developer.

---

## Entry - PHASE-6-STUDENT-PRODUCTIZATION-001 Foundation

- Date: 2026-03-17
- Task ID: PHASE-6-STUDENT-PRODUCTIZATION-001
- Role: Planner + Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Generalized the product domain to study targets while keeping the technical persistence model on `Exam` for compatibility.
- Added rights-safe material discovery and persisted study materials as a first-class backend capability.
- Kept planning logic server-side by feeding linked materials into the existing exam plan engine instead of adding UI-side heuristics.

### What Was Done

- Added Phase 6 core spec:
  - `docs/specs/PHASE-6-STUDENT-PRODUCTIZATION-001.md`
- Extended schema/domain contracts for student context, target classification, and study materials:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260317191000_phase6_student_productization/migration.sql`
  - `src/lib/study-domain.ts`
  - `src/lib/exam-plan.ts`
- Added validation and API support for target updates and materials:
  - `src/server/validation/student.ts`
  - `src/server/validation/exam.ts`
  - `src/server/validation/material.ts`
  - `src/app/api/students/route.ts`
  - `src/app/api/exams/route.ts`
  - `src/app/api/materials/route.ts`
  - `src/app/api/materials/search/route.ts`
  - `src/app/api/materials/file/route.ts`
- Wired the planning engine and planner reads to the new target/material fields:
  - `src/server/services/exam-plan-engine.ts`
  - `src/server/services/material-discovery.ts`
  - `src/app/api/planner/overview/route.ts`
  - `src/app/api/exam-plans/route.ts`
  - `src/app/api/exam-study-logs/route.ts`
  - `src/app/planner/_hooks/use-planner-data.ts`
  - `src/app/planner/_hooks/use-auth-student.ts`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: no dedicated Phase 6 suites added in this foundation slice yet.
- Manual checks:
  - generated and executed local Prisma diff migration successfully
  - regenerated Prisma client successfully
  - confirmed new material and planner routes in production build output

### Residual Risks

- The main student-facing screens still need a fuller Phase 6 UI pass for target types, material management, and student-centric copy.
- File uploads are currently stored in the database for the local-first phase and should move to object storage before large-scale production rollout.

### Assumptions

- Backward-compatible route names (`/api/exams`) remain acceptable while the product language shifts to study targets.
- Rights-safe material discovery in this phase is intentionally limited to curated/open metadata plus user-supplied links/uploads.

### Next Action (Concrete)

- First command/file: update `src/app/planner/exams/page.tsx` to expose target types, status actions, and linked materials.
- Next owner: Builder.

---

## Entry - PHASE-6-STUDENT-PRODUCTIZATION-002 UX + PWA

- Date: 2026-03-17
- Task ID: PHASE-6-STUDENT-PRODUCTIZATION-002
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Kept the existing planner surfaces but upgraded them into target-oriented flows instead of rewriting navigation or routes.
- Moved material management into a dedicated planner component so search/link/upload logic stays isolated from the large targets page.
- Shipped PWA shell support now, while keeping store-native packaging out of scope.

### What Was Done

- Added target material manager UI with rights-safe search, user links, uploads, refresh, and removal:
  - `src/app/planner/_components/target-material-manager.tsx`
- Expanded target management UX:
  - `src/app/planner/exams/page.tsx`
  - create targets with type and importance
  - edit title/date/type/status/importance inline
  - quick postpone and complete actions
  - per-target materials panel
- Expanded planner/focus/profile UX:
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/students/page.tsx`
- Added PWA shell assets and install prompt wiring:
  - `src/app/layout.tsx`
  - `src/app/globals.css`
  - `src/app/_components/install-prompt.tsx`
  - `src/app/_hooks/use-install-prompt.ts`
  - `public/manifest.json`
  - `public/icons/pwa-icon.svg`
- Added Phase 6 tests:
  - `tests/unit/exam-plan-engine.test.ts`
  - `tests/api/materials-search.route.test.ts`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: `npm run test:unit` passed.
- Manual checks:
  - production build exposes the new materials routes and planner surfaces
  - manifest/install prompt files are present and linked from the root layout

### Residual Risks

- Planner and focus copy still mix some older exam-first wording with the new target-first behavior.
- No Phase 6 browser E2E scenario has been added yet for materials upload/search or target postpone/complete actions.

### Assumptions

- The current product can ship as web + PWA first while native-store packaging remains a later phase.
- User uploads staying in the database are acceptable for this limited rollout phase.

### Next Action (Concrete)

- First command/file: add a Playwright scenario covering target postpone plus rights-safe material linking.
- Next owner: QA/Reliability.

---

## Entry - PHASE-6C-VISUAL-RECOVERY-001 Runtime + Visual Recovery

- Date: 2026-03-17
- Task ID: PHASE-6C-VISUAL-RECOVERY-001
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Kept the Phase 6 domain and APIs intact; Phase 6C only hardens runtime behavior and improves visual hierarchy.
- Normalized technical error handling at the route/client boundary instead of letting raw Prisma or Turbopack details surface in the UI.
- Treated missing-session states as explicit recovery flows with CTAs instead of passive alerts.

### What Was Done

- Hardened local-dev/runtime safety:
  - `src/app/api/auth/dev-bootstrap/route.ts`
  - `src/server/http/response.ts`
  - `src/app/planner/_lib/client-api.ts`
  - `scripts/start-local-dev.ps1`
- Slimmed the app shell and install prompt:
  - `src/app/layout.tsx`
  - `src/app/_components/site-nav.tsx`
  - `src/app/_components/install-prompt.tsx`
  - `src/app/_hooks/use-install-prompt.ts`
  - `src/app/globals.css`
- Reworked planner hierarchy and empty states:
  - `src/app/planner/layout.tsx`
  - `src/app/planner/page.tsx`
  - `src/app/planner/focus/page.tsx`
  - `src/app/planner/subjects/page.tsx`
  - `src/app/planner/exams/page.tsx`
  - `src/app/planner/students/page.tsx`
- Cleaned residual legacy naming and supporting copy:
  - `src/app/home-page-client.tsx`
  - `src/app/_components/home-branding-card.tsx`
  - `src/config/branding.ts`
  - `src/app/planner/_lib/season-engine.ts`
  - `src/server/services/exam-plan-engine.ts`
  - `src/app/privacy/page.tsx`
- Added unit coverage for error sanitization:
  - `tests/unit/response.test.ts`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Unit tests: `npm run test:unit` passed.
- Manual checks:
  - planner shell now shows slim top navigation and contextual install prompt
  - planner/focus/subjects/targets return actionable no-session and empty states
  - local error sanitization no longer forwards raw technical details to the browser-facing client helper

### Residual Risks

- Some older planner internals still use `season-engine` as a code-level name even though student-facing copy is now planner-first.
- Phase 6C does not yet add the Playwright follow-up scenarios requested in the broader plan.

### Assumptions

- English-first shell copy is acceptable on a few support surfaces while the main planner pages continue to support EN/IT toggle behavior.
- Local schema/client mismatch fallback is intentionally narrow to developer environments and should not mask real production route failures.

### Next Action (Concrete)

- First command/file: add Playwright coverage for dev-bootstrap fallback, focus empty state, and target postpone/material flows.
- Next owner: QA/Reliability.

---

## Entry - PHASE-7-VISUAL-QA-001 Material + Visual QA Foundation

- Date: 2026-03-19
- Task ID: PHASE-7-VISUAL-QA-001
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Added a conservative material-link inspector that only accepts public http/https PDF and HTML links.
- Kept the visual QA flow artifact-driven and outside git, with explicit screenshot and demo manifests.
- Used seeded login as the default browser QA entrypoint.

### What Was Done

- Added safe material extraction foundation:
  - `src/server/services/material-link-inspector.ts`
- Added visual QA manifest, capture, and demo pipelines:
  - `qa/visual/manifest.ts`
  - `qa/visual/helpers.ts`
  - `qa/visual/capture.spec.ts`
  - `qa/visual/demo-record.spec.ts`
  - `playwright.shared.ts`
  - `playwright.visual.config.ts`
  - `playwright.demo.config.ts`
- Updated repo workflow docs:
  - `README.md`
  - `.gitignore`
  - `package.json`
- Added QA evidence/reporting:
  - `tests/unit/material-link-inspector.test.ts`
  - `qa/reports/PHASE-7-VISUAL-QA-001-qa-gate-2026-03-19.md`
- Repaired the planner focus page after a concurrent truncation issue so the build could pass again:
  - `src/app/planner/focus/page.tsx`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests: `npm run test:unit` passed.
- Manual checks:
  - `npm run test:visual` passed and wrote screenshots outside git
  - `npm run demo:record` passed and wrote demo artifacts outside git

### Residual Risks

- The material inspector is intentionally conservative and not yet wired into the live creation flow.
- Visual capture still depends on seeded login staying deterministic across future auth changes.

### Assumptions

- `qa/artifacts/` stays ignored and is the canonical local review output location.
- Seeded login remains the standard QA path while dev bootstrap is treated as secondary.

### Next Action (Concrete)

- First command/file: wire the material inspector into the material creation flow when the owning surface is ready.
- Next owner: Material/UX track.

---

## Entry - PHASE-7-PLANNER-COACH-001 Planner Coach + Study Today Refactor

- Date: 2026-03-19
- Task ID: PHASE-7-PLANNER-COACH-001
- Role: Builder + Reviewer
- Owner: Codex

### Decisions Taken

- Kept the planner server-driven and treated the new circular metrics as a presentation layer over existing planner payload values.
- Moved study outcome capture after the timer flow so `Studia oggi` behaves like a real focus session instead of a pre-session form.
- Refreshed planner overview on focus-progress revisions so study logging updates the planner without a manual reload.

### What Was Done

- Reworked planner overview into a student-coach summary:
  - `src/app/planner/page.tsx`
- Rebuilt `Studia oggi` around a dominant timer, review state, and materials-aware context:
  - `src/app/planner/focus/page.tsx`
- Refreshed planner data whenever focus progress emits a revision:
  - `src/app/planner/_hooks/use-planner-overview.ts`
- Added the circular metrics and timer styles used by planner/focus:
  - `src/app/globals.css`
- Added the governing slice spec:
  - `docs/specs/PHASE-7-PLANNER-COACH-001.md`

### Evidence

- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Tests:
  - `npm run test:unit` passed
  - `npm run test:visual` passed
  - `npm run demo:record` passed
- Manual checks:
  - planner overview now uses `Obiettivi / Piano di studio / Studia oggi`
  - focus logging updates planner overview through revision propagation
  - study pages/topic are requested only in the post-session review step

### Residual Risks

- The new circular metrics are presentation-only and still depend on the current planner payload quality.
- The focus timer still uses client-side timing and does not yet persist pause/resume state across reloads.

### Assumptions

- The hero metrics are intentionally limited to the planner summary and should not spread across every planner surface in this slice.
- Material context shown in planner/focus should reflect linked materials count and scope summary without adding new business logic to UI components.

### Next Action (Concrete)

- First command/file: continue with `PHASE-7-OBJECTIVES-001` to finish the objective setup flow and study rhythm UI.
- Next owner: Product/UI track.
