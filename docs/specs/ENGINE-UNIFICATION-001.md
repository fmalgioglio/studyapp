# ENGINE-UNIFICATION-001

## 1. Task ID

- Task ID: ENGINE-UNIFICATION-001

## 2. Problem

- What is broken or missing:
  - Planner recommendations are split between client heuristics and a separate server estimator.
  - Per-exam planning state is not persisted cross-device.
  - Study activity for planner calibration is stored only locally.
- Why it matters now:
  - The app cannot provide a reliable per-exam pace engine or consistent daily coaching.

## 3. Scope

- In scope:
  - Prisma persistence for exam plan state and per-exam study logs.
  - A unified server-side exam planning engine.
  - Shared planner output types for new planner APIs.

## 4. Out of Scope

- Not in scope:
  - Final planner page redesign.
  - Full replacement of every client page with API-driven rendering in this slice.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `src/lib/exam-plan.ts`
  - `src/server/services/exam-plan-engine.ts`
  - `docs/core/02-project-map.md`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - Service
  - Data
  - Shared domain

## 6. Acceptance Criteria

1. [ ] `ExamPlanState` and `ExamStudyLog` exist in schema and generated Prisma client.
2. [ ] The unified engine prefers canonical workload scope inputs before fallback inference.
3. [ ] The unified engine uses weekly hours, study logs, and subject affinity to generate per-exam recommendations and conservative fallback outputs.

## 7. Risks

- Schema migration can fail if local Prisma dev is not running.
- New engine outputs can diverge from the old client season view until slice 3 switches the frontend over.

## 8. Rollback Notes

- Rollback trigger:
  - Migration or generated client instability.
- Revert steps:
  - Revert schema, migration, shared type, and engine commits together.
- Data impact notes:
  - New empty tables can be safely dropped on rollback in local/dev environments.
