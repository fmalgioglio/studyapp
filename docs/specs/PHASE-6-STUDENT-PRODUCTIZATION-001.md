# PHASE-6-STUDENT-PRODUCTIZATION-001

## 1. Task ID

- Task ID: `PHASE-6-STUDENT-PRODUCTIZATION-001`

## 2. Problem

- What is broken or missing:
  - The product still behaves mostly like an exam planner for university-style usage.
  - Students cannot yet manage study targets with full lifecycle actions or attach rights-safe materials in a first-class way.
  - The app is not yet prepared as a clean student product for web/PWA deployment.
- Why it matters now:
  - The next pilot needs to support high-school use cases, broader student profiles, and differentiated workflows for tests, oral assessments, exams, and self-study.

## 3. Scope

- In scope:
  - Expand study target domain, statuses, and student profile metadata.
  - Add a dedicated study-material persistence model and safe discovery APIs.
  - Extend planner engine and APIs to use target type/status and linked materials.
  - Ship student-facing target/material flows in planner surfaces.
  - Add minimal PWA shell basics.

## 4. Out of Scope

- Not in scope:
  - Native mobile shell or app-store packaging.
  - Broad web scraping of unofficial material sources.
  - Social/community features.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `prisma/schema.prisma`
  - `src/lib/*`
  - `src/server/services/*`
  - `src/server/validation/*`
  - `src/app/api/*`
  - `src/app/planner/*`
  - PWA shell files under `src/app/*`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - UI
  - API
  - Service
  - Validation
  - Data

## 6. Acceptance Criteria

1. [ ] Students can create and update study targets with type, status, importance, date, and target grade.
2. [ ] Planner recommendations change based on target type/status and can use linked material scope when workload payload is incomplete.
3. [ ] Students can save rights-safe discovered materials and personal links/files against a subject or target.
4. [ ] User-facing errors for planner/material mutations stay non-technical.
5. [ ] The web app exposes a minimal installable PWA shell without changing the full-stack backend architecture.

## 7. Risks

- The scope mixes schema, planner logic, and UX, so slice boundaries must stay explicit.
- File upload support must remain compatible with server-side hosting constraints.
- Broadening domain language can introduce regression if old exam-only assumptions remain in UI code.

## 8. Rollback Notes

- Rollback trigger:
  - Planner recommendations regress or target/material mutations become unstable.
- Revert steps:
  - Revert the Phase 6 commits in reverse slice order.
- Data impact notes:
  - New enums and material records will remain in DB after rollback unless a dedicated cleanup migration is applied.
