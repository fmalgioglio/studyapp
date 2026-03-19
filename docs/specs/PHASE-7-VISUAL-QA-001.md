# PHASE-7-VISUAL-QA-001

## 1. Task ID

- Task ID: PHASE-7-VISUAL-QA-001

## 2. Problem

- What is broken or missing:
  - StudyApp does not have a repeatable visual QA loop for the main routes.
  - Demo capture exists only as ad-hoc manual screenshots instead of reusable website-ready media artifacts.
  - Material link analysis lacks a safe inspection layer for public PDF/HTML links supplied by the student.
- Why it matters now:
  - Phase 7 requires a designer-like review loop and reusable media outputs while keeping material discovery compliant and conservative.

## 3. Scope

- In scope:
  - Add a conservative material link inspector for public PDF/HTML links.
  - Add a visual route manifest and Playwright capture pipeline for desktop/mobile screenshots.
  - Add a demo recording pipeline that produces local MP4 and GIF artifacts outside git.
  - Update repo scripts and README for seeded-login visual QA workflows.
- In scope constraints:
  - No crawling, scraping, or expansion to related pages.
  - Artifacts must be generated under `qa/artifacts/` and stay ignored by git.

## 4. Out of Scope

- Not in scope:
  - Wiring extracted material context into the live objective creation/edit flow.
  - Pixel-diff visual regression baselines.
  - CI publishing automation for the visual artifacts.

## 5. Files / Layers Affected

- Files/folders to touch:
  - `src/server/services/material-link-inspector.ts`
  - `qa/visual/*`
  - `playwright.shared.ts`
  - `playwright.visual.config.ts`
  - `playwright.demo.config.ts`
  - `README.md`
  - `package.json`
  - `.gitignore`
- Layers impacted (UI/API/Service/Auth/Validation/Data):
  - Service
  - QA/tooling
  - Docs

## 6. Acceptance Criteria

1. [ ] `npm run test:visual` captures the agreed route manifest for desktop and mobile and writes the images under `qa/artifacts/screenshots/`.
2. [ ] `npm run demo:record` writes a website-ready `MP4` and `GIF` under `qa/artifacts/demos/`.
3. [ ] `qa/artifacts/` remains ignored by git, while specs, reports, and logbook entries remain trackable.
4. [ ] The material-link inspector accepts only public `http/https` PDF/HTML links and blocks localhost/private-host inputs.
5. [ ] README documents the seeded login QA flow and the visual/demo scripts.

## 7. Risks

- Media encoding can fail if the local runtime lacks a usable ffmpeg binary.
- Visual capture can become flaky if the seeded login flow stops being deterministic.

## 8. Rollback Notes

- Rollback trigger:
  - Visual/demo scripts become unstable or block the standard build/test loop.
- Revert steps:
  - Revert the slice commit for `PHASE-7-VISUAL-QA-001`.
- Data impact notes:
  - No persistent product data contract changes in this slice.
