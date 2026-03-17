# 02 Project Map - Architecture Boundaries

## Purpose
Keep one concise map of code boundaries, data flow, and placement rules.
Use this file before changing architecture-sensitive areas.

## Current Architecture
- UI Layer: `src/app/*` pages and components
- API Layer: `src/app/api/*/route.ts`
- Domain / Service Layer:
  - `src/server/services/*`
  - `src/server/auth/*`
  - `src/server/validation/*`
- Shared Domain Core:
  - `src/lib/workload-estimation-core.ts`
  - `src/lib/exam-plan.ts`
  - `src/lib/study-domain.ts`
- Data Layer:
  - Prisma client in `src/server/db/client.ts`
  - Schema in `prisma/schema.prisma`

## Workload Estimation Direction
- Canonical exam workload stays the source of truth for planning scope/pace inputs.
- Shared estimator core resolves workload priors and explainability first:
  - `src/lib/workload-estimation-core.ts`
- Planning consumers must use shared core outputs before local heuristics:
  - `src/server/services/planning-estimator.ts`
  - `src/app/planner/_lib/season-engine.ts`
- Unified exam planning direction:
  - server-side recommendation source of truth: `src/server/services/exam-plan-engine.ts`
  - persisted planning state: `ExamPlanState`
  - persisted study activity: `ExamStudyLog`
- Study target generalization direction:
  - technical persistence remains on `Exam`
  - product language may present `Exam` records as study targets (`EXAM`, `TEST`, `ORAL`, `SELF_STUDY`)
  - target type/status/importance rules stay server-side and flow through shared planner contracts
- Safe material discovery direction:
  - rights-safe discovery and classification live in `src/server/services/material-discovery.ts`
  - persisted user-linked materials live in `StudyMaterial`
  - external materials are linked/classified, not re-hosted unless they are explicit user uploads
- Canonical optional signals support non-book and approximate material without fake precision:
  - `materialShape` (`mini_handout`, `handout_set`, `slides`, `personal_notes`, `mixed`, `offline_approximate`)
  - `approximateScopeValue`
  - `approximateScopeUnit`
  - `isApproximate`
- Signal contract and normalization boundary:
  - `src/lib/exam-workload-contract.ts`
  - `src/server/validation/exam-workload-normalization.ts`
  - `src/server/validation/exam.ts`
  - `src/server/validation/planning.ts`

## Data Flow
1. User action starts in the UI layer
2. API route receives and validates input
3. Auth/session guard applies where required
4. Service or domain logic executes
5. Prisma reads or writes database state
6. API returns a stable success or error payload
7. UI updates visible state
8. For planning/exam workload flows: canonical signals -> shared workload core -> consumer fallback only when canonical evidence is missing/incomplete

## Sensitive Modules
- `src/server/auth/*`
- `src/server/db/client.ts`
- `src/server/services/planning-estimator.ts`
- `src/server/services/exam-plan-engine.ts`
- `src/lib/workload-estimation-core.ts`
- `src/server/validation/exam-workload-normalization.ts`
- `src/app/api/planning/estimate/route.ts`
- `prisma/schema.prisma`

## Placement Rules
- New business rule -> `src/server/services/*`, not UI components
- New API validation -> `src/server/validation/*`
- New auth constraint -> `src/server/auth/*` and enforce in route handlers
- New persistence rule -> update Prisma schema, migration flow, and generated client together
- New UI state or display logic -> keep in UI unless it changes business behavior
- New workload scope/pace inference rule -> `src/lib/workload-estimation-core.ts` first, then consume from planner services
- New canonical exam workload signal -> update contract + normalization + exam/planning validation in same task
- Planner fallback behavior must stay explicit and conservative when canonical signals are absent or weak
- New persisted planning preference or recommendation snapshot -> `ExamPlanState`, not UI-only local storage
- New persisted study progress that changes planner recommendations -> `ExamStudyLog`, not UI-only local storage
- New study target classification or profile context -> Prisma schema + `src/lib/study-domain.ts` + server validation in the same task
- New material discovery behavior -> `src/server/services/material-discovery.ts`
- New persisted material/link/upload metadata -> `StudyMaterial`, not ad-hoc JSON fields on `Exam`
- PWA shell/install behavior -> `public/*`, `src/app/layout.tsx`, and lightweight client hooks/components only; never embed study business logic there

## Boundary Update Rule
If architecture boundaries change, update this file in the same work session.

## Must
- Keep this map aligned with the real code layout
- State the exact destination path for new logic
- Keep boundary-sensitive modules explicit

## Must Not
- Put business rules in the UI layer
- Create new top-level folders without clear boundary rationale
- Mix domain logic into route handlers when it belongs in services
